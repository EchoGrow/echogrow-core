import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type AlertVariant = 'error' | 'info' | 'success'

const VARIANTS: Record<AlertVariant, { box: string; dot: string }> = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-500' },
  info: { box: 'border-navy-200 bg-navy-50 text-navy-800', dot: 'bg-navy-500' },
  success: { box: 'border-accent-200 bg-accent-50 text-accent-900', dot: 'bg-accent-500' },
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
  /** Optional retry/dismiss action rendered on the right. */
  action?: ReactNode
}

export function Alert({ variant = 'info', title, children, className, action }: AlertProps) {
  const styles = VARIANTS[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        styles.box,
        className,
      )}
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
