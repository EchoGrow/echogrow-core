import { cn } from '../../lib/cn'

type LogoVariant = 'dark' | 'light'
type LogoSize = 'sm' | 'md' | 'lg'

const HEIGHTS: Record<LogoSize, string> = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-11',
}

const WORDMARK_SIZE: Record<LogoSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
}

interface LogoProps {
  /** `light` renders the white mark, for dark surfaces. */
  variant?: LogoVariant
  size?: LogoSize
  showWordmark?: boolean
  className?: string
}

/**
 * EchoGrow brand lockup: emblem + wordmark.
 * The emblem is a transparent PNG generated from the official logo, so it sits
 * cleanly on both white and navy surfaces.
 */
export function Logo({
  variant = 'dark',
  size = 'md',
  showWordmark = true,
  className,
}: LogoProps) {
  const src = variant === 'light' ? '/logo-light.png' : '/logo.png'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src={src} alt="" aria-hidden="true" className={cn(HEIGHTS[size], 'w-auto')} />
      {showWordmark ? (
        <span
          className={cn(
            'font-semibold tracking-tight',
            WORDMARK_SIZE[size],
            variant === 'light' ? 'text-white' : 'text-navy-900',
          )}
        >
          Echo
          <span className={variant === 'light' ? 'text-accent-400' : 'text-accent-600'}>
            Grow
          </span>
        </span>
      ) : (
        <span className="sr-only">EchoGrow</span>
      )}
    </span>
  )
}
