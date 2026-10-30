import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type AlertVariant = 'error' | 'info' | 'success'

const VARIANTS: Record<AlertVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
  /** Optional retry action rendered on the right. */
  action?: ReactNode
}

export function Alert({ variant = 'info', title, children, className, action }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      <div className="flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && 'mt-0.5')}>{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
