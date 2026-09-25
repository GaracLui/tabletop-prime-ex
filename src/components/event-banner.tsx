'use client'

/**
 * EventBanner — renders the procedural SVG banner for an event.
 *
 * The banner is generated deterministically from (eventId + seedOffset).
 * Same inputs → same SVG, every time. No storage, no uploads, no moderation.
 *
 * Usage:
 *   <EventBanner eventId={event.id} seedOffset={event.bannerSeedOffset} />
 *
 * The component renders the SVG inline via dangerouslySetInnerHTML so it:
 *   • Scales perfectly to any container width (SVG is vector)
 *   • Inherits the container's height (set via className or style)
 *   • Has no external image request (zero bandwidth, instant render)
 *
 * The SVG output is our own code (banner.ts) so dangerouslySetInnerHTML
 * is safe here — no user input flows into the SVG markup.
 */
import * as React from 'react'
import { generateBannerSvg } from '@/lib/banner'
import { cn } from '@/lib/utils'

interface EventBannerProps {
  eventId: string
  /** Optional seed offset — incrementing this re-rolls the banner. */
  seedOffset?: number
  /** Additional className for the wrapper div. */
  className?: string
  /** Aspect ratio — defaults to 4:1 (16:4). Use 'wide' for 6:1, 'square' for 1:1. */
  variant?: 'default' | 'wide' | 'square' | 'thumbnail'
  /** Optional children rendered on top of the banner (e.g. event name overlay). */
  children?: React.ReactNode
}

const ASPECT_CLASSES: Record<NonNullable<EventBannerProps['variant']>, string> = {
  // 16:4 — the standard banner ratio for dashboard + share headers
  default: 'aspect-[4/1]',
  // 6:1 — wider, for slim header strips
  wide: 'aspect-[6/1]',
  // 1:1 — square, for card thumbnails
  square: 'aspect-square',
  // 16:9 — thumbnail with a bit more height than wide
  thumbnail: 'aspect-[16/9]',
}

export function EventBanner({
  eventId,
  seedOffset = 0,
  className,
  variant = 'default',
  children,
}: EventBannerProps) {
  // Memoize so the SVG is only generated once per (eventId, seedOffset) pair.
  // Re-renders with the same props return the cached string.
  const svg = React.useMemo(
    () => generateBannerSvg({ eventId, seedOffset }),
    [eventId, seedOffset]
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        ASPECT_CLASSES[variant],
        className
      )}
    >
      <div
        className="absolute inset-0 h-full w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-hidden="true"
      />
      {/* Optional overlay content — event name, gradient scrim for readability */}
      {children && (
        <div className="relative z-10 flex h-full w-full items-end p-4">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * EventBannerThumbnail — a small square variant for my-events cards.
 *
 * Convenience wrapper so callers don't need to pass variant="square"
 * every time.
 */
export function EventBannerThumbnail({
  eventId,
  seedOffset = 0,
  className,
}: {
  eventId: string
  seedOffset?: number
  className?: string
}) {
  return (
    <EventBanner
      eventId={eventId}
      seedOffset={seedOffset}
      variant="square"
      className={cn('h-10 w-10 flex-shrink-0', className)}
    />
  )
}
