import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, RefreshCw, X } from 'lucide-react'
import { Button, Spinner } from '../ui'
import { cn } from '../../lib/cn'
import { getAnalyticsDetails, ApiError, forceEvaluation } from '../../lib/api'
import type { AnalyticsDetailType, AnalyticsRange } from '@echogrow/shared'

interface AnalyticsDetailModalProps {
  type: AnalyticsDetailType | null
  range: AnalyticsRange
  title: string
  description?: string
  onClose: () => void
}

export function AnalyticsDetailModal({
  type,
  range,
  title,
  description,
  onClose,
}: AnalyticsDetailModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!type) return
    setLoading(true)
    setError(null)
    getAnalyticsDetails(type, range)
      .then(setData)
      .catch((cause) => {
        const message =
          cause instanceof ApiError ? cause.message : 'Could not load details.'
        setError(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!type) {
      setData(null)
      setError(null)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, range])

  useEffect(() => {
    if (!type) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [type])

  useEffect(() => {
    if (!type) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [type, onClose])

  return (
    <AnimatePresence>
      {type && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-surface-card shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-accent-50/60 to-transparent px-6 py-4 dark:from-accent-500/10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-fg-strong">{title}</h2>
                {description && (
                  <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={load}
                  disabled={loading}
                >
                  <RefreshCw
                    className={cn('h-4 w-4', loading && 'animate-spin')}
                  />
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-chip hover:text-fg-strong"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Spinner className="h-8 w-8 text-accent-600" />
                  <p className="text-sm text-fg-muted">Loading details…</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
                  {error}
                </div>
              )}

              {!loading && !error && data && (
                <ModalContent type={type} data={data} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ModalContent({ type, data }: { type: AnalyticsDetailType; data: any }) {
  switch (type) {
    case 'interviews':
      return <InterviewsContent data={data} />
    case 'completion-breakdown':
      return <CompletionContent data={data} />
    case 'processing-times':
      return <ProcessingContent data={data} />
    case 'discrepancies':
      return <DiscrepanciesContent data={data} />
    case 'scores':
      return <ScoresContent data={data} />
    case 'skills':
      return <SkillsContent data={data} />
    case 'needs-review':
      return <NeedsReviewContent data={data} />
    default:
      return null
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
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
  }
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        styles[status] ?? 'bg-chip text-fg-muted',
      )}
    >
      {status.replace('_', ' ')}
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
    } catch (err) {
      console.error(err)
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
        target="_blank"
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
        target="_blank"
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
  return <span className="text-[11px] text-fg-muted">In progress</span>
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

function InterviewsContent({ data }: { data: any }) {
  const items = data.items ?? []
  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">
        Total:{' '}
        <strong className="text-fg-strong">
          {data.total ?? items.length}
        </strong>
      </p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-center font-semibold">Score</th>
              <th className="px-3 py-2 text-center font-semibold">Pending</th>
              <th className="px-3 py-2 text-center font-semibold">Gaps</th>
              <th className="px-3 py-2 text-center font-semibold">Attempts</th>
              <th className="px-3 py-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r: any) => (
              <tr
                key={r.id}
                className="border-b border-line last:border-0 hover:bg-chip/40"
              >
                <td className="px-3 py-2">
                  <p className="text-sm font-medium text-fg-strong">
                    {r.candidateName}
                  </p>
                  <p className="text-[11px] text-fg-muted">{r.candidateEmail}</p>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.overallScore !== null ? r.overallScore.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.pendingDiscrepancies}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.skillGaps}
                </td>
                <td className="px-3 py-2 text-center">
                  <AttemptsBadge attempts={r.processingAttempts ?? 1} />
                </td>
                <td className="px-3 py-2 text-right">
                  <ActionCell id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CompletionContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-chip/40 p-4">
        <p className="text-xs text-fg-muted">
          <strong className="text-fg-strong">Formula:</strong> {data.formula}
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          Total interviews:{' '}
          <strong className="text-fg-strong">{data.total}</strong>
        </p>
      </div>
      <div className="space-y-2">
        {data.items.map((item: any) => (
          <div
            key={item.status}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-card px-4 py-3"
          >
            <span className="text-sm font-semibold text-fg-strong">
              {item.status}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-fg-muted">
                {item.count} ({item.percentage}%)
              </span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-chip">
                <div
                  className="h-full rounded-full bg-accent-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProcessingContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-chip/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            Avg EchoGrow
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg-strong">
            {data.avgProcessingSeconds}s
          </p>
        </div>
        <div className="rounded-xl border border-line bg-chip/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            Avg Manual Review
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-fg-strong">
            {data.avgManualSeconds}s
          </p>
        </div>
        <div className="rounded-xl border border-success-500/30 bg-success-50 p-4 dark:bg-success-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-success-700 dark:text-success-500">
            Total Saved
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-success-700 dark:text-success-500">
            {Math.round(data.totalSavedSeconds / 60)} min
          </p>
        </div>
      </div>
      <p className="rounded-lg border border-line bg-chip/40 px-3 py-2 text-[11px] leading-relaxed text-fg-muted">
        <strong className="text-fg-strong">Note:</strong> processing time now
        measures the current attempt only (from <code>processingStartedAt</code>{' '}
        to <code>completedAt</code>). Retries do not inflate the duration.
      </p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 text-right font-semibold">EchoGrow</th>
              <th className="px-3 py-2 text-right font-semibold">Manual</th>
              <th className="px-3 py-2 text-right font-semibold">Saved</th>
              <th className="px-3 py-2 text-right font-semibold">%</th>
              <th className="px-3 py-2 text-center font-semibold">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r: any) => (
              <tr
                key={r.interviewId}
                className="border-b border-line last:border-0 hover:bg-chip/40"
              >
                <td className="px-3 py-2 text-sm text-fg-strong">
                  {r.candidateName}
                </td>
                <td className="px-3 py-2 text-right text-sm tabular-nums text-fg">
                  {r.processingSeconds}s
                </td>
                <td className="px-3 py-2 text-right text-sm tabular-nums text-fg-muted">
                  {r.manualReviewSeconds}s
                </td>
                <td className="px-3 py-2 text-right text-sm tabular-nums font-semibold text-success-700 dark:text-success-500">
                  {r.savedSeconds}s
                </td>
                <td className="px-3 py-2 text-right text-sm tabular-nums text-fg">
                  {r.savingsPercent}%
                </td>
                <td className="px-3 py-2 text-center">
                  <AttemptsBadge attempts={r.processingAttempts ?? 1} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DiscrepanciesContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-chip/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-fg-muted">
            Total
          </p>
          <p className="mt-1 text-xl font-bold text-fg-strong">
            {data.totalDiscrepancies}
          </p>
        </div>
        <div className="rounded-xl border border-warning-500/30 bg-warning-50 p-3 dark:bg-warning-500/10">
          <p className="text-[10px] uppercase tracking-wider text-warning-700 dark:text-warning-500">
            Pending
          </p>
          <p className="mt-1 text-xl font-bold text-warning-700 dark:text-warning-500">
            {data.totalPending}
          </p>
        </div>
        <div className="rounded-xl border border-success-500/30 bg-success-50 p-3 dark:bg-success-500/10">
          <p className="text-[10px] uppercase tracking-wider text-success-700 dark:text-success-500">
            Confirmed
          </p>
          <p className="mt-1 text-xl font-bold text-success-700 dark:text-success-500">
            {data.totalConfirmed}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-chip/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-fg-muted">
            Dismissed
          </p>
          <p className="mt-1 text-xl font-bold text-fg-strong">
            {data.totalDismissed}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 text-center font-semibold">Total</th>
              <th className="px-3 py-2 text-center font-semibold">Pending</th>
              <th className="px-3 py-2 text-center font-semibold">
                Confirmed
              </th>
              <th className="px-3 py-2 text-center font-semibold">
                Dismissed
              </th>
              <th className="px-3 py-2 text-center font-semibold">High</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r: any) => (
              <tr
                key={r.interviewId}
                className="border-b border-line last:border-0 hover:bg-chip/40"
              >
                <td className="px-3 py-2 text-sm text-fg-strong">
                  {r.candidateName}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.total}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-warning-700 dark:text-warning-500">
                  {r.pending}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-success-700 dark:text-success-500">
                  {r.confirmed}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg-muted">
                  {r.dismissed}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-danger-700 dark:text-danger-500">
                  {r.high}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScoresContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-accent-500/30 bg-accent-50 px-4 py-3 dark:bg-accent-500/10">
          <p className="text-[10px] uppercase tracking-wider text-accent-700 dark:text-accent-300">
            Average Score
          </p>
          <p className="mt-1 text-xl font-bold text-accent-700 dark:text-accent-300">
            {data.avgScore.toFixed(2)} / 5
          </p>
        </div>
        <div className="rounded-xl border border-line bg-chip/40 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-fg-muted">
            Candidates
          </p>
          <p className="mt-1 text-xl font-bold text-fg-strong">
            {data.items.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-chip/40 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-fg-muted">
            Distribution
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {data.distribution.map((d: any) => (
              <span
                key={d.score}
                className="rounded bg-chip px-1.5 py-0.5 text-[10px] font-medium text-fg-muted"
                title={`${d.score}★: ${d.count}`}
              >
                {d.score}★ {d.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 text-center font-semibold">Overall</th>
              <th className="px-3 py-2 text-center font-semibold">Tech</th>
              <th className="px-3 py-2 text-center font-semibold">Comm</th>
              <th className="px-3 py-2 text-center font-semibold">Domain</th>
              <th className="px-3 py-2 text-center font-semibold">Problem</th>
              <th className="px-3 py-2 text-center font-semibold">Conf</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r: any) => (
              <tr
                key={r.interviewId}
                className="border-b border-line last:border-0 hover:bg-chip/40"
              >
                <td className="px-3 py-2 text-sm text-fg-strong">
                  {r.candidateName}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums font-semibold text-fg-strong">
                  {r.overallScore?.toFixed(2) ?? '—'}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.technicalDepth ?? '—'}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.communication ?? '—'}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.domainExperience ?? '—'}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.problemSolving ?? '—'}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg-muted">
                  {r.confidence ? `${Math.round(r.confidence * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SkillsContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Top Skills (all candidates)
        </p>
        <div className="flex flex-wrap gap-2">
          {data.topSkills.map((s: any, i: number) => (
            <span
              key={i}
              className="rounded-full border border-line bg-chip px-2.5 py-1 text-xs font-medium text-fg-strong"
            >
              {s.skill} <span className="text-fg-muted">({s.count})</span>
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 text-center font-semibold">Gaps</th>
              <th className="px-3 py-2 font-semibold">Skills</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r: any) => (
              <tr
                key={r.interviewId}
                className="border-b border-line last:border-0 hover:bg-chip/40"
              >
                <td className="px-3 py-2 text-sm text-fg-strong">
                  {r.candidateName}
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.count}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.skillNames.map((s: string, i: number) => (
                      <span
                        key={i}
                        className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-fg-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NeedsReviewContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-warning-500/30 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
        These interviews have low-confidence transcripts and require human
        review before scoring.
      </p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-chip/30 text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 text-center font-semibold">Words</th>
              <th className="px-3 py-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r: any) => (
              <tr
                key={r.id}
                className="border-b border-line last:border-0 hover:bg-chip/40"
              >
                <td className="px-3 py-2">
                  <p className="text-sm font-medium text-fg-strong">
                    {r.candidateName}
                  </p>
                  <p className="text-[11px] text-fg-muted">{r.candidateEmail}</p>
                </td>
                <td className="px-3 py-2 text-center text-sm tabular-nums text-fg">
                  {r.transcriptWords}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    to={`/dashboard/${r.id}/review`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-warning-700 hover:bg-warning-50 dark:text-warning-500 dark:hover:bg-warning-500/10"
                  >
                    Review
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}