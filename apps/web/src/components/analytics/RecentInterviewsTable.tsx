import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { cn } from '../../lib/cn'
import { forceEvaluation } from '../../lib/api'
import type { RecentInterview } from '@echogrow/shared'

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
  FAILED:
    'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
  NEEDS_REVIEW:
    'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
  REJECTED:
    'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
  QUEUED: 'bg-chip text-fg-muted',
  PROCESSING:
    'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300',
  SCORED:
    'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300',
  FLAGGED:
    'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function scoreTone(score: number | null): string {
  if (score === null) return 'text-fg-muted'
  if (score >= 4) return 'text-success-700 dark:text-success-500'
  if (score >= 3) return 'text-warning-700 dark:text-warning-500'
  return 'text-danger-700 dark:text-danger-500'
}

function AttemptsBadge({ attempts }: { attempts: number }) {
  if (!attempts || attempts <= 1) {
    return <span className="text-xs tabular-nums text-fg-muted">1</span>
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
      <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
      {attempts}×
    </span>
  )
}

function RetryButton({ interviewId }: { interviewId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleRetry = async () => {
    setLoading(true)
    try {
      await forceEvaluation(interviewId)
      setDone(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="text-[11px] font-semibold text-success-700 dark:text-success-500">
        Queued ✓
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleRetry}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-danger-700 hover:bg-danger-50 disabled:opacity-50 dark:text-danger-500 dark:hover:bg-danger-500/10"
    >
      {loading ? 'Retrying…' : 'Retry'}
    </button>
  )
}

function ActionCell({ id, status }: { id: string; status: string }) {
  if (status === 'COMPLETED') {
    return (
      <Link
        to={`/dashboard/${id}/overview`}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-500/10"
      >
        Open
        <ExternalLink className="h-3 w-3" />
      </Link>
    )
  }
  if (status === 'NEEDS_REVIEW') {
    return (
      <Link
        to={`/dashboard/${id}/review`}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-warning-700 hover:bg-warning-50 dark:text-warning-500 dark:hover:bg-warning-500/10"
      >
        Review
        <ExternalLink className="h-3 w-3" />
      </Link>
    )
  }
  if (status === 'FAILED') {
    return <RetryButton interviewId={id} />
  }
  if (status === 'REJECTED') {
    return <span className="text-[11px] text-fg-muted">Rejected</span>
  }
  return <span className="text-[11px] text-fg-muted">Processing</span>
}

export function RecentInterviewsTable({ interviews }: { interviews: RecentInterview[] }) {
  if (interviews.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        No interviews yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
            <th className="px-3 py-2 font-semibold">Candidate</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 text-center font-semibold">Score</th>
            <th className="px-3 py-2 text-center font-semibold">Pending</th>
            <th className="px-3 py-2 text-center font-semibold">Attempts</th>
            <th className="px-3 py-2 text-right font-semibold">Created</th>
            <th className="px-3 py-2 text-right font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((r) => (
            <tr
              key={r.id}
              className="border-b border-line last:border-0 transition-colors hover:bg-chip/40"
            >
              <td className="px-3 py-2.5">
                <p className="truncate text-sm font-medium text-fg-strong">
                  {r.candidateName}
                </p>
                <p className="truncate text-[11px] text-fg-muted">
                  {r.candidateEmail}
                </p>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    STATUS_STYLES[r.status] ?? 'bg-chip text-fg-muted',
                  )}
                >
                  {r.status.replace('_', ' ')}
                </span>
              </td>
              <td
                className={cn(
                  'px-3 py-2.5 text-center text-sm font-bold tabular-nums',
                  scoreTone(r.overallScore),
                )}
              >
                {r.overallScore !== null ? `${r.overallScore.toFixed(1)}` : '—'}
              </td>
              <td className="px-3 py-2.5 text-center text-sm tabular-nums text-fg-muted">
                {r.pendingDiscrepancies > 0 ? (
                  <span className="font-semibold text-warning-700 dark:text-warning-500">
                    {r.pendingDiscrepancies}
                  </span>
                ) : (
                  <span className="text-fg-muted">0</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                <AttemptsBadge attempts={r.processingAttempts ?? 1} />
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums text-fg-muted">
                {formatRelative(r.completedAt ?? r.createdAt)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <ActionCell id={r.id} status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}