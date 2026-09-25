'use client'

/**
 * AuthView — sign in / sign up using Supabase Auth.
 *
 * Three auth methods:
 *   1. Email + password (sign in or sign up)
 *   2. Google OAuth (1-click, no password needed)
 *   3. Magic link (passwordless — email a login link)
 *
 * After successful auth, the AuthProvider's onAuthStateChange listener
 * detects the session and the page router navigates to My Events.
 */
import * as React from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { LogIn, UserPlus, Mail } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useToast } from '@/hooks/use-toast'
import { useUIStore } from '@/lib/store/ui-store'
import { Button } from '@/components/ui/button'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/layout/logo'

export function AuthView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const setView = useUIStore((s) => s.setView)
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [magicLinkSent, setMagicLinkSent] = React.useState(false)

  const supabase = getBrowserClient()

  // Email + password sign in
  const handleSignIn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })
      if (error) {
        toast({ title: error.message || t('auth.signInFailed'), variant: 'destructive' })
        setLoading(false)
        return
      }
      // AuthProvider will detect the session and route to My Events
      setView('my-events')
    } catch {
      toast({ title: t('auth.signInFailed'), variant: 'destructive' })
      setLoading(false)
    }
  }

  // Email + password sign up
  const handleSignUp = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { full_name: name.trim() || undefined },
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth/callback`
            : undefined,
        },
      })
      if (error) {
        toast({ title: error.message || t('auth.signUpFailed'), variant: 'destructive' })
        setLoading(false)
        return
      }

      // If email confirmation is required, data.session will be null
      if (data.user && !data.session) {
        toast({ title: t('auth.checkEmailConfirm') })
        setMode('signin')
      } else if (data.session) {
        // Auto-signed in (email confirmation disabled in Supabase dashboard)
        setView('my-events')
      } else {
        toast({ title: t('auth.signUpSuccess') })
        setMode('signin')
      }
      setLoading(false)
    } catch {
      toast({ title: t('auth.signUpFailed'), variant: 'destructive' })
      setLoading(false)
    }
  }

  // Google OAuth
  const handleGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth/callback`
            : undefined,
        },
      })
      if (error) {
        toast({ title: error.message || t('auth.googleFailed'), variant: 'destructive' })
        setLoading(false)
      }
      // If no error, the browser redirects to Google — no need to setLoading(false)
    } catch {
      toast({ title: t('auth.googleFailed'), variant: 'destructive' })
      setLoading(false)
    }
  }

  // Magic link (passwordless)
  const handleMagicLink = async () => {
    if (!email.trim()) {
      toast({ title: t('auth.enterEmailFirst'), variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth/callback`
            : undefined,
        },
      })
      if (error) {
        toast({ title: error.message || t('auth.magicLinkFailed'), variant: 'destructive' })
        setLoading(false)
        return
      }
      setMagicLinkSent(true)
      toast({ title: t('auth.magicLinkSent') })
      setLoading(false)
    } catch {
      toast({ title: t('auth.magicLinkFailed'), variant: 'destructive' })
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (mode === 'signup') handleSignUp()
    else handleSignIn()
  }

  if (magicLinkSent) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4 py-8 sm:px-6">
        <Card className="w-full">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto"><Logo size="lg" /></div>
            <CardTitle className="text-2xl">{t('auth.checkEmailTitle')}</CardTitle>
            <CardDescription>
              {t('auth.magicLinkSentPrefix')}{' '}
              <span className="font-medium text-foreground">{email}</span>.{' '}
              {t('auth.magicLinkSentSuffix')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setMagicLinkSent(false); setEmail('') }}
            >
              {t('auth.useDifferentEmail')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4 py-8 sm:px-6">
      <Card className="w-full">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto"><Logo size="lg" /></div>
          <CardTitle className="text-2xl">
            {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth */}
          <GoogleSignInButton
            onClick={handleGoogle}
            disabled={loading}
            label={t('auth.continueWithGoogle')}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
            </div>
          </div>

          {/* Email + password form */}
          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('auth.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <Button type="button" className="w-full" disabled={loading} onClick={handleSubmit}>
              {mode === 'signin' ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('auth.signInButton')}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('auth.signUpButton')}
                </>
              )}
            </Button>

            {/* Magic link */}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              disabled={loading || !email.trim()}
              onClick={handleMagicLink}
            >
              <Mail className="mr-2 h-3.5 w-3.5" />
              {t('auth.magicLinkInstead')}
            </Button>
          </div>

          {/* Toggle sign in / sign up */}
          <div className="text-center text-sm">
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('auth.noAccount')} <span className="font-medium text-primary">{t('auth.signUp')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('auth.haveAccount')} <span className="font-medium text-primary">{t('auth.signIn')}</span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
