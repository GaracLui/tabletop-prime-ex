import type { Metadata } from 'next'

/**
 * Server-side metadata for the /stats page.
 *
 * The page.tsx is a client component (it uses usePlayerGlobalStats via
 * react-query), so it can't export `metadata` directly. This layout.tsx
 * is a server component that owns the static metadata.
 *
 * Pattern matches /share/[eventCode]/layout.tsx.
 */
export const metadata: Metadata = {
  title: 'Statistics — TableTop Prime',
  description:
    'View your tournament statistics across all events on TableTop Prime — total events, total wins, average placement, win rate, and a per-game breakdown.',
  alternates: { canonical: 'https://tabletopprime.com/stats' },
  openGraph: {
    title: 'Statistics — TableTop Prime',
    description:
      'View your tournament statistics across all events — wins, win rate, average placement, and per-game breakdown.',
    url: 'https://tabletopprime.com/stats',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Statistics',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
