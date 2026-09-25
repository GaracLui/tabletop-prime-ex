'use client'

import { useMemo } from 'react'
import { useUIStore } from '@/lib/store/ui-store'
import { translate, type Locale } from '@/lib/i18n'
import enMessages from '@/messages/en.json'
import esMessages from '@/messages/es.json'

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  es: esMessages,
}

export function useI18n() {
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)

  return useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string, vars?: Record<string, string | number>) =>
        translate(locale, MESSAGES, key, vars),
    }),
    [locale, setLocale]
  )
}
