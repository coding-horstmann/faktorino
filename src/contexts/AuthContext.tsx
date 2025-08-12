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

  // Check if user exists in our users table
  const checkUserExists = async (userId: string) => {
    try {
      const profile = await UserService.getUserProfile(userId)
      return !!profile
    } catch (error) {
      console.error('Error checking user existence:', error)
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
          
          // Check if user exists in our users table
          if (session?.user) {
            const exists = await checkUserExists(session.user.id)
            setUserExists(exists)
            
            // If user doesn't exist in our table, sign them out
            if (!exists) {
              console.log('User not found in users table, signing out')
              await supabase.auth.signOut({ scope: 'local' })
              setUser(null)
              setUserExists(false)
            }
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
        
        // Check if user exists in our users table
        if (session?.user) {
          const exists = await checkUserExists(session.user.id)
          setUserExists(exists)
          
          // If user doesn't exist in our table, sign them out
          if (!exists) {
            console.log('User not found in users table, signing out')
            await supabase.auth.signOut({ scope: 'local' })
            setUser(null)
            setUserExists(false)
          }
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

      // Clear the session
      await supabase.auth.signOut({ scope: 'local' })

      // Force complete page reload to clear all auth state
      setTimeout(() => {
        window.location.replace('/')
      }, 100)
    } catch (error) {
      console.error('Error signing out:', error)
      // Force reload even if signout fails
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
