'use client'

/**
 * LegalLanguageToggle — small button group at the top of each legal page
 * that lets the user switch between English and Spanish.
 *
 * Uses the same `useUIStore` locale that the rest of the app uses, so
 * switching here also updates the header/nav language. Persists across
 * page reloads via Zustand's localStorage persistence.
 */
import * as React from 'react'
import { Globe } from 'lucide-react'
import { useUIStore } from '@/lib/store/ui-store'
import type { Locale } from '@/lib/i18n'

const LANGUAGES: { code: Locale; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
]

export function LegalLanguageToggle() {
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Language selection">
      <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <div className="flex overflow-hidden rounded-md border border-border">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={
              'px-2.5 py-1 text-xs font-medium transition-colors ' +
              (locale === lang.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50')
            }
            aria-pressed={locale === lang.code}
            aria-label={lang.label}
          >
            {lang.short}
          </button>
        ))}
      </div>
    </div>
  )
}
