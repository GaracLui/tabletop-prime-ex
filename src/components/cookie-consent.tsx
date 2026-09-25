'use client'

/**
 * CookieConsent — bottom bar that asks users to accept or reject
 * non-essential cookies.
 *
 * Categories:
 *   • Essential — always on (auth, theme, locale). Not gateable.
 *   • Analytics — Vercel Analytics. Gateable.
 *   • Advertising — Google AdSense (future). Gateable.
 *
 * Stores the user's choice in a cookie that lasts 1 year. If the user
 * accepts, the consent is also exposed via a custom event so scripts
 * gated behind consent can initialize.
 *
 * Design:
 *   • Bottom bar, slides up from the bottom of the screen
 *   • Card-style with border + shadow for visibility over any content
 *   • Two buttons: "Accept all" (primary) and "Essential only" (outline)
 *   • Link to /cookies for full policy
 *   • Dismissible via X (counts as "essential only")
 *
 * GDPR/LGPD compliance:
 *   • No cookies set before consent (except the consent cookie itself)
 *   • User can change their choice by visiting /cookies (has a "Reset" button)
 *   • Consent is per-browser, not per-account (covers logged-out users)
 */
import * as React from 'react'
import { Cookie, X, Check, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'

export type ConsentChoice = 'all' | 'essential'

export const CONSENT_COOKIE_NAME = 'ttp-consent'
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Read the consent cookie. Returns null if not set.
 * Safe to call on the client during render (checks document.cookie).
 */
export function getConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CONSENT_COOKIE_NAME}=`))
  if (!match) return null
  const value = match.split('=')[1]
  return value === 'all' ? 'all' : value === 'essential' ? 'essential' : null
}

/**
 * Set the consent cookie + dispatch a custom event so gated scripts
 * can react (e.g., Vercel Analytics, future AdSense).
 */
export function setConsent(choice: ConsentChoice) {
  const value = choice === 'all' ? 'all' : 'essential'
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; max-age=${CONSENT_COOKIE_MAX_AGE}; path=/; SameSite=Lax; Secure`
  // Dispatch a custom event so the layout can react (enable analytics, etc.)
  window.dispatchEvent(new CustomEvent('ttp-consent-change', { detail: choice }))
}

export function CookieConsent() {
  const { t } = useI18n()
  const [visible, setVisible] = React.useState(false)

  // Check on mount — only show if no consent cookie exists.
  React.useEffect(() => {
    // Small delay to avoid layout shift on initial paint.
    const timer = setTimeout(() => {
      if (!getConsent()) {
        setVisible(true)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleAccept = () => {
    setConsent('all')
    setVisible(false)
  }

  const handleEssential = () => {
    setConsent('essential')
    setVisible(false)
  }

  const handleDismiss = () => {
    // Dismissing = essential only (GDPR default-deny principle)
    setConsent('essential')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-4 animate-in slide-in-from-bottom duration-300"
      role="dialog"
      aria-label={t('common.cookieTitle')}
      aria-live="polite"
    >
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card shadow-lg">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">
              {t('common.cookieTitle')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {t('common.cookieDescription')}{' '}
              <a href="/cookies" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
                {t('common.cookieLearnMore')}
              </a>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleEssential}>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('common.cookieEssentialOnly')}</span>
              <span className="sm:hidden">{t('common.cookieEssentialOnlyShort')}</span>
            </Button>
            <Button size="sm" onClick={handleAccept}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {t('common.cookieAcceptAll')}
            </Button>
            {/* Dismiss X — mobile-friendly */}
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
              aria-label={t('common.cookieDismiss')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
