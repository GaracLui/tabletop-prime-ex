import type { Metadata } from 'next'
import { db } from '@/lib/db'

/**
 * Server-side metadata generation for the public share page.
 *
 * This runs on the server (not the client) so it can fetch the event name
 * from the database and inject it into the OG/Twitter card. When someone
 * shares a link to /share/SUMMER-7K3 on WhatsApp/Twitter/Facebook, the
 * card shows the event name — not the generic homepage title.
 *
 * The page.tsx in this folder is a 'use client' component that renders
 * the actual UI; this layout.tsx handles only the metadata.
 */

interface SharePageProps {
  params: Promise<{ eventCode: string }>
}

async function getEventMeta(eventCode: string) {
  // S8: filter on visibility in the query — a PRIVATE event must get the
  // same generic "Event not found" metadata as an unknown code. Without
  // this, the OG/Twitter tags in the HTML shell would leak the private
  // event's name, game, round progress, and description even though the
  // data API itself 404s.
  const event = await db.event.findUnique({
    where: { eventCode, visibility: 'PUBLIC' },
    select: {
      name: true,
      gameName: true,
      status: true,
      currentRound: true,
      totalRounds: true,
      description: true,
      bannerSeedOffset: true,
    },
  })
  return event
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { eventCode } = await params
  const event = await getEventMeta(eventCode)

  if (!event) {
    return {
      title: 'Event not found — TableTop Prime',
      description: 'This event code is invalid or the event has been removed.',
      openGraph: {
        title: 'Event not found — TableTop Prime',
        description: 'This event code is invalid or the event has been removed.',
        url: `https://tabletopprime.com/share/${eventCode}`,
        type: 'website',
        images: [
          {
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: 'TableTop Prime',
            type: 'image/png',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        images: ['/og-image.png'],
      },
    }
  }

  const title = `${event.name} — TableTop Prime`
  const description =
    event.description?.trim() ||
    `Follow ${event.name} (${event.gameName}) — round ${event.currentRound} of ${event.totalRounds}. Live standings and pairings.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://tabletopprime.com/share/${eventCode}`,
    },
    openGraph: {
      title,
      description,
      siteName: 'TableTop Prime',
      url: `https://tabletopprime.com/share/${eventCode}`,
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['es_AR', 'es_ES'],
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${event.name} — ${event.gameName} on TableTop Prime`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    robots: {
      index: false, // share pages shouldn't be indexed — event codes are semi-private
      follow: true,
    },
  }
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
