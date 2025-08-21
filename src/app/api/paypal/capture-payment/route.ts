import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { EmailService } from '@/lib/email-service';
import { UserService } from '@/lib/user-service';
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
      p_user_id: user.id,
      p_credits_to_add: purchaseData.credits_purchased,
      p_description: `PayPal Purchase ${orderID}`,
      p_purchase_id: purchaseId
    });

    if (creditError) {
      console.error('Error adding credits:', creditError);
      return NextResponse.json(
        { error: 'Fehler beim Hinzufügen der Credits' },
        { status: 500 }
      );
    }

    // E-Mail-Bestätigung senden
    try {
      const emailResult = await EmailService.sendCreditPurchaseConfirmation({
        to: {
          email: user.email!,
          name: user.user_metadata?.full_name || user.email!
        },
        templateData: {
          userName: user.user_metadata?.full_name || user.email!,
          creditsAdded: purchaseData.credits_purchased,
          newBalance: creditResult,
          purchaseAmount: `€${purchaseData.price_paid.toFixed(2)}`,
          transactionId: orderID,
          date: new Date().toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      });

      if (!emailResult.success) {
        console.error('Fehler beim Senden der Bestätigungs-E-Mail:', emailResult.error);
        // E-Mail-Fehler soll den Kaufprozess nicht unterbrechen
      } else {
        console.log('Bestätigungs-E-Mail erfolgreich gesendet an:', user.email);
      }
    } catch (emailError) {
      console.error('Unerwarteter Fehler beim E-Mail-Versand:', emailError);
      // E-Mail-Fehler soll den Kaufprozess nicht unterbrechen
    }

    // Admin-Benachrichtigung senden
    try {
      // UserInfo-Daten abrufen
      const userProfile = await UserService.getUserProfile(user.id);
      
      // Admin-Benachrichtigung immer senden, auch ohne UserInfo-Daten
      const adminNotificationResult = await EmailService.sendAdminNotification({
        userEmail: user.email!,
        userName: user.user_metadata?.full_name || user.email!,
        userBillingData: userProfile ? {
          company: userProfile.name,
          firstName: userProfile.name?.split(' ')[0] || '',
          lastName: userProfile.name?.split(' ').slice(1).join(' ') || '',
          address: userProfile.address,
          city: userProfile.city,
          postalCode: userProfile.city?.match(/\d{5}/)?.[0] || '',
          country: 'Deutschland', // Standard für deutsche Nutzer
          vatNumber: userProfile.vat_id || userProfile.tax_number || ''
        } : {
          // Leere Rechnungsdaten wenn keine UserInfo vorhanden
          company: '',
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          postalCode: '',
          country: '',
          vatNumber: ''
        },
        purchaseData: {
          creditsAdded: purchaseData.credits_purchased,
          purchaseAmount: `€${purchaseData.price_paid.toFixed(2)}`,
          transactionId: orderID,
          date: new Date().toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      });

      if (!adminNotificationResult.success) {
        console.error('Fehler beim Senden der Admin-Benachrichtigung:', adminNotificationResult.error);
        // Admin-Benachrichtigung-Fehler soll den Kaufprozess nicht unterbrechen
      } else {
        console.log('Admin-Benachrichtigung erfolgreich gesendet an: kontakt@faktorino.de');
      }
    } catch (adminEmailError) {
      console.error('Unerwarteter Fehler beim Admin-E-Mail-Versand:', adminEmailError);
      // Admin-E-Mail-Fehler soll den Kaufprozess nicht unterbrechen
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
