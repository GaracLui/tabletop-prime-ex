import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Logo } from '@/components/layout/logo'
import { JudgeContentEn } from '@/content/persona/en/judge'
import { JudgeContentEs } from '@/content/persona/es/judge'

export const metadata: Metadata = {
  title: 'Tournament Judge Dispatch System — TableTop Prime',
  description:
    'Players tap "Call Judge" from their phone. Judges see a live, mobile-optimized queue with table number, issue category, and one-tap acknowledge and resolve. Edit disputed scores, track call status, and keep the tournament moving.',
  alternates: { canonical: 'https://tabletopprime.com/judge' },
  openGraph: {
    title: 'Tournament Judge Dispatch System — TableTop Prime',
    description:
      'Live call queue, score dispute resolution, and real-time standings — all from your phone. No app install needed.',
    url: 'https://tabletopprime.com/judge',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Tournament Judge Dispatch System',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tournament Judge Dispatch System — TableTop Prime',
    description:
      'Live call queue, score dispute resolution, and real-time standings for board game tournaments.',
    images: ['/og-image.png'],
  },
  keywords: [
    'judge dispatch system',
    'tournament judge',
    'score dispute resolution',
    'live call queue',
    'mobile judge system',
    'board game tournament',
    'sistema de aviso de jueces',
    'juez de torneo',
    'resolución de disputas',
    'cola de llamados',
  ],
}

export default async function JudgePage() {
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
        {isEs ? <JudgeContentEs /> : <JudgeContentEn />}
      </main>
    </div>
  )
}
