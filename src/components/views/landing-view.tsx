'use client'

import {
  Dices,
  ShieldCheck,
  Gavel,
  Layers,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowRight,
  Info,
  Users,
  Trophy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { useI18n } from '@/hooks/use-i18n'
import { useUIStore } from '@/lib/store/ui-store'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { formatRoundFormat, formatRoundFormatDescription } from '@/lib/format'
import { PRIME_PLANS } from '@/lib/pricing'

const FEATURE_ICONS = [
  Dices,
  ShieldCheck,
  Gavel,
  Layers,
  SlidersHorizontal,
  FileSpreadsheet,
]

/** The 4 pairing formats — reuses dashboard i18n keys so descriptions stay
 * in sync with the Round Config tab. */
const PAIRING_FORMATS = [
  'ROUND_ROBIN',
  'SWISS',
  'SINGLE_ELIM',
  'ADJACENT_SWISS',
] as const

export function LandingView() {
  const { t } = useI18n()
  const setShowAuth = useUIStore((s) => s.setShowAuth)

  const handleGoogleSignIn = async () => {
    const supabase = getBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/api/auth/callback`
          : undefined,
      },
    })
  }

  const features = [
    { title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
    { title: t('landing.feature4Title'), desc: t('landing.feature4Desc') },
    { title: t('landing.feature5Title'), desc: t('landing.feature5Desc') },
    { title: t('landing.feature6Title'), desc: t('landing.feature6Desc') },
  ]

  const faqs = [
    { q: t('landing.faqQ1'), a: t('landing.faqA1') },
    { q: t('landing.faqQ2'), a: t('landing.faqA2') },
    { q: t('landing.faqQ3'), a: t('landing.faqA3') },
    { q: t('landing.faqQ4'), a: t('landing.faqA4') },
    { q: t('landing.faqQ5'), a: t('landing.faqA5') },
    { q: t('landing.faqQ6'), a: t('landing.faqA6') },
  ]

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        aria-labelledby="hero-title"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
          <Badge variant="secondary" className="mb-5 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {t('landing.badge')}
          </Badge>
          <h1
            id="hero-title"
            className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            {t('landing.heroTitle')}
          </h1>
          {/* v6 #4: outcome-focused subtitle — leads with the benefit, not a
              feature list. The feature list belongs in the grid below. */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t('landing.heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => setShowAuth(true)}
              className="w-full sm:w-auto"
            >
              {t('landing.ctaPrimary')}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            {/* v6 #8: secondary CTA shows what happens next (a demo) instead
                of being a duplicate "Sign in with Google". Links to the public
                share page of a sample event so visitors can see the product
                without committing to sign-up. */}
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <a href="/share/demo" target="_blank" rel="noopener noreferrer">
                {t('landing.ctaDemo')}
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* Google Sign-In — still available but de-emphasized (tertiary) */}
          <div className="mt-4">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              label={t('landing.ctaSecondary')}
            />
          </div>

          {/* Privacy & Terms — prominent links for Google OAuth compliance */}
          <p className="mt-6 text-xs text-muted-foreground">
            By signing in, you agree to our{' '}
            <a href="/privacy" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/terms" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
              Terms of Service
            </a>
            .
          </p>

          {/* Mini stat row — v6 #13: outcome-focused stats. */}
          <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{t('landing.statPlayers')}</dt>
              <dd className="mt-1 text-2xl font-semibold">{t('landing.statPlayersValue')}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{t('landing.statSetup')}</dt>
              <dd className="mt-1 text-2xl font-semibold">{t('landing.statSetupValue')}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{t('landing.statPrice')}</dt>
              <dd className="mt-1 text-2xl font-semibold">{t('landing.statPriceValue')}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* About / What is TableTop Prime — required by Google OAuth verification */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6" aria-labelledby="about-title">
        <div className="rounded-lg border border-border/60 bg-card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="about-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('landing.aboutTitle')}
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>{t('landing.aboutBody1')}</p>
            <p>{t('landing.aboutBody2')}</p>
            <p>{t('landing.aboutBody3')}</p>
          </div>

          {/* Three role cards — visual summary of who uses the app.
              v6: Organizer + Judge cards link to their dedicated persona
              pages (/organizer, /judge) for SEO hub-and-spoke linking. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <a
              href="/organizer"
              className="group rounded-md border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <Trophy className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">{t('landing.aboutRoleOrganizerTitle')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('landing.aboutRoleOrganizerDesc')}</p>
              <span className="mt-2 inline-block text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more →
              </span>
            </a>
            <a
              href="/judge"
              className="group rounded-md border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <Gavel className="mb-2 h-5 w-5 text-amber-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold">{t('landing.aboutRoleJudgeTitle')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('landing.aboutRoleJudgeDesc')}</p>
              <span className="mt-2 inline-block text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more →
              </span>
            </a>
            <a
              href="/player"
              className="group rounded-md border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <Users className="mb-2 h-5 w-5 text-emerald-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold">{t('landing.aboutRolePlayerTitle')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('landing.aboutRolePlayerDesc')}</p>
              <span className="mt-2 inline-block text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Features — v6 #10: each card is an anchor link target. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="features-title">
        <div className="mb-10 text-center">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.featuresTitle')}
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Dices
            const slug = `feature-${i + 1}`
            return (
              <a
                key={i}
                id={slug}
                href={`#${slug}`}
                className="group h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={f.title}
              >
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/30">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {f.desc}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            )
          })}
        </div>
      </section>

      {/* v6 #1: Pairing formats comparison section.
          Reuses the format descriptions from the Round Config tab (dashboard.*)
          so they stay in sync. Each format gets a card with name + description +
          the "How it works" label. */}
      <section
        className="mx-auto max-w-6xl px-4 sm:px-6"
        aria-labelledby="formats-title"
      >
        <div className="mb-10 text-center">
          <h2 id="formats-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.formatsTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t('landing.formatsSubtitle')}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {PAIRING_FORMATS.map((fmt) => (
            <Card key={fmt} id={`format-${fmt}`} className="h-full">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {fmt}
                  </Badge>
                  <CardTitle className="text-lg">{formatRoundFormat(fmt, t)}</CardTitle>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  <span className="font-medium text-foreground">{t('dashboard.formatHowItWorks')}</span>{' '}
                  {formatRoundFormatDescription(fmt, t)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <a
            href="/formats"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-2"
          >
            {t('landing.formatsLinkFormats')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* v6 #7: Pricing section.
          Renders the PRIME_PLANS from src/lib/pricing.ts so the matrix stays
          in sync with the actual tier limits. The "highlight" plan gets a
          primary border + "Most popular" badge. */}
      <section
        className="mx-auto max-w-6xl px-4 sm:px-6"
        aria-labelledby="pricing-title"
      >
        <div className="mb-10 text-center">
          <h2 id="pricing-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.pricingTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t('landing.pricingSubtitle')}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRIME_PLANS.map((plan) => (
            <Card
              key={plan.tier}
              className={plan.highlight ? 'border-primary ring-1 ring-primary/40' : ''}
            >
              <CardHeader>
                {plan.highlight && (
                  <Badge className="mb-1 w-fit" data-slot="badge">
                    {t('landing.pricingMostPopular')}
                  </Badge>
                )}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.target}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    ${plan.pricePerMonth}
                  </span>
                  {plan.pricePerMonth > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t('landing.pricingPerMonth')}
                    </span>
                  )}
                  {plan.pricePerMonth === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t('landing.pricingFree')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  ≤ {plan.maxPlayers} {t('landing.statPlayers').toLowerCase()}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* v6 #5: FAQ section with accordion.
          The JSON-LD `FAQPage` schema in layout.tsx makes these eligible for
          rich snippets in Google search results (accordion-style cards). */}
      <section
        className="mx-auto max-w-3xl px-4 sm:px-6"
        aria-labelledby="faq-title"
      >
        <div className="mb-10 text-center">
          <h2 id="faq-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.faqTitle')}
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium sm:text-base">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* v6 #11: Closing CTA — recap + repeat primary action. */}
      <section
        className="mx-auto max-w-4xl px-4 sm:px-6"
        aria-labelledby="closing-cta-title"
      >
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-8 text-center sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <h2
            id="closing-cta-title"
            className="text-balance text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {t('landing.closingCtaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t('landing.closingCtaSubtitle')}
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              onClick={() => setShowAuth(true)}
            >
              {t('landing.closingCtaButton')}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t('landing.closingCtaSecondary')}
          </p>
        </div>
      </section>
    </div>
  )
}
