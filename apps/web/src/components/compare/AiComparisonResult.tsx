import { motion } from 'framer-motion'
import {
  Award,
  BarChart3,
  CheckCircle2,
  Flag,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Card } from '../ui'
import { cn } from '../../lib/cn'
import { fadeUp, staggerContainer } from '../../lib/animations'
import type { ComparisonResult } from '../../lib/api'

interface AiComparisonResultProps {
  result: ComparisonResult
}

function confidenceTone(confidence: number): { label: string; className: string } {
  if (confidence >= 0.8)
    return {
      label: 'High confidence',
      className:
        'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500 border-success-500/30',
    }
  if (confidence >= 0.5)
    return {
      label: 'Medium confidence',
      className:
        'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500 border-warning-500/30',
    }
  return {
    label: 'Low confidence',
    className:
      'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500 border-danger-500/30',
  }
}

export function AiComparisonResult({ result }: AiComparisonResultProps) {
  const confidence = confidenceTone(result.confidence)

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* AI Summary */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line bg-gradient-to-r from-accent-50/60 to-transparent px-6 py-4 dark:from-accent-500/10">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-700 ring-1 ring-accent-500/20 dark:text-accent-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-fg-strong">
                  AI Comparison
                </h2>
                <p className="text-xs text-fg-muted">
                  Simulating Agent David's matching logic · Powered by AI
                </p>
              </div>
              <span
                className={cn(
                  'ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                  confidence.className,
                )}
              >
                {confidence.label} · {Math.round(result.confidence * 100)}%
              </span>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm leading-relaxed text-fg">{result.summary}</p>
            {result.targetRole && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1 text-xs font-medium text-fg-muted">
                <Award className="h-3 w-3" />
                Evaluated for:{' '}
                <strong className="text-fg-strong">{result.targetRole}</strong>
              </p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Ranking */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line bg-gradient-to-r from-chip/50 to-transparent px-6 py-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent-600 dark:text-accent-400" />
              <h2 className="text-base font-semibold text-fg-strong">Ranking</h2>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {result.ranking.map((r) => (
              <li key={r.interviewId} className="flex items-start gap-4 p-5">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold tabular-nums',
                    r.rank === 1
                      ? 'bg-gradient-to-br from-success-500 to-success-700 text-white shadow-md'
                      : r.rank === 2
                        ? 'bg-warning-500/15 text-warning-700 dark:text-warning-500'
                        : 'bg-chip text-fg-muted',
                  )}
                >
                  #{r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-fg-strong">
                      {r.candidateName}
                    </h3>
                    {typeof r.fitScore === 'number' && (
                      <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
                        {r.fitScore}% fit
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                    {r.reason}
                  </p>
                  <a
                    href={`/dashboard/${r.interviewId}/overview`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300"
                  >
                    View full report →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* Per-dimension winners */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line bg-gradient-to-r from-chip/50 to-transparent px-6 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
              <h2 className="text-base font-semibold text-fg-strong">
                Best candidate per dimension
              </h2>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {result.perDimensionWinners.map((d) => (
              <li key={d.dimension} className="flex items-start gap-4 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-700 dark:text-accent-300">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    {d.dimension}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-fg-strong">
                    {d.winnerName}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                    {d.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* Strengths & Concerns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={fadeUp}>
          <Card className="h-full overflow-hidden p-0">
            <div className="border-b border-line bg-gradient-to-r from-success-50/60 to-transparent px-6 py-4 dark:from-success-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-700 dark:text-success-500" />
                <h2 className="text-base font-semibold text-fg-strong">
                  Strengths
                </h2>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {result.strengths.map((s) => (
                <div key={s.interviewId}>
                  <h3 className="text-sm font-semibold text-fg-strong">
                    {s.candidateName}
                  </h3>
                  <ul className="mt-1.5 space-y-1">
                    {s.points.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full overflow-hidden p-0">
            <div className="border-b border-line bg-gradient-to-r from-warning-50/60 to-transparent px-6 py-4 dark:from-warning-500/10">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-warning-700 dark:text-warning-500" />
                <h2 className="text-base font-semibold text-fg-strong">
                  Concerns
                </h2>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {result.concerns.map((c) => (
                <div key={c.interviewId}>
                  <h3 className="text-sm font-semibold text-fg-strong">
                    {c.candidateName}
                  </h3>
                  <ul className="mt-1.5 space-y-1">
                    {c.points.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recommendation */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-accent-500/30 bg-gradient-to-br from-accent-50/60 to-surface-card p-6 dark:from-accent-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-fg-strong">
                Recommendation
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-fg">
                {result.recommendation}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}