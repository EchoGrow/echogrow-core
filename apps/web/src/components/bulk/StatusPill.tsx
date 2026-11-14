import { AlertCircle, CheckCircle2, Clock, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { RowStatus } from '../../lib/bulkUpload'

const STYLES: Record<RowStatus, { label: string; className: string; icon: typeof Clock; spin?: boolean }> = {
  ready: {
    label: 'Ready',
    className: 'border-line-strong bg-chip text-fg-muted',
    icon: Clock,
  },
  queued: {
    label: 'Queued',
    className: 'border-line-strong bg-chip text-fg-muted',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    className: 'border-accent-500/30 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300',
    icon: Loader2,
    spin: true,
  },
  scored: {
    label: 'Scored',
    className: 'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    icon: CheckCircle2,
  },
  needs_review: {
    label: 'Needs review',
    className: 'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    icon: ShieldAlert,
  },
  rejected: {
    label: 'Rejected',
    className: 'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
    icon: XCircle,
  },
  failed: {
    label: 'Failed',
    className: 'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
    icon: AlertCircle,
  },
  error: {
    label: 'Upload failed',
    className: 'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
    icon: AlertCircle,
  },
}

export function StatusPill({ status, className }: { status: RowStatus; className?: string }) {
  const style = STYLES[status]
  const Icon = style.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        style.className,
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', style.spin && 'animate-spin')} />
      {style.label}
    </span>
  )
}
