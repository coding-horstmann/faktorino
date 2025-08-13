'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserService } from '@/lib/user-service'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  userExists: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  userExists: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userExists, setUserExists] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('AuthProvider state:', {
      hasUser: !!user,
      userEmail: user?.email,
      loading,
      userExists
    })
  }, [user, loading, userExists])

  // Ensure user profile exists (create minimal one if missing)
  const ensureUserProfile = async (userId: string, email?: string | null) => {
    try {
      const profile = await UserService.getUserProfile(userId)
      if (profile) return true
      const created = await UserService.createUserProfile({
        id: userId,
        email: email || '',
        name: '',
        address: '',
        city: '',
        tax_status: 'regular',
        subscription_status: 'trialing',
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      } as any)
      return !!created
    } catch (error) {
      console.error('Error ensuring user profile:', error)
      return false
    }
  }

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            const ensured = await ensureUserProfile(session.user.id, session.user.email)
            setUserExists(ensured)
          } else {
            setUserExists(false)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth error:', error)
        if (mounted) {
          setUser(null)
          setUserExists(false)
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      if (mounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          const ensured = await ensureUserProfile(session.user.id, session.user.email)
          setUserExists(ensured)
        } else {
          setUserExists(false)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('Signing out user:', user?.email)
      setUser(null)
      setUserExists(false)
      setLoading(true)

      // Clear the session globally (remove refresh token)
      await supabase.auth.signOut()

      // Redirect to homepage
      window.location.replace('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setUser(null)
      setUserExists(false)
      window.location.replace('/')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, userExists }}>
      {children}
    </AuthContext.Provider>
  )
}
