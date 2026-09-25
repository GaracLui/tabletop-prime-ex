'use client'

/**
 * PlayerChip — shared component for rendering a player's color dot + name.
 *
 * Solves two problems that caused UI overflow on mobile:
 *
 *   1. Long unbroken names like "ANameInASingleLineThatIsReallyLong"
 *      pushed flex containers wider than the viewport.
 *   2. Inconsistent truncation classes across 14 render sites — some had
 *      `flex-1 min-w-0 truncate`, others only had `truncate` (missing the
 *      critical `flex-1 min-w-0` that lets the flex item shrink below its
 *      content's intrinsic width).
 *
 * This component enforces the correct truncation pattern everywhere:
 *
 *   <span className="flex min-w-0 flex-1 items-center gap-2">
 *     <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full {color}" />
 *     <span className="truncate" title={name}>{name}</span>
 *   </span>
 *
 * The `title` attribute provides a tooltip so users can see the full name
 * on hover/tap even when it's truncated.
 *
 * Usage:
 *   <PlayerChip player={p} />
 *   <PlayerChip player={p} size="sm" />
 *   <PlayerChip name={row.name} color={row.color} />
 */

interface PlayerLike {
  name: string
  color: string
}

interface PlayerChipProps {
  /** The player object. Either `player` or both `name`+`color` must be provided. */
  player?: PlayerLike
  /** Override the name directly (useful for standings rows that aren't Player objects). */
  name?: string
  /** Override the color directly. */
  color?: string
  /** Dot size — default matches the historical `h-2.5 w-2.5`. Use `sm` for the
   *  smaller share-page chip dots (`h-2 w-2`). */
  dotSize?: 'default' | 'sm'
  /** Whether the name span should be `font-medium`. Defaults to false. */
  medium?: boolean
  /** Additional className for the outer wrapper. */
  className?: string
  /** Render as a div instead of a span (useful when the parent is a flex container
   *  that needs a block-level child). */
  as?: 'span' | 'div'
}

const DOT_SIZE_CLASSES = {
  default: 'h-2.5 w-2.5',
  sm: 'h-2 w-2',
} as const

export function PlayerChip({
  player,
  name: nameProp,
  color: colorProp,
  dotSize = 'default',
  medium = false,
  className,
  as = 'span',
}: PlayerChipProps) {
  const name = nameProp ?? player?.name ?? ''
  const color = colorProp ?? player?.color ?? 'bg-rose-500'
  const Wrapper = as

  return (
    <Wrapper className={`flex min-w-0 flex-1 items-center gap-2 ${className ?? ''}`}>
      <span
        className={`${DOT_SIZE_CLASSES[dotSize]} flex-shrink-0 rounded-full ${color}`}
        aria-hidden="true"
      />
      <span
        className={`min-w-0 truncate ${medium ? 'font-medium' : ''}`}
        title={name}
      >
        {name}
      </span>
    </Wrapper>
  )
}

/**
 * PlayerChipInline — a non-flex variant for contexts where the chip sits
 * inline inside an existing flex row and we only want the dot + truncating
 * name (without the outer flex wrapper).
 *
 * Use this inside `<TableCell>` or tight `<Label>` layouts where the parent
 * already provides the flex container.
 */
export function PlayerChipInline({
  player,
  name: nameProp,
  color: colorProp,
  dotSize = 'default',
  medium = false,
}: Omit<PlayerChipProps, 'className' | 'as'>) {
  const name = nameProp ?? player?.name ?? ''
  const color = colorProp ?? player?.color ?? 'bg-rose-500'

  return (
    <>
      <span
        className={`${DOT_SIZE_CLASSES[dotSize]} flex-shrink-0 rounded-full ${color}`}
        aria-hidden="true"
      />
      <span
        className={`min-w-0 flex-1 truncate ${medium ? 'font-medium' : ''}`}
        title={name}
      >
        {name}
      </span>
    </>
  )
}
