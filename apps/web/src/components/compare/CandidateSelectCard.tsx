import { motion } from 'framer-motion'
import { Check, Flag, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { InterviewListItem } from '../../lib/api'

interface CandidateSelectCardProps {
  candidate: InterviewListItem
  isSelected: boolean
  onToggle: () => void
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

export function CandidateSelectCard({
  candidate,
  isSelected,
  onToggle,
  disabled = false,
}: CandidateSelectCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'group relative flex w-full flex-col items-stretch overflow-hidden rounded-xl border p-4 text-left transition-all',
        isSelected
          ? 'border-accent-500 bg-accent-50/60 ring-2 ring-accent-500/30 dark:bg-accent-500/10'
          : 'border-line bg-surface-card hover:border-accent-300 hover:shadow-card',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg-strong">
            {candidate.candidateName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{candidate.candidateEmail}</p>
        </div>
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
            isSelected
              ? 'border-accent-500 bg-accent-500 text-white'
              : 'border-line-strong bg-surface-card text-transparent group-hover:border-accent-400',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
          Overall score
        </span>
        <span className={cn('text-lg font-bold tabular-nums', scoreTone(candidate.overallScore))}>
          {candidate.overallScore?.toFixed(1) ?? '—'} <span className="text-xs font-medium text-fg-muted">/ 5</span>
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-chip">
        <div
          className={cn('h-full rounded-full transition-all', scoreBg(candidate.overallScore))}
          style={{ width: `${((candidate.overallScore ?? 0) / 5) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <Flag className="h-3 w-3" />
          {candidate.pendingDiscrepancies} pending
        </span>
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {candidate.skillGaps} gaps
        </span>
        {candidate.completedAt && (
          <span className="ml-auto tabular-nums">
            {new Date(candidate.completedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        )}
      </div>
    </motion.button>
  )
}