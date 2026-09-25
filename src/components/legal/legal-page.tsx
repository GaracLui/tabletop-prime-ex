'use client'

/**
 * LegalPage — shared wrapper for the 3 legal pages (privacy, cookies, terms).
 *
 * Responsibilities:
 *   • Renders the page header (logo + language toggle + back-to-home link)
 *   • Reads the current locale from useUIStore
 *   • Renders the correct locale's content component
 *   • Renders the footer copyright
 *
 * Usage:
 *   <LegalPage title="Privacy Policy" lastUpdated="September 2026" contentEn={<PrivacyContentEn />} contentEs={<PrivacyContentEs />} />
 *
 * The page.tsx file stays a server component (for metadata/SEO) and just
 * passes the EN/ES content as props. This component handles the interactive
 * locale switching client-side.
 */
import * as React from 'react'
import { Logo } from '@/components/layout/logo'
import { LegalLanguageToggle } from '@/components/legal/legal-language-toggle'
import { useUIStore } from '@/lib/store/ui-store'

interface LegalPageProps {
  /** English page title. */
  titleEn: string
  /** Spanish page title. */
  titleEs: string
  /** English "Last updated" label. */
  lastUpdatedEn: string
  /** Spanish "Last updated" label. */
  lastUpdatedEs: string
  /** English content (the <section> blocks). */
  contentEn: React.ReactNode
  /** Spanish content (the <section> blocks). */
  contentEs: React.ReactNode
}

export function LegalPage({
  titleEn,
  titleEs,
  lastUpdatedEn,
  lastUpdatedEs,
  contentEn,
  contentEs,
}: LegalPageProps) {
  const locale = useUIStore((s) => s.locale)
  const isEs = locale === 'es'
  const title = isEs ? titleEs : titleEn
  const lastUpdated = isEs ? lastUpdatedEs : lastUpdatedEn
  const content = isEs ? contentEs : contentEn
  const homeLabel = isEs ? 'Inicio' : 'Home'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <Logo size="sm" />
          <span className="text-sm font-semibold tracking-tight">TableTop Prime</span>
          <div className="ml-auto flex items-center gap-4">
            <LegalLanguageToggle />
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← {isEs ? 'Volver al inicio' : 'Back to home'}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Visible breadcrumbs — reinforces the BreadcrumbList JSON-LD in
            layout.tsx and gives users a navigation path back to the home
            page. Google rewards both the structured data AND the visible
            HTML breadcrumbs. */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <a href="/" className="hover:text-foreground hover:underline underline-offset-2">
                {homeLabel}
              </a>
            </li>
            <li aria-hidden="true" className="text-border">›</li>
            <li className="font-medium text-foreground" aria-current="page">
              {title}
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{lastUpdated}</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          {content}
        </div>

        <p className="pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} TableTop Prime. {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}
        </p>
      </main>
    </div>
  )
}
