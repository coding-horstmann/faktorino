import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { origin } = new URL(request.url)
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Load user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 })
    }

    // Ensure Stripe customer exists
    let stripeCustomerId = profile.stripe_customer_id as string | null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        metadata: { supabaseUserId: profile.id },
      })
      stripeCustomerId = customer.id
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', profile.id)
    }

    // Create a setup session to collect a payment method without starting a subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      success_url: `${origin}/auth/callback?setup=done`,
      cancel_url: `${origin}/account-settings?setup=cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Setup session error', error)
    return NextResponse.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}


