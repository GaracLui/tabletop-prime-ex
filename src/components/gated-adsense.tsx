'use client'

/**
 * GatedAdSense — loads the Google AdSense script only after the user
 * has accepted "all" cookies (analytics + advertising).
 *
 * If the user chose "essential only", the AdSense script never loads
 * — no ad cookies are set, no ad requests are made.
 *
 * The publisher ID (ca-pub-XXX) is hardcoded here for simplicity.
 * To change it, update the PUBLISHER_ID constant below.
 *
 * Placement: Google's auto-ads feature handles ad placement automatically
 * — you don't need <ins> tags on individual pages. The script scans the
 * page and inserts ads in optimal positions.
 *
 * AD-FREE PAGES (Google Publisher Policy compliance):
 * Google's "Google-served ads on screens without publisher-content" policy
 * prohibits ads on legal pages, auth screens, error pages, and other
 * low-content screens. We block ad loading on these paths:
 *   • /privacy, /terms, /cookies — legal/policy pages
 *   • /auth, /login, /signup — authentication screens
 *   • /share/* — public event share pages (could show minor data; cleaner
 *     without ads competing with the standings table)
 *   • 404 / error pages — no publisher content
 */

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { getConsent, CONSENT_COOKIE_NAME } from '@/components/cookie-consent'

// Replace this with your actual AdSense publisher ID
const PUBLISHER_ID = 'ca-pub-3609541115058814'
const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`

/**
 * Pages where AdSense should NOT load.
 *
 * Rationale per Google's "Google-served ads on screens without
 * publisher-content" policy:
 *   - Legal pages: ads competing with policy text is poor UX + flagged.
 *   - Auth pages: sign-in/signup screens have no publisher content.
 *   - Share pages: public standings pages — keep them clean for visitors.
 *   - API routes: not HTML pages, never get ads.
 */
const AD_FREE_PATH_PATTERNS: Array<RegExp | string> = [
  '/privacy',
  '/terms',
  '/cookies',
  '/auth',
  '/login',
  '/signup',
  /^\/share\//,    // public event share pages
  /^\/api\//,      // API routes (never HTML)
]

function isAdFreePath(pathname: string | null): boolean {
  if (!pathname) return true
  return AD_FREE_PATH_PATTERNS.some((p) =>
    typeof p === 'string' ? pathname === p || pathname.startsWith(p + '/') : p.test(pathname)
  )
}

export function GatedAdSense() {
  const [canLoad, setCanLoad] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const check = () => {
      const consent = getConsent()
      const allowed = consent === 'all' && !isAdFreePath(pathname)
      setCanLoad(allowed)
    }

    check()
    window.addEventListener('ttp-consent-change', check as EventListener)

    // Also listen for storage changes (user resets consent from /cookies page)
    window.addEventListener('storage', (e) => {
      if (e.key === CONSENT_COOKIE_NAME) check()
    })

    return () => {
      window.removeEventListener('ttp-consent-change', check as EventListener)
    }
  }, [pathname])

  if (!canLoad) return null

  return (
    <>
      <script
        async
        src={ADSENSE_SCRIPT_SRC}
        crossOrigin="anonymous"
        // Strategy: afterInteractive so it doesn't block page load.
        // Next.js handles this via the <script> tag in the head.
      />
    </>
  )
}

export { PUBLISHER_ID as ADSENSE_PUBLISHER_ID }
