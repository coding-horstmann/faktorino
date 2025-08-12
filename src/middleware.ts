import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // If Supabase credentials are not set, redirect to login
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://demo.supabase.co') {
    // Allow public paths even without Supabase config
    const publicPaths = ['/login', '/register', '/agb', '/datenschutz', '/impressum', '/kontakt', '/']
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (!isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, ensure they exist in our users table.
  if (user) {
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        // Attempt to create a minimal profile server-side to avoid redirect loops
        const trialEndIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        const insertRes = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            name: '',
            address: '',
            city: '',
            tax_status: 'regular',
            subscription_status: 'trialing',
            trial_end: trialEndIso,
          })
          .select('id')
          .single()

        // If RLS prevents insert, fall back to service role REST call
        if (!insertRes.data) {
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceRoleKey) {
            try {
              const resp = await fetch(`${supabaseUrl}/rest/v1/users`, {
                method: 'POST',
                headers: {
                  apikey: serviceRoleKey,
                  Authorization: `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                  id: user.id,
                  email: user.email || '',
                  name: '',
                  address: '',
                  city: '',
                  tax_status: 'regular',
                  subscription_status: 'trialing',
                  trial_end: trialEndIso,
                }),
              })
              if (!resp.ok) {
                console.warn('Service role insert failed for users table', await resp.text())
              }
            } catch (e) {
              console.warn('Service role insert threw error', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring user existence:', error)
      // Fail open to avoid blocking legitimate users; do not sign out here
    }
  }

  // Allow access to public pages
  const publicPaths = ['/login', '/register', '/agb', '/datenschutz', '/impressum', '/kontakt', '/']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Allow authenticated users to access welcome page
  const isWelcomePage = request.nextUrl.pathname.startsWith('/welcome')

  // If user is not signed in and the current path is not public, redirect to homepage
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If user is not signed in and trying to access welcome page, redirect to login
  if (!user && isWelcomePage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is signed in and the current path is /login or /register, redirect to /dashboard
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Gatekeep paid features: if user exists but no active subscription and trial expired, redirect to account settings
  if (user && !isPublicPath) {
    try {
      const { data: billing, error } = await supabase
        .from('users')
        .select('subscription_status, trial_end')
        .eq('id', user.id)
        .single()

      if (!error && billing) {
        const status = billing.subscription_status as string | null
        const trialEnd = billing.trial_end ? new Date(billing.trial_end as string) : null
        const trialActive = trialEnd ? trialEnd.getTime() > Date.now() : false
        const hasAccess = status === 'active' || status === 'trialing' || trialActive

        const pathIsAccountOrWelcome = request.nextUrl.pathname.startsWith('/account-settings') || request.nextUrl.pathname.startsWith('/welcome')

        if (!hasAccess && !pathIsAccountOrWelcome) {
          const url = request.nextUrl.clone()
          url.pathname = '/account-settings'
          url.searchParams.set('billing', 'required')
          return NextResponse.redirect(url)
        }
      }
    } catch (e) {
      // fail open
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclude API routes and static assets from middleware
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
