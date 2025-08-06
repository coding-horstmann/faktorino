import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/user-service'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/login?error=callback_error', requestUrl.origin))
      }

      if (data.user) {
        // Check if user profile exists, if not create it
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()

          if (!existingUser) {
            // Create user profile from auth metadata
            const userMetadata = data.user.user_metadata || {}
            await UserService.createUserProfile({
              id: data.user.id,
              email: data.user.email || '',
              name: userMetadata.name || data.user.email?.split('@')[0] || 'Benutzer',
              address: userMetadata.address || '',
              city: userMetadata.city || '',
              tax_number: userMetadata.tax_id || null,
              tax_status: 'regular'
            })
          }
        } catch (profileError) {
          console.error('Error handling user profile:', profileError)
          // Continue anyway - user can complete profile later
        }
      }

      // Redirect to dashboard on success
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    } catch (error) {
      console.error('Session exchange error:', error)
      return NextResponse.redirect(new URL('/login?error=session_error', requestUrl.origin))
    }
  }

  // No code present, redirect to login
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
}
