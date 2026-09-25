'use client'

/**
 * AuthProvider — wraps the app with a Supabase auth listener that keeps
 * the client-side auth state in sync. Also creates the user's Prisma
 * profile on first login.
 */
import * as React from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'

interface AuthContextValue {
  user: { id: string; email: string; name?: string } | null
  isLoading: boolean
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  isLoading: true,
})

export function useAuth() {
  return React.useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthContextValue>({
    user: null,
    isLoading: true,
  })

  const supabase = React.useMemo(() => getBrowserClient(), [])

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Create or update the Prisma profile on first login
        fetch('/api/auth/sync-profile', { method: 'POST' }).catch(() => {})
        setState({
          user: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
          },
          isLoading: false,
        })
      } else {
        setState({ user: null, isLoading: false })
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Sync profile on sign-in
          fetch('/api/auth/sync-profile', { method: 'POST' }).catch(() => {})
          setState({
            user: {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || undefined,
            },
            isLoading: false,
          })
        } else {
          setState({ user: null, isLoading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
