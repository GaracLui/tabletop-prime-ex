'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { useI18n } from '@/hooks/use-i18n'
import { useUIStore, type ViewKey } from '@/lib/store/ui-store'
import { Logo } from '@/components/layout/logo'

export function Footer() {
  const { t } = useI18n()
  const setView = useUIStore((s) => s.setView)
  // next-themes: resolvedTheme gives the actual applied theme ('light' | 'dark' | 'system').
  // We use it to pick the BGG logo variant — light SVG on dark backgrounds, reversed on light.
  const { resolvedTheme } = useTheme()
  const bggLogoSrc = resolvedTheme === 'dark' ? '/bgg-powered-light.svg' : '/bgg-powered-dark.svg'

  const go = (v: ViewKey) => (e: React.MouseEvent) => {
    e.preventDefault()
    setView(v)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer
      className="mt-auto border-t border-border/60 bg-muted/20"
      role="contentinfo"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 grid-cols-2 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-semibold">{t('brand')}</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            {t('tagline')}
          </p>
        </div>

        <nav aria-label={t('footer.product')} className="space-y-2 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('footer.product')}
          </h2>
          <ul className="space-y-1.5">
            <li>
              <button onClick={go('dashboard')} className="text-muted-foreground hover:text-foreground">
                {t('nav.dashboard')}
              </button>
            </li>
            <li>
              <button onClick={go('companion')} className="text-muted-foreground hover:text-foreground">
                {t('nav.companion')}
              </button>
            </li>
            <li>
              <button onClick={go('judge')} className="text-muted-foreground hover:text-foreground">
                {t('nav.judge')}
              </button>
            </li>
            <li>
              <a href="/stats" className="text-muted-foreground hover:text-foreground">
                {t('nav.stats')}
              </a>
            </li>
            <li>
              <a href="/changelog" className="text-muted-foreground hover:text-foreground">
                Changelog
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label={t('footer.legal')} className="space-y-2 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('footer.legal')}
          </h2>
          <ul className="space-y-1.5">
            {/* Real <a> tags — not SPA navigation — so crawlers and Google OAuth
                reviewers can follow these URLs directly to crawlable pages. */}
            <li>
              <a href="/privacy" className="text-muted-foreground hover:text-foreground">
                {t('legal.privacy')}
              </a>
            </li>
            <li>
              <a href="/terms" className="text-muted-foreground hover:text-foreground">
                {t('legal.terms')}
              </a>
            </li>
            <li>
              <a href="/cookies" className="text-muted-foreground hover:text-foreground">
                {t('legal.cookies')}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} {t('brand')}. {t('common.footerRights')}</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>{t('common.builtWith')}</span>
            <span className="text-border">·</span>
            <span>{t('footer.techDirection')} <span className="font-medium text-foreground">{t('footer.techDirectionName')}</span></span>
            <img src="/lug.svg" alt={t('footer.lugAlt')} className="h-4 w-auto" />
            <span className="text-border">·</span>
            {/* BGG attribution — required by the BGG API terms of service.
                Light SVG on dark backgrounds (reversed), reversed SVG on light backgrounds.
                next/image is skipped here because these are static SVGs in /public
                and we want SSR-safe theme switching without layout shift. */}
            <img
              src={bggLogoSrc}
              alt={t('footer.bggAlt')}
              className="h-4 w-auto"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
