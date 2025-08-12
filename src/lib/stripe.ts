import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey || stripeSecretKey === 'sk_test_xxx') {
  // Intentionally do not throw to allow local builds without Stripe
  console.warn('Stripe: STRIPE_SECRET_KEY ist nicht gesetzt. API-Routen benötigen diese Variable.')
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_xxx', {
  apiVersion: '2024-06-20',
})


