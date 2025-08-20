import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface PayPalCaptureRequest {
  orderID: string;
  payerID: string;
  purchaseId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PayPalCaptureRequest = await request.json();
    const { orderID, payerID, purchaseId } = body;

    if (!orderID || !purchaseId) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: orderID oder purchaseId' },
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

    // Purchase Record finden und validieren
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .eq('payment_status', 'pending')
      .single();

    if (purchaseError || !purchaseData) {
      console.error('Purchase not found:', purchaseError);
      return NextResponse.json(
        { error: 'Kauf nicht gefunden oder bereits verarbeitet' },
        { status: 404 }
      );
    }

    // Purchase Record aktualisieren
    const { error: updateError } = await supabase
      .from('credit_purchases')
      .update({
        payment_status: 'completed',
        paypal_order_id: orderID,
        paypal_payer_id: payerID,
        completed_at: new Date().toISOString()
      })
      .eq('id', purchaseId);

    if (updateError) {
      console.error('Error updating purchase:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren des Kaufs' },
        { status: 500 }
      );
    }

    // Credits hinzufügen
    const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
      user_id: user.id,
      credits_to_add: purchaseData.credits_purchased,
      transaction_type: 'purchase',
      transaction_reference: `paypal_${orderID}`
    });

    if (creditError) {
      console.error('Error adding credits:', creditError);
      return NextResponse.json(
        { error: 'Fehler beim Hinzufügen der Credits' },
        { status: 500 }
      );
    }

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      creditsAdded: purchaseData.credits_purchased,
      newBalance: creditResult,
      message: 'Payment captured and credits added successfully'
    });

  } catch (error) {
    console.error('Error in capture-payment:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const PayerID = searchParams.get('PayerID');

  if (!token || !PayerID) {
    return redirect('/dashboard?payment=error&message=missing_parameters');
  }

  // Für GET-Requests (PayPal-Redirects) einfach zur Dashboard weiterleiten
  // Die eigentliche Verarbeitung erfolgt über POST vom Frontend
  return redirect(`/dashboard?payment=success&orderID=${token}&payerID=${PayerID}`);
}
