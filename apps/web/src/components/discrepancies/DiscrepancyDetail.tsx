import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, MessageSquare, AlertTriangle, CheckCircle2, XCircle, ChevronDown, Quote } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button, Card } from '../ui'
import type { DiscrepancyRecord, DiscrepancyStatus } from '../../lib/api'
import { fadeUp } from '../../lib/animations'

const STATUS_STYLES: Record<
  DiscrepancyStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: 'Pending review',
    badge: 'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    dot: 'bg-warning-500',
    border: 'border-warning-500/20',
    icon: AlertTriangle,
  },
  confirmed: {
    label: 'Confirmed',
    badge: 'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
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

function confidencePercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// دالة مساعدة لاختيار أفضل نص للعرض (الاقتباس الحرفي أولاً)
function getBestText(primary: string, quote?: string): string {
  // إذا كان الاقتباس موجوداً وطويلاً بما يكفي، نستخدمه
  if (quote && quote.trim().length > 10) return quote
  return primary
}

export interface DiscrepancyDetailProps {
  discrepancy: DiscrepancyRecord
  onStatusChange?: (id: string, status: DiscrepancyStatus) => void
  className?: string
}

export function DiscrepancyDetail({
  discrepancy,
  onStatusChange,
  className,
}: DiscrepancyDetailProps) {
  const [expanded, setExpanded] = useState(false)
  
  const normalizedStatus = (discrepancy.status?.toLowerCase() as DiscrepancyStatus) || 'pending'
  const isPending = normalizedStatus === 'pending'
  const statusStyle = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.pending
  const StatusIcon = statusStyle.icon

  const handleConfirm = () => onStatusChange?.(discrepancy.id, 'confirmed')
  const handleDismiss = () => onStatusChange?.(discrepancy.id, 'dismissed')

  // نستخدم الاقتباس الحرفي إن وجد، وإلا نستخدم الملخص
  const bestCvText = getBestText(discrepancy.cvSays, discrepancy.cvQuote)
  const bestInterviewText = getBestText(discrepancy.interviewSays, discrepancy.interviewQuote)

  // نتحقق إذا كان الاقتباس مختلفاً عن الملخص (لكي نعرضه في قسم الأدلة)
  const hasDifferentQuotes = 
    (discrepancy.cvQuote && discrepancy.cvQuote.trim() !== discrepancy.cvSays.trim()) ||
    (discrepancy.interviewQuote && discrepancy.interviewQuote.trim() !== discrepancy.interviewSays.trim())

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

        <div className="grid gap-4 pl-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3 transition-colors duration-300 hover:border-accent-300">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-accent-600" />
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">CV says</p>
            </div>
            <p className="text-sm leading-relaxed text-fg-strong">“{bestCvText}”</p>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3 transition-colors duration-300 hover:border-warning-300">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-warning-600" />
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Interview says</p>
            </div>
            <p className="text-sm leading-relaxed text-fg-strong">“{bestInterviewText}”</p>
          </div>
        </div>

        {/* نعرض الأدلة فقط إذا كان الاقتباس مختلفاً عن الملخص */}
        {hasDifferentQuotes ? (
          <div className="pl-3">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="group/btn inline-flex items-center gap-2 rounded-lg bg-chip px-3 py-1.5 text-xs font-semibold text-fg-strong transition-all hover:bg-navy-100 dark:hover:bg-navy-800"
            >
              <Quote className="h-3.5 w-3.5 text-accent-600" />
              {expanded ? 'Hide evidence' : 'Show evidence'}
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
                    {/* نعرض الاقتباس فقط إذا كان مختلفاً عن النص المعروض */}
                    {discrepancy.cvQuote && discrepancy.cvQuote.trim() !== bestCvText.trim() ? (
                      <blockquote className="rounded-r-lg border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                        <span className="mb-1 block text-xs font-semibold not-italic text-fg-muted uppercase tracking-wider">
                          Full CV quote
                        </span>
                        “{discrepancy.cvQuote}”
                      </blockquote>
                    ) : null}
                    {discrepancy.interviewQuote && discrepancy.interviewQuote.trim() !== bestInterviewText.trim() ? (
                      <blockquote className="rounded-r-lg border-l-4 border-warning-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                        <span className="mb-1 block text-xs font-semibold not-italic text-fg-muted uppercase tracking-wider">
                          Full interview quote
                        </span>
                        “{discrepancy.interviewQuote}”
                      </blockquote>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pl-3 pt-1">
          <Button
            size="sm"
            variant="primary"
            onClick={handleConfirm}
            disabled={!isPending || !onStatusChange}
            className={cn(
              "transition-all duration-200 active:scale-95",
              !isPending && "opacity-50"
            )}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Confirm
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDismiss}
            disabled={!isPending || !onStatusChange}
            className={cn(
              "transition-all duration-200 active:scale-95",
              !isPending && "opacity-50"
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