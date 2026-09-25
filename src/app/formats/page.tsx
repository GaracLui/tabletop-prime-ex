import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Logo } from '@/components/layout/logo'
import { FormatsContentEn } from '@/content/persona/en/formats'
import { FormatsContentEs } from '@/content/persona/es/formats'

export const metadata: Metadata = {
  title: 'Board Game Tournament Formats Explained: Swiss vs Round Robin — TableTop Prime',
  description:
    'Compare all four tournament formats: Round Robin (social), Swiss (competitive), Single Elimination (knockout), and Adjacent Swiss (TFT/Commander finals). Pros, cons, comparison table, and when to use each.',
  alternates: { canonical: 'https://tabletopprime.com/formats' },
  openGraph: {
    title: 'Board Game Tournament Formats Explained — TableTop Prime',
    description:
      'Swiss vs Round Robin vs Single Elimination vs Adjacent Swiss — which format is right for your event? Compare all four with pros, cons, and a comparison table.',
    url: 'https://tabletopprime.com/formats',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Tournament Formats Explained',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Board Game Tournament Formats Explained — TableTop Prime',
    description:
      'Swiss vs Round Robin vs Single Elim vs Adjacent Swiss — compare all four formats.',
    images: ['/og-image.png'],
  },
  keywords: [
    'tournament format',
    'Swiss vs Round Robin',
    'Swiss tournament format',
    'round robin format',
    'single elimination bracket',
    'adjacent swiss format',
    'board game tournament format',
    'TFT tournament format',
    'Commander tournament format',
    'formato de torneo',
    'Suizo vs Round Robin',
    'formato de eliminación',
    'formato de torneo de juegos de mesa',
  ],
}

export default async function FormatsPage() {
  const cookieStore = await cookies()
  const isEs = cookieStore.get('ttp-locale')?.value === 'es'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Logo size="sm" />
          <span className="text-sm font-semibold tracking-tight">TableTop Prime</span>
          <a href="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground">
            ← {isEs ? 'Volver al inicio' : 'Back to home'}
          </a>
        </div>
      </header>

      <main className="space-y-20 py-10 sm:space-y-28 sm:py-16">
        {isEs ? <FormatsContentEs /> : <FormatsContentEn />}
      </main>
    </div>
  )
}
