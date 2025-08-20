import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Flexiblere PayPal-Umgebungskonfiguration
const getPayPalBaseUrl = () => {
  // Neue Umgebungsvariable hat Vorrang
  if (process.env.PAYPAL_ENVIRONMENT === 'live') {
    return 'https://api-m.paypal.com';
  }
  if (process.env.PAYPAL_ENVIRONMENT === 'sandbox') {
    return 'https://api-m.sandbox.paypal.com';
  }
  
  // Fallback auf NODE_ENV-basierte Logik
  return process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
};

const PAYPAL_BASE_URL = getPayPalBaseUrl();

interface PayPalOrderRequest {
  packageId: string;
  credits: number;
  price: number;
}

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const body: PayPalOrderRequest = await request.json();
    const { packageId, credits, price } = body;

    // Validierung
    if (!packageId || !credits || !price) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: packageId, credits oder price' },
        { status: 400 }
      );
    }

    // Benutzer-Authentifizierung prüfen
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Credit-Paket validieren
    const { data: packageData, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Ungültiges Credit-Paket' },
        { status: 400 }
      );
    }

    // Preis-Validierung
    if (packageData.credits !== credits || packageData.price_euros !== price) {
      return NextResponse.json(
        { error: 'Preis-Validierung fehlgeschlagen' },
        { status: 400 }
      );
    }

    // PayPal Access Token abrufen
    const accessToken = await getPayPalAccessToken();

    // PayPal Order erstellen
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'EUR',
            value: price.toFixed(2),
          },
          description: `${credits} Credits - ${packageData.name}`,
          custom_id: `${user.id}:${packageId}`,
        },
      ],
      application_context: {
        brand_name: 'EtsyBuchhalter',
        locale: 'de-DE',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/paypal/capture-payment`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?payment=cancelled`,
      },
    };

    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('PayPal Order Creation Error:', errorText);
      throw new Error('Failed to create PayPal order');
    }

    const order = await orderResponse.json();

    // Purchase Record in Datenbank erstellen
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        package_id: packageId,
        credits_purchased: credits,
        price_paid: price,
        payment_status: 'pending',
        paypal_order_id: order.id,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Database Error:', purchaseError);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Kaufdatensatzes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderID: order.id,
      purchaseId: purchaseData.id,
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
