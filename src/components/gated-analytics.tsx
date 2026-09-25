'use client'

/**
 * GatedAnalytics — wraps Vercel Analytics so it only loads after the
 * user has accepted non-essential cookies (analytics category).
 *
 * If the user hasn't consented yet, waits for the consent event.
 * If they choose "essential only", analytics never loads.
 * If they choose "accept all", loads immediately.
 *
 * This ensures GDPR/LGPD compliance: no analytics cookies before consent.
 */
import * as React from 'react'
import { Analytics } from '@vercel/analytics/next'
import { getConsent, CONSENT_COOKIE_NAME } from '@/components/cookie-consent'

export function GatedAnalytics() {
  const [canTrack, setCanTrack] = React.useState(false)

  React.useEffect(() => {
    const check = () => {
      const consent = getConsent()
      setCanTrack(consent === 'all')
    }

    // Check on mount
    check()

    // Listen for consent changes
    window.addEventListener('ttp-consent-change', check as EventListener)

    // Also check when the consent cookie changes (e.g., user resets it
    // from the /cookies page)
    window.addEventListener('storage', (e) => {
      if (e.key === CONSENT_COOKIE_NAME) check()
    })

    return () => {
      window.removeEventListener('ttp-consent-change', check as EventListener)
    }
  }, [])

  if (!canTrack) return null

  return <Analytics />
}
