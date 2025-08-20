import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface PayPalOrderRequest {
  packageId: string;
  credits: number;
  price: number;
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

    // Preis validieren
    if (packageData.price_euros !== price) {
      return NextResponse.json(
        { error: 'Preis stimmt nicht überein' },
        { status: 400 }
      );
    }

    // Purchase Record erstellen
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        package_id: packageId,
        credits_purchased: credits,
        price_paid: price,
        payment_status: 'pending',
        payment_method: 'paypal'
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Kauf-Records' },
        { status: 500 }
      );
    }

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      purchaseId: purchaseData.id,
      message: 'Purchase record created successfully'
    });

  } catch (error) {
    console.error('Error in create-order:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
