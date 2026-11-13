import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Flag, TrendingUp, X } from 'lucide-react'
import { Button } from '../ui'
import { cn } from '../../lib/cn'
import type { InterviewListItem } from '../../lib/api'
import type { CandidateGroup } from './CandidateGroupCard'

interface CandidateModalProps {
  group: CandidateGroup | null
  selectedSession: InterviewListItem | null
  onSelectSession: (sessionId: string) => void
  onClose: () => void
  disabled?: boolean
}

function scoreTone(score: number | null): string {
  if (score === null) return 'text-fg-muted'
  if (score >= 4) return 'text-success-700 dark:text-success-500'
  if (score >= 3) return 'text-warning-700 dark:text-warning-500'
  return 'text-danger-700 dark:text-danger-500'
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Unknown date'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CandidateModal({
  group,
  selectedSession,
  onSelectSession,
  onClose,
  disabled = false,
}: CandidateModalProps) {
  useEffect(() => {
    if (!group) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [group, onClose])

  useEffect(() => {
    if (!group) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [group])

  return (
    <AnimatePresence>
      {group && (
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
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-surface-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-modal-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-accent-50/60 to-transparent px-6 py-4 dark:from-accent-500/10">
              <div className="min-w-0 flex-1">
                <h2
                  id="candidate-modal-title"
                  className="truncate text-lg font-semibold text-fg-strong"
                >
                  {group.name}
                </h2>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {group.email}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-300">
                  {group.sessions.length} interview
                  {group.sessions.length === 1 ? '' : 's'} · Pick one to
                  compare
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-chip hover:text-fg-strong"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {group.sessions.map((session, index) => {
                  const isSelected = selectedSession?.id === session.id
                  const isLatest = index === 0
                  return (
                    <li key={session.id}>
                      <div
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3 transition-all',
                          isSelected
                            ? 'border-accent-500 bg-accent-50/60 ring-1 ring-accent-500/30 dark:bg-accent-500/10'
                            : 'border-line bg-surface-card hover:border-accent-300',
                        )}
                      >
                        <label className="flex flex-1 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelectSession(session.id)}
                            disabled={disabled}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                              isSelected
                                ? 'border-accent-500 bg-accent-500 text-white'
                                : 'border-line-strong bg-surface-card',
                            )}
                          >
                            <svg
                              viewBox="0 0 12 12"
                              fill="none"
                              className={cn(
                                'h-3 w-3',
                                !isSelected && 'opacity-0',
                              )}
                            >
                              <path
                                d="M2 6l3 3 5-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-fg-strong">
                                {formatDateTime(session.completedAt)}
                              </span>
                              {isLatest && (
                                <span className="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success-700 dark:bg-success-500/10 dark:text-success-500">
                                  Latest
                                </span>
                              )}
                              <span
                                className={cn(
                                  'ml-auto text-sm font-bold tabular-nums',
                                  scoreTone(session.overallScore),
                                )}
                              >
                                {session.overallScore?.toFixed(1) ?? '—'} / 5
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-fg-muted">
                              <span className="inline-flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                {session.pendingDiscrepancies} pending
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {session.skillGaps} gaps
                              </span>
                            </div>
                          </div>
                        </label>

                        {/* Dashboard link — opens in new tab */}
                        <a
                          href={`/dashboard/${session.id}/overview`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 self-center rounded-lg p-2 text-fg-muted transition-colors hover:bg-chip hover:text-accent-700 dark:hover:text-accent-300"
                          aria-label={`View dashboard for ${formatDateTime(
                            session.completedAt,
                          )} (opens in a new tab)`}
                          title="Open dashboard in a new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line bg-chip/40 px-6 py-3">
              <p className="text-xs text-fg-muted">
                {selectedSession
                  ? `Selected: ${formatDateTime(selectedSession.completedAt)}`
                  : 'Pick one interview to compare'}
              </p>
              <Button size="sm" variant="secondary" onClick={onClose}>
                Done
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}