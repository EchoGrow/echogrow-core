import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Flag,
  Info,
  StickyNote,
  GitCompare,
  Lightbulb,
  CheckCircle,
  XOctagon,
  HelpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import wordsToNumbers from '@lilac-labs/words-to-numbers'
import { cn } from '../../lib/cn'
import { Button, Card, Textarea, toast } from '../ui'
import type {
  DiscrepancyRecord,
  DiscrepancyStatus,
  DiscrepancySeverity,
} from '../../lib/api'
import { fadeUp } from '../../lib/animations'

// ============================================================
// Status styles
// ============================================================
const STATUS_STYLES: Record<
  DiscrepancyStatus,
  { label: string; badge: string; dot: string; border: string; icon: LucideIcon }
> = {
  pending: {
    label: 'Pending review',
    badge:
      'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    dot: 'bg-warning-500',
    border: 'border-warning-500/20',
    icon: AlertTriangle,
  },
  confirmed: {
    label: 'Confirmed',
    badge:
      'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    dot: 'bg-success-500',
    border: 'border-success-500/20',
    icon: CheckCircle2,
  },
  dismissed: {
    label: 'Dismissed',
    badge: 'border-line bg-chip text-fg-muted',
    dot: 'bg-fg-muted/50',
    border: 'border-line',
    icon: XCircle,
  },
}

// ============================================================
// Severity styles
// ============================================================
const SEVERITY_STYLES: Record<
  DiscrepancySeverity,
  { label: string; badge: string; icon: LucideIcon }
> = {
  high: {
    label: 'High severity',
    badge:
      'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
    icon: Flag,
  },
  medium: {
    label: 'Medium severity',
    badge:
      'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    icon: Info,
  },
  low: {
    label: 'Low severity',
    badge: 'border-line bg-chip text-fg-muted',
    icon: CheckCircle2,
  },
}

const MAX_NOTE_LENGTH = 1000

function confidencePercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getBestText(primary: string, quote?: string): string {
  if (quote && quote.trim().length > 10) return quote
  return primary
}

// ============================================================
// Issue #75: Difference computation (using words-to-numbers)
// ============================================================

/**
 * Extracts all numbers (digits + number words) from a string.
 * Uses the words-to-numbers library to handle "six", "twenty-five", etc.
 */
function extractNumbers(text: string): number[] {
  const numbers: number[] = []

  // 1. Extract numeric digits (e.g., "4", "2022")
  const digitMatches = text.match(/\d+(\.\d+)?/g)
  if (digitMatches) {
    for (const m of digitMatches) {
      const n = parseFloat(m)
      if (!isNaN(n)) numbers.push(n)
    }
  }

  // 2. Extract number words using the library.
  // The library replaces number words with digits in the string.
  try {
    const converted = wordsToNumbers(text)
    
    // The library can return a string or a number.
    // If it returns a number directly (e.g., input was just "six")
    if (typeof converted === 'number') {
      if (!numbers.includes(converted)) {
        numbers.push(converted)
      }
    } 
    // If it returns a string with digits injected
    else if (typeof converted === 'string') {
      const convertedMatches = converted.match(/\d+(\.\d+)?/g)
      if (convertedMatches) {
        for (const m of convertedMatches) {
          const n = parseFloat(m)
          // Avoid duplicates (e.g., if the original text already had "4")
          if (!isNaN(n) && !numbers.includes(n)) {
            numbers.push(n)
          }
        }
      }
    }
  } catch {
    // If the library fails for any reason, fall back to the digits we already have.
  }

  return numbers
}

