import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Logo } from '@/components/layout/logo'
import { OrganizerContentEn } from '@/content/persona/en/organizer'
import { OrganizerContentEs } from '@/content/persona/es/organizer'

export const metadata: Metadata = {
  title: 'Tournament Organizer Software for Board Game Clubs — TableTop Prime',
  description:
    'Create events, generate multiplayer pairings (Swiss, Round Robin, Adjacent Swiss, Single Elimination), configure custom scoring rules with tiebreakers, dispatch judges, and export results as CSV. Free for board game clubs and conventions.',
  alternates: { canonical: 'https://tabletopprime.com/organizer' },
  openGraph: {
    title: 'Tournament Organizer Software — TableTop Prime',
    description:
      'Run board game tournaments from your phone. Pairings, scoring, judge dispatch, and CSV export — all in one mobile-first platform.',
    url: 'https://tabletopprime.com/organizer',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Board Game Tournament Organizer Software',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tournament Organizer Software — TableTop Prime',
    description:
      'Run board game tournaments from your phone. Pairings, scoring, judge dispatch, and CSV export.',
    images: ['/og-image.png'],
  },
  keywords: [
    'tournament organizer software',
    'board game tournament',
    'pairing software',
    'Swiss tournament',
    'round robin tournament',
    'single elimination bracket',
    'convention management',
    'torneo de juegos de mesa',
    'software organizar torneos',
    'emparejamiento',
    'gestión de torneos',
  ],
}

export default async function OrganizerPage() {
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
        {isEs ? <OrganizerContentEs /> : <OrganizerContentEn />}
      </main>
    </div>
  )
}
