import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Button, Card } from '../ui'
import type { DiscrepancyRecord, DiscrepancyStatus } from '../../lib/api'

/* -------------------------------------------------------------------------- */
/* Status styling                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<
  DiscrepancyStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: 'Pending review',
    badge:
      'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    dot: 'bg-warning-500',
  },
  confirmed: {
    label: 'Confirmed',
    badge:
      'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    dot: 'bg-success-500',
  },
  dismissed: {
    label: 'Dismissed',
    badge: 'border-line bg-chip text-fg-muted',
    dot: 'bg-fg-muted/50',
  },
}

function confidencePercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface DiscrepancyDetailProps {
  discrepancy: DiscrepancyRecord
  onStatusChange?: (id: string, status: DiscrepancyStatus) => void
  className?: string
}

/**
 * Reusable card for a single discrepancy (issue #29). Shows the field name,
 * confidence and status, the CV vs. interview claims, and expandable verbatim
 * quotes, plus Confirm/Dismiss actions. Actions are disabled unless the
 * discrepancy is still `pending`.
 */
export function DiscrepancyDetail({
  discrepancy,
  onStatusChange,
  className,
}: DiscrepancyDetailProps) {
  const [expanded, setExpanded] = useState(false)
  const isPending = discrepancy.status === 'pending'
  const statusStyle = STATUS_STYLES[discrepancy.status]

  const handleConfirm = () => onStatusChange?.(discrepancy.id, 'confirmed')
  const handleDismiss = () => onStatusChange?.(discrepancy.id, 'dismissed')

  const hasQuotes = Boolean(discrepancy.cvQuote || discrepancy.interviewQuote)

  return (
    <Card className={cn('flex flex-col gap-4 p-5 sm:p-6', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
            Discrepancy
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-fg-strong">
            {discrepancy.field}
          </h3>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-lg bg-chip px-2.5 py-1 text-xs font-semibold tabular-nums text-fg-strong">
            {confidencePercent(discrepancy.confidence)} confidence
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              statusStyle.badge,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} aria-hidden="true" />
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Claims */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs font-semibold text-fg-muted">CV says</p>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-strong">{discrepancy.cvSays}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs font-semibold text-fg-muted">Interview says</p>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-strong">
            {discrepancy.interviewSays}
          </p>
        </div>
      </div>

      {/* Expandable quotes */}
      {hasQuotes ? (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300"
          >
            {expanded ? 'Hide evidence' : 'Show evidence'}
            <span aria-hidden="true" className="ml-1">
              {expanded ? '↑' : '↓'}
            </span>
          </button>

          {expanded ? (
            <div className="mt-3 space-y-3">
              {discrepancy.cvQuote ? (
                <blockquote className="border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                  <span className="mb-1 block text-xs font-semibold not-italic text-fg-muted">
                    CV quote
                  </span>
                  “{discrepancy.cvQuote}”
                </blockquote>
              ) : null}
              {discrepancy.interviewQuote ? (
                <blockquote className="border-l-4 border-warning-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                  <span className="mb-1 block text-xs font-semibold not-italic text-fg-muted">
                    Interview quote
                  </span>
                  “{discrepancy.interviewQuote}”
                </blockquote>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="primary"
          onClick={handleConfirm}
          disabled={!isPending || !onStatusChange}
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDismiss}
          disabled={!isPending || !onStatusChange}
        >
          Dismiss
        </Button>
        {!isPending ? (
          <span className="text-xs text-fg-muted">
            This discrepancy has already been reviewed.
          </span>
        ) : null}
      </div>

    </Card>
  )
}

export default DiscrepancyDetail