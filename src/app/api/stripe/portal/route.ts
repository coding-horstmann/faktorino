import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/ssr'
import { stripe } from '@/lib/stripe'
import type { Database } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe-Konfiguration fehlt: STRIPE_SECRET_KEY' }, { status: 500 })
    }
    const { origin } = new URL(request.url)
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStore },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (error || !profile || !profile.stripe_customer_id) {
      return NextResponse.json({ error: 'Kein Stripe-Konto verknüpft' }, { status: 400 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/account-settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('Portal error', error)
    return NextResponse.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}


