import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'

// Stripe Webhooks require the raw body; ensure Node.js runtime
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const hdrs = await headers()
  const sig = hdrs.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook-Secret fehlt' }, { status: 500 })
  }

  const rawBody = await request.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        // Nothing special here; subscription events will handle status updates
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string
        const status = subscription.status as string
        const currentPeriodEnd = subscription.current_period_end
        const cancelAtPeriodEnd = subscription.cancel_at_period_end as boolean

        // Find user by customer id via Stripe API metadata if needed; we store on our users table
        // Use Supabase service role REST call to update (avoid importing server client here)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
          console.warn('Supabase Service Role oder URL fehlt für Webhook-Update')
          break
        }

        // Look up user by stripe_customer_id
        const profileRes = await fetch(`${supabaseUrl}/rest/v1/users?select=id&stripe_customer_id=eq.${customerId}`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        })
        const profiles = await profileRes.json()
        const profile = Array.isArray(profiles) ? profiles[0] : null
        if (!profile?.id) break

        await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${profile.id}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            stripe_subscription_id: subscription.id,
            subscription_status: status,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
            cancel_at_period_end: cancelAtPeriodEnd,
          }),
        })
        break
      }
      default:
        // Ignore others
        break
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error', error)
    return NextResponse.json({ error: 'Handler Fehler' }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}


