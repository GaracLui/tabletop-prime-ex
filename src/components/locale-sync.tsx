'use client'

/**
 * LocaleSync — keeps <html lang> in sync with the user's selected locale,
 * and auto-detects the browser language on the first visit.
 *
 * Two responsibilities:
 *   1. Auto-detect: on first visit (no persisted locale), check the
 *      browser's `navigator.language`. If it starts with "es", default
 *      to Spanish; otherwise English.
 *   2. Sync: whenever the locale changes, update <html lang="..."> so
 *      screen readers, search engines, and browser translation prompts
 *      use the correct language.
 *
 * Renders nothing — it's a side-effect-only component.
 */
import * as React from 'react'
import { useUIStore } from '@/lib/store/ui-store'
import type { Locale } from '@/lib/i18n'

const LOCALE_MAP: Record<Locale, string> = {
  en: 'en',
  es: 'es',
}

export function LocaleSync() {
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)

  // Auto-detect browser language on first mount.
  // The Zustand store persists `locale` to localStorage, so if the user has
  // already chosen a language, this effect is a no-op (locale is already set
  // from the persisted state). But on the very first visit, the persisted
  // state is `en` (the default) — so we check navigator.language and switch
  // to Spanish if appropriate.
  React.useEffect(() => {
    // Only auto-detect once — check if we've already done it.
    const HAS_DETECTED = 'ttp-lang-detected'
    if (sessionStorage.getItem(HAS_DETECTED)) return
    sessionStorage.setItem(HAS_DETECTED, '1')

    // Check if the user has a persisted locale (Zustand persist).
    // The store persists `locale` under key `tabletop-prime-ui`.
    try {
      const persisted = JSON.parse(localStorage.getItem('tabletop-prime-ui') || '{}')
      // If the persisted state has a locale, the user has visited before —
      // respect their choice.
      if (persisted?.state?.locale) return
    } catch {
      // Ignore parse errors — fall through to auto-detection.
    }

    // v6 SEO: check the server-set ttp-locale cookie first (set by middleware
    // from Accept-Language detection). This is more reliable than
    // navigator.language because the server already parsed the full
    // Accept-Language header with quality values.
    const serverLocale = document.cookie
      .split('; ')
      .find((c) => c.startsWith('ttp-locale='))
      ?.split('=')[1]
    if (serverLocale === 'es') {
      setLocale('es')
      return
    }
    if (serverLocale === 'en') {
      return // default is already en
    }

    // Fallback: auto-detect from browser language.
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language || (navigator as any).userLanguage || 'en'
      if (browserLang.startsWith('es')) {
        setLocale('es')
      }
      // If it's anything else (en, fr, de, etc.), leave the default 'en'.
    }
  }, [setLocale])

  // Sync <html lang> whenever locale changes.
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = LOCALE_MAP[locale]
    }
  }, [locale])

  return null
}
