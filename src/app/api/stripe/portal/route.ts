import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
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
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
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

    // Optional vordefinierte Portal-Konfiguration nutzen oder on-the-fly erzeugen
    let configurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID
    if (!configurationId) {
      try {
        const cfg = await stripe.billingPortal.configurations.create({
          business_profile: { headline: 'EtsyBuchhalter' },
          default_return_url: `${origin}/account-settings?portal=return`,
          features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true },
            subscription_update: { enabled: true },
          },
        })
        configurationId = cfg.id
      } catch (cfgErr) {
        // continue without configuration; Stripe may still accept if default exists
        console.warn('Could not create Stripe portal configuration automatically:', cfgErr)
      }
    }

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${origin}/account-settings?portal=return`,
        ...(configurationId ? { configuration: configurationId } as any : {}),
      })
      return NextResponse.json({ url: portalSession.url })
    } catch (err: any) {
      const msg = String(err?.message || '')
      // Falls keine Default-Konfiguration im Testmodus vorhanden ist, versuchen wir sie zu erzeugen und erneut zu starten
      if (msg.includes('No configuration provided') && msg.includes('test mode default configuration has not been created')) {
        try {
          const cfg = await stripe.billingPortal.configurations.create({
            business_profile: { headline: 'EtsyBuchhalter' },
            default_return_url: `${origin}/account-settings?portal=return`,
            features: {
              invoice_history: { enabled: true },
              payment_method_update: { enabled: true },
              subscription_cancel: { enabled: true },
              subscription_update: { enabled: true },
            },
          })
          const retry = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${origin}/account-settings?portal=return`,
            configuration: cfg.id,
          })
          return NextResponse.json({ url: retry.url })
        } catch (cfgErr: any) {
          console.error('Auto-setup of Stripe portal failed', cfgErr)
          return NextResponse.json({ error: 'Stripe Kundenportal ist im Testmodus nicht konfiguriert. Öffnen Sie in Stripe „Billing > Kundenportal“ und klicken Sie auf „Änderungen speichern“.' }, { status: 500 })
        }
      }
      throw err
    }
  } catch (error: any) {
    console.error('Portal error', error)
    return NextResponse.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}


