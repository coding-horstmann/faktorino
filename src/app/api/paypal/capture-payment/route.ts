import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
    const body = await request.json();
    const { orderID, payerID } = body;

    if (!orderID) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: orderID' },
        { status: 400 }
      );
    }

    // Supabase Client erstellen
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
              // Ignore errors in server components
            }
          },
        },
      }
    );

    // Benutzer-Authentifizierung prüfen
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Purchase Record finden
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('paypal_order_id', orderID)
      .eq('payment_status', 'pending')
      .eq('user_id', user.id)
      .single();

    if (purchaseError || !purchaseData) {
      console.error('Purchase not found:', purchaseError);
      return NextResponse.json(
        { error: 'Kauf nicht gefunden oder bereits verarbeitet' },
        { status: 404 }
      );
    }

    // PayPal Access Token abrufen
    const accessToken = await getPayPalAccessToken();

    // PayPal Payment capture
    const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error('PayPal Capture Error:', errorText);
      
      // Purchase als failed markieren
      await supabase
        .from('credit_purchases')
        .update({
          payment_status: 'failed',
          paypal_transaction_id: 'capture_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseData.id);

      return NextResponse.json(
        { error: 'Fehler beim Erfassen der Zahlung' },
        { status: 500 }
      );
    }

    const captureData = await captureResponse.json();
    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    // Purchase Record aktualisieren
    const { error: updateError } = await supabase
      .from('credit_purchases')
      .update({
        payment_status: 'completed',
        paypal_transaction_id: transactionId,
        paypal_payer_id: payerID,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseData.id);

    if (updateError) {
      console.error('Failed to update purchase record:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren des Kaufdatensatzes' },
        { status: 500 }
      );
    }

    // Credits zum User-Account hinzufügen
    const { error: creditError } = await supabase.rpc('add_credits', {
      p_user_id: purchaseData.user_id,
      p_credits_to_add: purchaseData.credits_purchased,
      p_description: `PayPal-Kauf: ${purchaseData.credits_purchased} Credits`,
      p_purchase_id: purchaseData.id,
    });

    if (creditError) {
      console.error('Failed to add credits:', creditError);
      return NextResponse.json(
        { error: 'Credits konnten nicht gutgeschrieben werden' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId,
      credits: purchaseData.credits_purchased,
      amount: purchaseData.price_paid,
    });

  } catch (error) {
    console.error('Capture Payment Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token'); // PayPal Order ID
    const payerID = searchParams.get('PayerID');

    if (!token) {
      redirect('/dashboard?payment=error&message=missing_token');
    }

    // Supabase Client erstellen
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
              // Ignore errors in server components
            }
          },
        },
      }
    );

    // Purchase Record finden
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('paypal_order_id', token)
      .eq('payment_status', 'pending')
      .single();

    if (purchaseError || !purchaseData) {
      console.error('Purchase not found:', purchaseError);
      redirect('/dashboard?payment=error&message=purchase_not_found');
    }

    // PayPal Access Token abrufen
    const accessToken = await getPayPalAccessToken();

    // PayPal Order Details abrufen
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${token}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!orderResponse.ok) {
      console.error('Failed to get order details');
      redirect('/dashboard?payment=error&message=order_details_failed');
    }

    const orderDetails = await orderResponse.json();

    // PayPal Payment capture
    const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error('PayPal Capture Error:', errorText);
      
      // Purchase als failed markieren
      await supabase
        .from('credit_purchases')
        .update({
          payment_status: 'failed',
          paypal_transaction_id: 'capture_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseData.id);

      redirect('/dashboard?payment=error&message=capture_failed');
    }

    const captureData = await captureResponse.json();
    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    // Purchase Record aktualisieren
    const { error: updateError } = await supabase
      .from('credit_purchases')
      .update({
        payment_status: 'completed',
        paypal_transaction_id: transactionId,
        paypal_payer_id: payerID,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseData.id);

    if (updateError) {
      console.error('Failed to update purchase record:', updateError);
      redirect('/dashboard?payment=error&message=database_update_failed');
    }

    // Credits zum User-Account hinzufügen
    const { error: creditError } = await supabase.rpc('add_credits', {
      p_user_id: purchaseData.user_id,
      p_credits_to_add: purchaseData.credits_purchased,
      p_description: `PayPal-Kauf: ${purchaseData.credits_purchased} Credits`,
      p_purchase_id: purchaseData.id,
    });

    if (creditError) {
      console.error('Failed to add credits:', creditError);
      // Purchase als completed lassen, aber Fehler protokollieren
      // In einem produktiven System sollte hier ein Alert/Notification system greifen
    }

    // Erfolgreiche Weiterleitung
    redirect(`/dashboard?payment=success&credits=${purchaseData.credits_purchased}&amount=${purchaseData.price_paid}`);

  } catch (error) {
    console.error('Capture Payment Error:', error);
    redirect('/dashboard?payment=error&message=unexpected_error');
  }
}
