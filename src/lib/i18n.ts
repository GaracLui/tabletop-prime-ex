/**
 * i18n configuration for TableTop Prime
 * Uses next-intl pattern but kept lightweight to work without a plugin.
 * Supported locales: English (en), Spanish (es)
 */
export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
}

/**
 * Helper to translate a key for a given locale, with nested key support
 * (e.g. "nav.dashboard"). Falls back to English, then to the key itself.
 */
export function translate(
  locale: Locale,
  messages: Record<Locale, Record<string, unknown>>,
  key: string,
  vars?: Record<string, string | number>
): string {
  const lookup = (obj: Record<string, unknown>): string | undefined => {
    const parts = key.split('.')
    let cur: unknown = obj
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as object)) {
        cur = (cur as Record<string, unknown>)[p]
      } else {
        return undefined
      }
    }
    return typeof cur === 'string' ? cur : undefined
  }

  let result = lookup(messages[locale]) ?? lookup(messages.en) ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return result
}
