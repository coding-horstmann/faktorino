import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface PayPalOrderRequest {
  packageId: string;
  credits: number;
  price: number;
  billingData: {
    firstName: string;
    lastName: string;
    email: string;
    street: string;
    postalCode: string;
    city: string;
    vatId: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('create-order: Starting request processing');
    
    const body: PayPalOrderRequest = await request.json();
    const { packageId, credits, price, billingData } = body;

    console.log('create-order: Request body:', { packageId, credits, price });

    // Validierung
    if (!packageId || !credits || !price) {
      console.log('create-order: Validation failed - missing parameters');
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

    console.log('create-order: Checking user authentication');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('create-order: Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    console.log('create-order: User authenticated:', user.id);

    // Credit-Paket validieren
    console.log('create-order: Validating credit package:', packageId);
    const { data: packageData, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !packageData) {
      console.log('create-order: Package validation failed:', packageError);
      return NextResponse.json(
        { error: 'Ungültiges Credit-Paket' },
        { status: 400 }
      );
    }

    console.log('create-order: Package validated:', packageData);

    // Preis validieren
    if (packageData.price_euros !== price) {
      console.log('create-order: Price validation failed:', { expected: packageData.price_euros, received: price });
      return NextResponse.json(
        { error: 'Preis stimmt nicht überein' },
        { status: 400 }
      );
    }

    // Purchase Record erstellen
    console.log('create-order: Creating purchase record');
    const purchaseData = {
      user_id: user.id,
      package_id: packageId,
      credits_purchased: credits,
      price_paid: price,
      payment_status: 'pending',
      billing_first_name: billingData.firstName,
      billing_last_name: billingData.lastName,
      billing_email: billingData.email,
      billing_street: billingData.street,
      billing_postal_code: billingData.postalCode,
      billing_city: billingData.city,
      billing_vat_id: billingData.vatId
    };

    console.log('create-order: Purchase data to insert:', purchaseData);

    const { data: insertedPurchase, error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert(purchaseData)
      .select()
      .single();

    if (purchaseError) {
      console.error('create-order: Error creating purchase record:', purchaseError);
      console.error('create-order: Error details:', {
        code: purchaseError.code,
        message: purchaseError.message,
        details: purchaseError.details,
        hint: purchaseError.hint
      });
      return NextResponse.json(
        { error: `Fehler beim Erstellen des Kauf-Records: ${purchaseError.message}` },
        { status: 500 }
      );
    }

    console.log('create-order: Purchase record created successfully:', insertedPurchase);

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      purchaseId: insertedPurchase.id,
      message: 'Purchase record created successfully'
    });

  } catch (error) {
    console.error('create-order: Unexpected error:', error);
    return NextResponse.json(
      { error: `Interner Server-Fehler: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
