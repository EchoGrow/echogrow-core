import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid = false, id, ...rest }: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn(
        'w-full resize-y rounded-xl border bg-surface-card px-4 py-3.5 text-sm leading-relaxed text-fg',
        'transition-all duration-200 placeholder:text-fg-subtle',
        'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:bg-chip disabled:text-fg-muted',
        invalid
          ? 'border-danger-500 bg-danger-50/40 dark:bg-danger-500/10'
          : 'border-line-strong hover:border-accent-500',
        className,
      )}
      {...rest}
    />
  )
}