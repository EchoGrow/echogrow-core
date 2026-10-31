import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/theme/ThemeContext'

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
  size?: LogoSize
  showWordmark?: boolean
  className?: string
}

export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  const { theme } = useTheme()
  
  const src = theme === 'dark' ? '/logo-light.png' : '/logo.png'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img 
        src={src} 
        alt="EchoGrow Logo" 
        className={cn(HEIGHTS[size], 'w-auto transition-opacity duration-300')} 
      />
      {showWordmark ? (
        <span
          className={cn(
            'font-semibold tracking-tight',
            WORDMARK_SIZE[size],
            'text-fg-strong'
          )}
        >
          Echo<span className="text-accent-600 dark:text-accent-400">Grow</span>
        </span>
      ) : (
        <span className="sr-only">EchoGrow</span>
      )}
    </span>
  )
}