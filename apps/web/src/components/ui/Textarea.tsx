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
        'w-full resize-y rounded-lg border bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm',
        'placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0',
        'disabled:cursor-not-allowed disabled:bg-slate-50',
        invalid
          ? 'border-red-400 focus:outline-red-500'
          : 'border-slate-300 focus:outline-brand-500',
        className,
      )}
      {...rest}
    />
  )
}
