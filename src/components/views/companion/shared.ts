/**
 * Shared helper for the companion view.
 *
 * Returns the localized ordinal suffix for a number, e.g. 1 → "1st",
 * 2 → "2nd", 3 → "3rd", 4 → "4th". The translation function must be
 * supplied by the caller so this module stays free of React/store imports.
 *
 * Required i18n keys (under `common`):
 *   - ordinal1: "1st"
 *   - ordinal2: "2nd"
 *   - ordinal3: "3rd"
 *   - ordinalN: "{n}th" (template with `{n}` placeholder)
 */
export const ORDINAL = (n: number, t: (key: string) => string) => {
  if (n === 1) return t('common.ordinal1')
  if (n === 2) return t('common.ordinal2')
  if (n === 3) return t('common.ordinal3')
  return t('common.ordinalN').replace('{n}', String(n))
}
