import { motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  ExternalLink,
  Flag,
  Layers,
  TrendingUp,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { InterviewListItem } from '../../lib/api'

export interface CandidateGroup {
  email: string
  name: string
  sessions: InterviewListItem[]
  latest: InterviewListItem
}

interface CandidateGroupCardProps {
  group: CandidateGroup
  selectedSession: InterviewListItem | null
  onSelectSession: (sessionId: string) => void
  onOpenModal: () => void
  disabled?: boolean
}

function scoreTone(score: number | null): string {
  if (score === null) return 'text-fg-muted'
  if (score >= 4) return 'text-success-700 dark:text-success-500'
  if (score >= 3) return 'text-warning-700 dark:text-warning-500'
  return 'text-danger-700 dark:text-danger-500'
}

function scoreBg(score: number | null): string {
  if (score === null) return 'bg-line-strong'
  if (score >= 4) return 'bg-success-500'
  if (score >= 3) return 'bg-warning-500'
  return 'bg-danger-500'
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Unknown date'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CandidateGroupCard({
  group,
  selectedSession,
  onSelectSession,
  onOpenModal,
  disabled = false,
}: CandidateGroupCardProps) {
  const { latest, sessions, name, email } = group
  const sessionCount = sessions.length
  const hasMultiple = sessionCount > 1
  const isLatestSelected = selectedSession?.id === latest.id
  const isOlderSelected =
    selectedSession !== null && selectedSession.id !== latest.id
  const isAnySelected = selectedSession !== null

  // The session whose metrics we display: selected one, or latest if none.
  const displaySession = selectedSession ?? latest

  return (
    <motion.div
      whileHover={{ y: disabled ? 0 : -2 }}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border bg-surface-card transition-all',
        isAnySelected
          ? 'border-accent-500 ring-2 ring-accent-500/30'
          : 'border-line hover:border-accent-300 hover:shadow-card',
        disabled && 'opacity-60',
      )}
    >
      {/* Clickable area → opens modal */}
      <button
        type="button"
        onClick={onOpenModal}
        className="flex flex-1 cursor-pointer flex-col items-stretch p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        aria-label={`Open all interviews for ${name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-fg-strong">
              {name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-fg-muted">{email}</p>
          </div>
          {hasMultiple && (
            <span className="shrink-0 rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-700 dark:text-accent-300">
              {sessionCount} interviews
            </span>
          )}
        </div>

        {/* Score of the currently displayed session */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            {isOlderSelected ? 'Selected score' : 'Latest score'}
          </span>
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              scoreTone(displaySession.overallScore),
            )}
          >
            {displaySession.overallScore?.toFixed(1) ?? '—'}{' '}
            <span className="text-xs font-medium text-fg-muted">/ 5</span>
          </span>
        </div>

        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-chip">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              scoreBg(displaySession.overallScore),
            )}
            style={{
              width: `${((displaySession.overallScore ?? 0) / 5) * 100}%`,
            }}
          />
        </div>

        <div className="mt-2 text-[11px] text-fg-muted">
          {isOlderSelected ? (
            <>
              Selected:{' '}
              <span className="font-medium text-fg">
                {formatDateTime(displaySession.completedAt)}
              </span>
            </>
          ) : (
            <>
              Latest:{' '}
              <span className="font-medium text-fg">
                {formatDateTime(displaySession.completedAt)}
              </span>
            </>
          )}
        </div>

        {/* Metrics: use displaySession (not latest) */}
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Flag className="h-3 w-3" />
            {displaySession.pendingDiscrepancies} pending
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {displaySession.skillGaps} gaps
          </span>
          {hasMultiple && (
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-accent-700 dark:text-accent-300">
              Click to see all {sessionCount}
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </button>

      {/* Footer: checkbox + dashboard link (opens in new tab) */}
      <div className="flex items-center justify-between gap-2 border-t border-line bg-chip/40 px-3 py-2">
        <label
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-fg"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isAnySelected}
            onChange={() => onSelectSession(latest.id)}
            disabled={disabled}
            className="sr-only"
          />
          <span
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
              isAnySelected
                ? 'border-accent-500 bg-accent-500 text-white'
                : 'border-line-strong bg-surface-card text-transparent group-hover:border-accent-400',
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {isOlderSelected ? (
            <span className="text-[11px] text-accent-700 dark:text-accent-300">
              Older interview selected
            </span>
          ) : isLatestSelected ? (
            'Selected (latest)'
          ) : (
            'Select candidate'
          )}
        </label>

        <a
          href={`/dashboard/${displaySession.id}/overview`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-500/10"
          title="View full dashboard (opens in a new tab)"
        >
          Dashboard
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!hasMultiple && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="mb-14 inline-flex items-center gap-1 rounded-full bg-navy-950/80 px-2.5 py-1 text-[10px] font-medium text-white">
            <Layers className="h-3 w-3" />
            View interview details
          </span>
        </div>
      )}
    </motion.div>
  )
}