function computeDifference(
  cvSays: string,
  interviewSays: string,
): { text: string; tone: 'danger' | 'warning' | 'neutral' } | null {
  const cv = cvSays.trim()
  const iv = interviewSays.trim()

  // 1. Numeric difference (digits + number words)
  const cvNumbers = extractNumbers(cv)
  const ivNumbers = extractNumbers(iv)

  if (cvNumbers.length > 0 && ivNumbers.length > 0) {
    for (const cvNum of cvNumbers) {
      for (const ivNum of ivNumbers) {
        if (cvNum !== ivNum) {
          const diff = Math.abs(ivNum - cvNum)
          // Ignore years (2022 vs 2024) in numeric comparison — handled below
          const isYear = cvNum >= 1900 && cvNum <= 2100
          if (!isYear) {
            return {
              text: `Numeric difference: ${cvNum} (CV) vs. ${ivNum} (Interview) — difference of ${diff}.`,
              tone: diff > 2 ? 'danger' : 'warning',
            }
          }
        }
      }
    }
  }

  // 2. Role/title mismatch keywords
  const roleKeywords = [
    'lead',
    'manager',
    'senior',
    'junior',
    'contributor',
    'architect',
    'head',
    'director',
    'principal',
    'intern',
    'individual contributor',
    'team lead',
    'engineering manager',
  ]
  const cvRoles = roleKeywords.filter((k) => cv.toLowerCase().includes(k))
  const ivRoles = roleKeywords.filter((k) => iv.toLowerCase().includes(k))

  if (cvRoles.length > 0 || ivRoles.length > 0) {
    if (
      cvRoles.length === 0 ||
      ivRoles.length === 0 ||
      !cvRoles.some((r) => ivRoles.includes(r))
    ) {
      return {
        text: `Role mismatch: "${cv.slice(0, 80)}${cv.length > 80 ? '…' : ''}" (CV) vs. "${iv.slice(0, 80)}${iv.length > 80 ? '…' : ''}" (Interview).`,
        tone: 'danger',
      }
    }
  }

  // 3. Time/date mismatch (years)
  const cvYears = cv.match(/\b(20\d{2}|19\d{2})\b/g)
  const ivYears = iv.match(/\b(20\d{2}|19\d{2})\b/g)

  if (cvYears && ivYears && cvYears[0] !== ivYears[0]) {
    return {
      text: `Date mismatch: ${cvYears[0]} (CV) vs. ${ivYears[0]} (Interview).`,
      tone: 'warning',
    }
  }

  // 4. Fallback: generic difference
  if (cv.toLowerCase() !== iv.toLowerCase()) {
    return {
      text: 'The CV and the interview contain different statements for this field.',
      tone: 'neutral',
    }
  }

  return null
}

// ============================================================
// Issue #75: Recommendation based on confidence
// ============================================================
function getRecommendation(confidence: number): {
  text: string
  tone: 'success' | 'warning' | 'danger'
  icon: LucideIcon
} {
  if (confidence >= 0.8) {
    return {
      text: 'High confidence — recommend confirming this discrepancy.',
      tone: 'success',
      icon: CheckCircle,
    }
  }
  if (confidence >= 0.5) {
    return {
      text: 'Medium confidence — review the quotes carefully before confirming.',
      tone: 'warning',
      icon: HelpCircle,
    }
  }
  return {
    text: 'Low confidence — consider dismissing this discrepancy.',
    tone: 'danger',
    icon: XOctagon,
  }
}

// ============================================================
// Props
// ============================================================
export interface DiscrepancyDetailProps {
  discrepancy: DiscrepancyRecord
  onStatusChange?: (
    id: string,
    status: DiscrepancyStatus,
    reviewerNotes?: string,
  ) => void | Promise<void>
  className?: string
}

