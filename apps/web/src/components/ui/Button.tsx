import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-navy-900 text-white shadow-sm hover:bg-navy-800 active:scale-[0.98] dark:bg-accent-500 dark:hover:bg-accent-400 dark:text-navy-950',
  accent: 'bg-accent-500 text-white shadow-sm hover:bg-accent-600 active:scale-[0.98] dark:bg-accent-400 dark:hover:bg-accent-300 dark:text-navy-950',
  secondary: 'border border-line-strong bg-surface-card text-fg hover:border-accent-500 hover:bg-chip active:scale-[0.98]',
  ghost: 'text-fg-muted hover:bg-chip hover:text-fg active:scale-[0.98]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" label="Submitting" /> : null}
      {children}
    </button>
  )
}