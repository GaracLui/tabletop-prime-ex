'use client'

/**
 * Shared helpers and constants for the judge view.
 *
 * `ORDINAL` returns the localized ordinal suffix for a number
 * (1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th"). The translation
 * function must be supplied by the caller so this module stays
 * free of React/store imports at the call boundary.
 *
 * `CATEGORY_LABEL` is a factory that returns the localized display
 * name for each judge-call category, given a translation function.
 *
 * Required i18n keys:
 *   - common.ordinal1: "1st"
 *   - common.ordinal2: "2nd"
 *   - common.ordinal3: "3rd"
 *   - common.ordinalN: "{n}th" (template with `{n}` placeholder)
 *   - judge.category.score:  "Score dispute"
 *   - judge.category.rule:   "Rule question"
 *   - judge.category.other:  "Other"
 */
export const ORDINAL = (n: number, t: (key: string) => string) => {
  if (n === 1) return t('common.ordinal1')
  if (n === 2) return t('common.ordinal2')
  if (n === 3) return t('common.ordinal3')
  return t('common.ordinalN').replace('{n}', String(n))
}

export const CATEGORY_LABEL = (
  t: (key: string) => string
): Record<string, string> => ({
  SCORE: t('judge.category.score'),
  RULE: t('judge.category.rule'),
  OTHER: t('judge.category.other'),
})
