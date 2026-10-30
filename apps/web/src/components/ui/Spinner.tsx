import { cn } from '../../lib/cn'

interface SpinnerProps {
  className?: string
  /** Accessible label announced by screen readers. */
  label?: string
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <svg
        className={cn('h-4 w-4 animate-spin text-current', className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