// ============================================================
// Component
// ============================================================
export function DiscrepancyDetail({
  discrepancy,
  onStatusChange,
  className,
}: DiscrepancyDetailProps) {
  const [expanded, setExpanded] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState('')
  const [pendingAction, setPendingAction] = useState<
    'confirmed' | 'dismissed' | null
  >(null)
  const [submitting, setSubmitting] = useState(false)

  const normalizedStatus =
    (discrepancy.status?.toLowerCase() as DiscrepancyStatus) || 'pending'
  const isPending = normalizedStatus === 'pending'
  const statusStyle = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.pending
  const StatusIcon = statusStyle.icon

  const severity: DiscrepancySeverity = discrepancy.severity ?? 'medium'
  const severityStyle = SEVERITY_STYLES[severity]
  const SeverityIcon = severityStyle.icon

  const bestCvText = getBestText(discrepancy.cvSays, discrepancy.cvQuote)
  const bestInterviewText = getBestText(
    discrepancy.interviewSays,
    discrepancy.interviewQuote,
  )

  const hasDifferentQuotes =
    (discrepancy.cvQuote &&
      discrepancy.cvQuote.trim() !== discrepancy.cvSays.trim()) ||
    (discrepancy.interviewQuote &&
      discrepancy.interviewQuote.trim() !== discrepancy.interviewSays.trim())

  // Issue #75: compute difference + recommendation
  const difference = computeDifference(
    discrepancy.cvSays,
    discrepancy.interviewSays,
  )
  const recommendation = getRecommendation(discrepancy.confidence)
  const RecIcon = recommendation.icon

  const handleActionClick = (action: 'confirmed' | 'dismissed') => {
    setPendingAction(action)
    setShowNoteInput(true)
  }

  const handleCancelNote = () => {
    setShowNoteInput(false)
    setPendingAction(null)
    setNote('')
  }

  const handleSubmitWithNote = async () => {
    if (!pendingAction || !onStatusChange) return

    setSubmitting(true)
    try {
      const trimmedNote = note.trim()
      await onStatusChange(
        discrepancy.id,
        pendingAction,
        trimmedNote || undefined,
      )
      toast.success(
        pendingAction === 'confirmed'
          ? 'Discrepancy confirmed'
          : 'Discrepancy dismissed',
        {
          description: trimmedNote
            ? 'Your note has been saved.'
            : 'Decision saved.',
        },
      )
      setShowNoteInput(false)
      setPendingAction(null)
      setNote('')
    } catch (cause) {
      toast.error('Could not save the decision', {
        description:
          cause instanceof Error ? cause.message : 'Unknown error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={fadeUp}>
      <Card
        className={cn(
          'group relative flex flex-col gap-5 overflow-hidden p-5 transition-all duration-300 sm:p-6',
          'hover:shadow-lift hover:border-line-strong',
          statusStyle.border,
          className,
        )}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-1.5 transition-all duration-300 group-hover:w-2',
            statusStyle.dot,
          )}
        />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 pl-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
              Discrepancy
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-fg-strong sm:text-lg">
              {discrepancy.field.replace(/_/g, ' ')}
            </h3>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                severityStyle.badge,
              )}
              aria-label={`Severity: ${severityStyle.label}`}
            >
              <SeverityIcon className="h-3.5 w-3.5" />
              {severityStyle.label}
            </span>

            <span className="rounded-lg bg-chip px-2.5 py-1 text-xs font-semibold tabular-nums text-fg-strong transition-colors group-hover:bg-navy-100 dark:group-hover:bg-navy-800">
              {confidencePercent(discrepancy.confidence)} confidence
            </span>

            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-transform duration-300 group-hover:scale-105',
                statusStyle.badge,
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Side-by-side quotes */}
        <div className="grid gap-4 pl-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3 transition-colors duration-300 hover:border-accent-300">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-accent-600" />
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                CV says
              </p>
            </div>
            <p className="text-sm leading-relaxed text-fg-strong">
              "{bestCvText}"
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3 transition-colors duration-300 hover:border-warning-300">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-warning-600" />
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                Interview says
              </p>
            </div>
            <p className="text-sm leading-relaxed text-fg-strong">
              "{bestInterviewText}"
            </p>
          </div>
        </div>

        {/* Show reasoning toggle */}
        <div className="pl-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="group/btn inline-flex items-center gap-2 rounded-lg bg-chip px-3 py-1.5 text-xs font-semibold text-fg-strong transition-all hover:bg-navy-100 dark:hover:bg-navy-800"
          >
            <Lightbulb className="h-3.5 w-3.5 text-accent-600" />
            {expanded ? 'Hide reasoning' : 'Show reasoning'}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-300',
                expanded && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  {/* Issue #75: Recommendation */}
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed',
                      recommendation.tone === 'success'
                        ? 'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500'
                        : recommendation.tone === 'warning'
                          ? 'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500'
                          : 'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
                    )}
                  >
                    <RecIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold">Recommendation: </span>
                      {recommendation.text}
                    </span>
                  </div>

                  {/* Issue #75: Difference */}
                  {difference ? (
                    <div
                      className={cn(
                        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed',
                        difference.tone === 'danger'
                          ? 'border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500'
                          : difference.tone === 'warning'
                            ? 'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500'
                            : 'border-line bg-chip text-fg-muted',
                      )}
                    >
                      <GitCompare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-semibold">Difference: </span>
                        {difference.text}
                      </span>
                    </div>
                  ) : null}

                  {/* Full quotes (only if different from summary) */}
                  {hasDifferentQuotes && discrepancy.cvQuote &&
                  discrepancy.cvQuote.trim() !== bestCvText.trim() ? (
                    <blockquote className="rounded-r-lg border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                      <span className="mb-1 block text-xs font-semibold not-italic text-fg-muted uppercase tracking-wider">
                        Full CV quote
                      </span>
                      "{discrepancy.cvQuote}"
                    </blockquote>
                  ) : null}

                  {hasDifferentQuotes && discrepancy.interviewQuote &&
                  discrepancy.interviewQuote.trim() !==
                    bestInterviewText.trim() ? (
                    <blockquote className="rounded-r-lg border-l-4 border-warning-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                      <span className="mb-1 block text-xs font-semibold not-italic text-fg-muted uppercase tracking-wider">
                        Full interview quote
                      </span>
                      "{discrepancy.interviewQuote}"
                    </blockquote>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Existing reviewer note (read-only) */}
        {discrepancy.reviewerNotes && !showNoteInput ? (
          <div className="pl-3">
            <div className="rounded-lg border border-line bg-chip/60 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote className="h-3.5 w-3.5 text-accent-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Reviewer note
                </span>
              </div>
              <p className="text-sm leading-relaxed text-fg">
                {discrepancy.reviewerNotes}
              </p>
            </div>
          </div>
        ) : null}

        {/* Note input (shown when action clicked) */}
        <AnimatePresence initial={false}>
          {showNoteInput && isPending ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden pl-3"
            >
              <div className="rounded-xl border border-accent-500/30 bg-accent-50/40 p-4 dark:bg-accent-500/5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor={`note-${discrepancy.id}`}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-strong"
                  >
                    <StickyNote className="h-3.5 w-3.5 text-accent-600" />
                    Reviewer note (optional)
                  </label>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      note.length >= MAX_NOTE_LENGTH - 50
                        ? 'font-semibold text-warning-700 dark:text-warning-500'
                        : 'text-fg-muted',
                    )}
                  >
                    {note.length} / {MAX_NOTE_LENGTH}
                  </span>
                </div>

                <Textarea
                  id={`note-${discrepancy.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                  placeholder={`Why are you ${
                    pendingAction === 'confirmed' ? 'confirming' : 'dismissing'
                  } this discrepancy? (optional)`}
                  maxLength={MAX_NOTE_LENGTH}
                  disabled={submitting}
                  className="min-h-[80px] bg-surface-card"
                />

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelNote}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant={pendingAction === 'confirmed' ? 'primary' : 'secondary'}
                    onClick={handleSubmitWithNote}
                    loading={submitting}
                    disabled={submitting}
                  >
                    {pendingAction === 'confirmed' ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Confirm
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Dismiss
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pl-3 pt-1">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleActionClick('confirmed')}
            disabled={!isPending || !onStatusChange || showNoteInput || submitting}
            className={cn(
              'transition-all duration-200 active:scale-95',
              (!isPending || showNoteInput) && 'opacity-50',
            )}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Confirm
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleActionClick('dismissed')}
            disabled={!isPending || !onStatusChange || showNoteInput || submitting}
            className={cn(
              'transition-all duration-200 active:scale-95',
              (!isPending || showNoteInput) && 'opacity-50',
            )}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Dismiss
          </Button>

          {!isPending ? (
            <span className="text-xs font-medium text-fg-muted bg-chip px-2 py-1 rounded-md">
              Already reviewed
            </span>
          ) : null}
        </div>
      </Card>
    </motion.div>
  )
}

export default DiscrepancyDetail