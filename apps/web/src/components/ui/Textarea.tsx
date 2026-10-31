import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Renders the field in the error style and links it to the message. */
  invalid?: boolean
}

export function Textarea({ className, invalid = false, id, ...rest }: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn(
        'w-full resize-y rounded-xl border bg-surface px-4 py-3.5 text-sm leading-relaxed text-ink',
        'transition-colors placeholder:text-ink-subtle',
        'disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-ink-muted',
        invalid
          ? 'border-red-400 bg-red-50/40'
          : 'border-line-strong hover:border-navy-300',
        className,
      )}
      {...rest}
    />
  )
}
