import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { stripe } from '@/lib/stripe'

// Force Node.js runtime to use Stripe Node SDK reliably on Vercel/Next
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Fail fast if Stripe env is not configured correctly
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe-Konfiguration fehlt: STRIPE_SECRET_KEY' }, { status: 500 })
    }
    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: 'Stripe-Konfiguration fehlt: STRIPE_PRICE_ID' }, { status: 500 })
    }
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
      .select('id, email, stripe_customer_id, trial_end')
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

    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      return NextResponse.json({ error: 'STRIPE_PRICE_ID fehlt' }, { status: 500 })
    }

    // If user is still in app-level trial, forward remaining trial to Stripe so the user is charged only after the trial
    let subscriptionData: Record<string, unknown> | undefined
    if (profile.trial_end) {
      const trialEndTimestamp = Math.floor(new Date(profile.trial_end as string).getTime() / 1000)
      const now = Math.floor(Date.now() / 1000)
      if (trialEndTimestamp > now) {
        subscriptionData = {
          trial_end: trialEndTimestamp,
          trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        { price: priceId, quantity: 1 },
      ],
      success_url: `${origin}/account-settings?checkout=success`,
      cancel_url: `${origin}/account-settings?checkout=cancel`,
      allow_promotion_codes: true,
      subscription_data: subscriptionData,
      metadata: { supabaseUserId: profile.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error', error)
    return NextResponse.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}


