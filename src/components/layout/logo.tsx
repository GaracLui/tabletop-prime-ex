/**
 * TableTop Prime — logo component.
 *
 * Uses the actual logo.svg from /public/ — a stylized die with breathing
 * animation. Falls back to an inline SVG if the image fails to load.
 *
 * Usage:
 *   <Logo size="sm" />  (navbar)
 *   <Logo size="md" />  (share page)
 *   <Logo size="lg" />  (large)
 */
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
}

export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      className={cn(sizeMap[size], className)}
    />
  )
}
