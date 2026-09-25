import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Logo } from '@/components/layout/logo'
import { PlayerContentEn } from '@/content/persona/en/player'
import { PlayerContentEs } from '@/content/persona/es/player'

export const metadata: Metadata = {
  title: 'Board Game Tournament Companion App — TableTop Prime',
  description:
    'Check in with a QR code, see your table assignment, submit and confirm scores, call a judge, and follow live standings — all from your phone. No app install, no account, no cost. Free for players.',
  alternates: { canonical: 'https://tabletopprime.com/player' },
  openGraph: {
    title: 'Board Game Tournament Companion App — TableTop Prime',
    description:
      'Check in, see your table, submit scores, call a judge, and follow live standings — all from your phone. No app install needed.',
    url: 'https://tabletopprime.com/player',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Board Game Tournament Companion App',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Board Game Tournament Companion App — TableTop Prime',
    description:
      'Check in, see your table, submit scores, call a judge, and follow live standings — all from your phone.',
    images: ['/og-image.png'],
  },
  keywords: [
    'board game tournament app',
    'tournament check-in',
    'QR code check-in',
    'live tournament standings',
    'score submission',
    'call judge',
    'companion app',
    'app de acompañante para torneos',
    'check-in torneo',
    'clasificación en vivo',
    'enviar puntuación',
    'llamar juez',
  ],
}

export default async function PlayerPage() {
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
        {isEs ? <PlayerContentEs /> : <PlayerContentEn />}
      </main>
    </div>
  )
}
