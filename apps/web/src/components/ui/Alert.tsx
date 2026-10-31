import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type AlertVariant = 'error' | 'info' | 'success'

const VARIANTS: Record<AlertVariant, { box: string; dot: string }> = {
  error: {
    box: 'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
    dot: 'bg-danger-500',
  },
  info: {
    box: 'border-line bg-chip text-fg dark:bg-chip dark:text-fg',
    dot: 'bg-accent-500',
  },
  success: {
    box: 'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    dot: 'bg-success-500',
  },
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function Alert({ variant = 'info', title, children, className, action }: AlertProps) {
  const styles = VARIANTS[variant]
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-fade-up', styles.box, className)}
    >
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)} />
      <div className="flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}