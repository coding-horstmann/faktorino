import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface AddCreditsRequest {
  packageId: string;
  credits: number;
  price: number;
  paypalOrderId: string;
  transactionId: string;
  payerId?: string;
  paymentDetails?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: AddCreditsRequest = await request.json();
    const { packageId, credits, price, paypalOrderId, transactionId, payerId, paymentDetails } = body;

    console.log('Add Credits Request:', { packageId, credits, price, paypalOrderId, transactionId });

    // Validierung der Eingabedaten
    if (!packageId || !credits || !price || !paypalOrderId || !transactionId) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: packageId, credits, price, paypalOrderId oder transactionId' },
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
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Credit-Paket validieren
    const { data: packageData, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !packageData) {
      console.error('Package validation error:', packageError);
      return NextResponse.json(
        { error: 'Ungültiges Credit-Paket' },
        { status: 400 }
      );
    }

    // Preis- und Credit-Validierung
    if (packageData.credits !== credits || packageData.price_euros !== price) {
      console.error('Price validation failed:', {
        expected: { credits: packageData.credits, price: packageData.price_euros },
        received: { credits, price }
      });
      return NextResponse.json(
        { error: 'Preis-Validierung fehlgeschlagen' },
        { status: 400 }
      );
    }

    // Prüfen ob diese Transaktion bereits verarbeitet wurde
    const { data: existingPurchase, error: existingError } = await supabase
      .from('credit_purchases')
      .select('id')
      .eq('paypal_order_id', paypalOrderId)
      .eq('payment_status', 'completed')
      .single();

    if (existingPurchase) {
      console.log('Transaction already processed:', paypalOrderId);
      return NextResponse.json(
        { error: 'Diese Transaktion wurde bereits verarbeitet' },
        { status: 409 }
      );
    }

    // Purchase Record in Datenbank erstellen
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        package_id: packageId,
        credits_purchased: credits,
        price_paid: price,
        payment_status: 'completed',
        paypal_order_id: paypalOrderId,
        paypal_transaction_id: transactionId,
        paypal_payer_id: payerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Purchase record creation error:', purchaseError);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Kaufdatensatzes' },
        { status: 500 }
      );
    }

    console.log('Purchase record created:', purchaseData.id);

    // Credits zum User-Account hinzufügen
    const { error: creditError } = await supabase.rpc('add_credits', {
      p_user_id: user.id,
      p_credits_to_add: credits,
      p_description: `PayPal-Kauf: ${credits} Credits (${packageData.name})`,
      p_purchase_id: purchaseData.id,
    });

    if (creditError) {
      console.error('Failed to add credits:', creditError);
      
      // Purchase als failed markieren
      await supabase
        .from('credit_purchases')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseData.id);

      return NextResponse.json(
        { error: 'Credits konnten nicht gutgeschrieben werden' },
        { status: 500 }
      );
    }

    console.log('Credits successfully added to user account');

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      purchaseId: purchaseData.id,
      transactionId,
      credits,
      amount: price,
      message: `${credits} Credits erfolgreich hinzugefügt`,
    });

  } catch (error) {
    console.error('Add Credits Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Hinzufügen der Credits' },
      { status: 500 }
    );
  }
}
