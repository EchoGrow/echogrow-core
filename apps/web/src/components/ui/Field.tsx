import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps {
  /** Must match the id of the control rendered as `children`. */
  id: string
  label: string
  /** Short helper text under the label. */
  hint?: ReactNode
  /** Validation message. Reserves its own line so the layout never jumps. */
  error?: string
  /** Right-aligned meta, e.g. a character counter. */
  counter?: ReactNode
  /** Control aligned with the label, e.g. an "Upload .txt" trigger. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Label + hint + control + error/counter, with the ids wired for screen readers.
 * Every form field in the app should use this so spacing stays identical.
 */
export function Field({
  id,
  label,
  hint,
  error,
  counter,
  action,
  className,
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold text-navy-900">
            {label}
          </label>
          {hint ? (
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-muted">{hint}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-3">{children}</div>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p
          id={`${id}-error`}
          aria-live="polite"
          className={cn('min-h-4 text-xs leading-4', error ? 'text-red-600' : 'text-transparent')}
        >
          {error ?? ''}
        </p>
        {counter ? (
          <p className="shrink-0 text-xs leading-4 tabular-nums text-ink-subtle">{counter}</p>
        ) : null}
      </div>
    </div>
  )
}
