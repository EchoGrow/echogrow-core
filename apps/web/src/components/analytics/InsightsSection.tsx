import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  Info,
  Layers,
  Lightbulb,
  Target,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card } from '../ui'
import { fadeUp } from '../../lib/animations'
import { cn } from '../../lib/cn'
import type {
  AnalyticsSummary,
  AnalyticsDetailType,
} from '@echogrow/shared'

// ============================================================
// Types
// ============================================================

type Priority = 'critical' | 'warning' | 'info' | 'success'

interface Insight {
  id: string
  priority: Priority
  icon: LucideIcon
  category: string
  observation: string
  recommendation: string
  steps: string[]
  modalType?: AnalyticsDetailType
  ctaLabel?: string
}

// ============================================================
// Priority Styles — enhanced for BOTH light and dark mode
// ============================================================

const PRIORITY_STYLES: Record<
  Priority,
  {
    label: string
    border: string
    bg: string
    text: string
    badge: string
    iconBg: string
    iconText: string
    stepBadge: string
    accentBar: string
    hoverShadow: string
  }
> = {
  critical: {
    label: 'Critical',
    border:
      'border-l-4 border-l-danger-500 border border-danger-500/30 dark:border-danger-500/40',
    bg: 'bg-danger-50/80 dark:bg-danger-500/10',
    text: 'text-danger-900 dark:text-danger-200',
    badge: 'bg-danger-500 text-white dark:bg-danger-600',
    iconBg: 'bg-danger-500/20 dark:bg-danger-500/25',
    iconText: 'text-danger-700 dark:text-danger-300',
    stepBadge: 'bg-danger-500 text-white dark:bg-danger-600',
    accentBar: 'bg-danger-500',
    hoverShadow: 'hover:shadow-[0_8px_30px_-12px_rgba(239,68,68,0.35)]',
  },
  warning: {
    label: 'Warning',
    border:
      'border-l-4 border-l-warning-500 border border-warning-500/30 dark:border-warning-500/40',
    bg: 'bg-warning-50/80 dark:bg-warning-500/10',
    text: 'text-warning-900 dark:text-warning-200',
    badge: 'bg-warning-500 text-white dark:bg-warning-600',
    iconBg: 'bg-warning-500/20 dark:bg-warning-500/25',
    iconText: 'text-warning-700 dark:text-warning-300',
    stepBadge: 'bg-warning-500 text-white dark:bg-warning-600',
    accentBar: 'bg-warning-500',
    hoverShadow: 'hover:shadow-[0_8px_30px_-12px_rgba(234,179,8,0.35)]',
  },
  info: {
    label: 'Info',
    border:
      'border-l-4 border-l-accent-500 border border-accent-500/30 dark:border-accent-500/40',
    bg: 'bg-accent-50/80 dark:bg-accent-500/10',
    text: 'text-accent-900 dark:text-accent-200',
    badge: 'bg-accent-500 text-white dark:bg-accent-600',
    iconBg: 'bg-accent-500/20 dark:bg-accent-500/25',
    iconText: 'text-accent-700 dark:text-accent-300',
    stepBadge: 'bg-accent-500 text-white dark:bg-accent-600',
    accentBar: 'bg-accent-500',
    hoverShadow: 'hover:shadow-[0_8px_30px_-12px_rgba(34,169,133,0.35)]',
  },
  success: {
    label: 'Good',
    border:
      'border-l-4 border-l-success-500 border border-success-500/30 dark:border-success-500/40',
    bg: 'bg-success-50/80 dark:bg-success-500/10',
    text: 'text-success-900 dark:text-success-200',
    badge: 'bg-success-500 text-white dark:bg-success-600',
    iconBg: 'bg-success-500/20 dark:bg-success-500/25',
    iconText: 'text-success-700 dark:text-success-300',
    stepBadge: 'bg-success-500 text-white dark:bg-success-600',
    accentBar: 'bg-success-500',
    hoverShadow: 'hover:shadow-[0_8px_30px_-12px_rgba(34,197,94,0.35)]',
  },
}

// ============================================================
// Insight Generation Rules
// ============================================================

function generateInsights(data: AnalyticsSummary): Insight[] {
  const insights: Insight[] = []
  const { kpis, charts } = data

  // RULE 1: No data
  if (kpis.totalInterviews === 0) {
    insights.push({
      id: 'no-data',
      priority: 'info',
      icon: Info,
      category: 'Getting started',
      observation: 'No interviews have been processed in the selected range.',
      recommendation:
        'Upload your first interview to start generating insights.',
      steps: [
        'Go to the Upload page.',
        'Provide a transcript and a resume.',
        'Wait for the pipeline to complete (usually 1-3 minutes).',
      ],
      ctaLabel: 'Go to Upload',
    })
    return insights
  }

  // RULE 2: Completion rate CRITICAL (< 40%)
  if (kpis.completionRate < 40) {
    insights.push({
      id: 'completion-critical',
      priority: 'critical',
      icon: AlertCircle,
      category: 'Pipeline health',
      observation: `Completion rate is critically low at ${kpis.completionRate}% (${kpis.completedInterviews}/${kpis.totalInterviews}). ${kpis.failedInterviews} failed, ${kpis.needsReviewInterviews} need review.`,
      recommendation:
        'Investigate systemic failures before scaling. Most interviews are not producing a scorecard.',
      steps: [
        'Open the "Failed" filter to see which interviews failed.',
        'Check LLM timeout errors (some interviews take > 1000s).',
        'Verify JSON schema validation — a malformed LLM response will fail the pipeline.',
        'Re-run failed interviews with the Retry button (force evaluation).',
      ],
      modalType: 'interviews',
      ctaLabel: 'View all interviews',
    })
  } else if (kpis.completionRate < 70) {
    insights.push({
      id: 'completion-warning',
      priority: 'warning',
      icon: AlertTriangle,
      category: 'Pipeline health',
      observation: `Completion rate is ${kpis.completionRate}% (${kpis.completedInterviews}/${kpis.totalInterviews}). ${kpis.failedInterviews} failed, ${kpis.needsReviewInterviews} need review.`,
      recommendation:
        'Investigate failed interviews to identify recurring issues.',
      steps: [
        'Review failed interviews and their error messages.',
        'Re-run interviews that failed due to transient LLM errors.',
        'If failures are frequent, consider raising the retry count or switching to a more reliable model.',
      ],
      modalType: 'interviews',
      ctaLabel: 'View interviews',
    })
  } else {
    insights.push({
      id: 'completion-healthy',
      priority: 'success',
      icon: CheckCircle2,
      category: 'Pipeline health',
      observation: `Completion rate is healthy at ${kpis.completionRate}% (${kpis.completedInterviews}/${kpis.totalInterviews}).`,
      recommendation:
        'The pipeline is stable. Continue monitoring as you scale.',
      steps: [
        'Keep an eye on LLM latency as volume grows.',
        'Periodically re-run the golden dataset to catch silent model changes.',
      ],
      modalType: 'completion-breakdown',
      ctaLabel: 'View breakdown',
    })
  }

  // RULE 5: Needs review > 0
  if (kpis.needsReviewInterviews > 0) {
    insights.push({
      id: 'needs-review',
      priority: 'warning',
      icon: AlertTriangle,
      category: 'Human review',
      observation: `${kpis.needsReviewInterviews} interview${kpis.needsReviewInterviews === 1 ? '' : 's'} require human review (low-confidence transcripts).`,
      recommendation:
        'These interviews cannot be scored automatically. A human must review the transcript before continuing.',
      steps: [
        'Open the "Needs review" queue.',
        'Read the transcript and decide: proceed with scoring, or reject and request a re-upload.',
        'Proceeding with scoring will send the interview back to the pipeline.',
      ],
      modalType: 'needs-review',
      ctaLabel: 'Open review queue',
    })
  }

  // RULE 6: Top missing skill (recurring pattern)
  if (charts.topMissingSkills.length > 0 && kpis.completedInterviews > 0) {
    const top = charts.topMissingSkills[0]
    const ratio = top.count / kpis.completedInterviews

    if (ratio >= 0.3) {
      insights.push({
        id: 'top-skill',
        priority: 'info',
        icon: Target,
        category: 'Skill gaps',
        observation: `"${top.skill}" appears in ${top.count} of ${kpis.completedInterviews} completed interviews (${Math.round(ratio * 100)}%).`,
        recommendation:
          'This is a recurring gap. Consider adding a dedicated upskilling module for this skill.',
        steps: [
          `Add "${top.skill}" to your upskilling library.`,
          'Create a 2-3 week module with vetted resources (official docs, tutorials).',
          'Assign it to the candidates who lack this skill (see Skills detail).',
        ],
        modalType: 'skills',
        ctaLabel: 'View affected candidates',
      })
    }
  }

  // RULE 7: Multiple skills repeat
  const repeatedSkills = charts.topMissingSkills.filter((s) => s.count >= 2)
  if (repeatedSkills.length >= 2) {
    insights.push({
      id: 'repeated-skills',
      priority: 'info',
      icon: Layers,
      category: 'Skill gaps',
      observation: `${repeatedSkills.length} skills appear 2+ times across candidates: ${repeatedSkills
        .slice(0, 3)
        .map((s) => `"${s.skill}" (${s.count}×)`)
        .join(', ')}.`,
      recommendation:
        'These are the most impactful areas for upskilling content investment.',
      steps: [
        'Prioritize skills with the highest count.',
        'Group related skills into a single learning path (e.g., "Database Mastery" combining SQL Indexing + B-Trees + Performance).',
        'Track completion rates per module after launch.',
      ],
      modalType: 'skills',
      ctaLabel: 'View skill details',
    })
  }

  // RULE 8/9: Top discrepancy
  const topDiscrepancy = charts.topDiscrepancyClaims[0]
  if (topDiscrepancy && topDiscrepancy.highSeverityCount > 0) {
    insights.push({
      id: 'discrepancy-high',
      priority: 'warning',
      icon: Flag,
      category: 'Claim verification',
      observation: `"${topDiscrepancy.claim}" is the most frequent discrepancy (${topDiscrepancy.count}×), with ${topDiscrepancy.highSeverityCount} high-severity flag${topDiscrepancy.highSeverityCount === 1 ? '' : 's'}.`,
      recommendation:
        'High-severity discrepancies suggest candidates may be exaggerating in interviews. Review your screening questions.',
      steps: [
        'Review the flagged discrepancies in the Claim Verification tab.',
        'Update interview questions to probe deeper into these areas.',
        'Consider adding a verification step (e.g., reference check) for high-severity claims.',
      ],
      modalType: 'discrepancies',
      ctaLabel: 'View discrepancies',
    })
  } else if (topDiscrepancy && topDiscrepancy.count >= 3) {
    insights.push({
      id: 'discrepancy-frequent',
      priority: 'info',
      icon: Flag,
      category: 'Claim verification',
      observation: `"${topDiscrepancy.claim}" appears ${topDiscrepancy.count} times in discrepancies (mostly medium/low severity).`,
      recommendation:
        'This recurring pattern may indicate ambiguity in how candidates describe this area.',
      steps: [
        'Review discrepancies related to this claim.',
        'Clarify the wording in your screening questions or job descriptions.',
        'Consider rephrasing CV requirements to match common candidate phrasing.',
      ],
      modalType: 'discrepancies',
      ctaLabel: 'View discrepancies',
    })
  }

  // RULE 10: Lowest dimension
  const dims = charts.dimensionAverages
  const dimEntries = [
    { name: 'Technical Depth', value: dims.technicalDepth },
    { name: 'Communication', value: dims.communication },
    { name: 'Domain Experience', value: dims.domainExperience },
    { name: 'Problem Solving', value: dims.problemSolving },
  ]
  const lowest = dimEntries.reduce((min, d) => (d.value < min.value ? d : min))
  const highest = dimEntries.reduce((max, d) => (d.value > max.value ? d : max))

  if (lowest.value > 0 && highest.value - lowest.value >= 0.5) {
    insights.push({
      id: 'lowest-dimension',
      priority: 'info',
      icon: TrendingUp,
      category: 'Evaluation quality',
      observation: `"${lowest.name}" is the lowest-scoring dimension (avg ${lowest.value.toFixed(2)}/5) — ${(highest.value - lowest.value).toFixed(2)} points below "${highest.name}" (${highest.value.toFixed(2)}/5).`,
      recommendation: `Focus upskilling content on "${lowest.name}" — it's the weakest area across candidates.`,
      steps: [
        'Add domain-specific modules if "Domain Experience" is lowest (payments, logistics, etc.).',
        'Add communication training if "Communication" is lowest.',
        'Add technical deep-dive modules if "Technical Depth" is lowest.',
        'Update the screening rubric to test this dimension earlier.',
      ],
      modalType: 'scores',
      ctaLabel: 'View scores detail',
    })
  }

  // RULE 11: Slow processing
  if (kpis.avgProcessingTimeSeconds > 120) {
    const minutes = Math.round(kpis.avgProcessingTimeSeconds / 60)
    insights.push({
      id: 'slow-processing',
      priority: 'warning',
      icon: Clock,
      category: 'Pipeline performance',
      observation: `Average processing time is ${kpis.avgProcessingTimeSeconds}s (~${minutes} min). Some interviews may exceed 5 minutes.`,
      recommendation:
        'Investigate slow interviews. High processing time may indicate LLM retries or large transcripts.',
      steps: [
        'Open Processing Times detail to identify outliers.',
        'Check if slow interviews had LLM retries (rate limits, timeouts).',
        'Consider chunking very long transcripts or switching to a faster model.',
      ],
      modalType: 'processing-times',
      ctaLabel: 'View processing times',
    })
  } else if (
    kpis.avgProcessingTimeSeconds > 0 &&
    kpis.avgProcessingTimeSeconds < 30
  ) {
    insights.push({
      id: 'fast-processing',
      priority: 'success',
      icon: CheckCircle2,
      category: 'Pipeline performance',
      observation: `Average processing time is excellent (${kpis.avgProcessingTimeSeconds}s).`,
      recommendation:
        'The pipeline is performing well. Continue monitoring as data volume grows.',
      steps: [
        'No action required.',
        'Re-run the golden dataset periodically to detect silent regressions.',
      ],
      modalType: 'processing-times',
      ctaLabel: 'View processing times',
    })
  }

  // RULE 12: Retries detected
  if (kpis.retriedInterviews > 0) {
    const retryRate =
      kpis.completedInterviews > 0
        ? Math.round(
            (kpis.retriedInterviews / kpis.completedInterviews) * 100,
          )
        : 0

    insights.push({
      id: 'retries-detected',
      priority: retryRate > 20 ? 'warning' : 'info',
      icon: AlertTriangle,
      category: 'Pipeline reliability',
      observation: `${kpis.retriedInterviews} interview${kpis.retriedInterviews === 1 ? '' : 's'} required retries (avg ${kpis.avgProcessingAttempts} attempts per interview, ${retryRate}% retry rate).`,
      recommendation:
        retryRate > 20
          ? 'Retry rate is high. Investigate transient LLM errors (503/429) and consider a fallback provider.'
          : 'Retries are within normal range, but worth tracking as volume grows.',
      steps: [
        'Open Processing Times detail to inspect attempts per interview.',
        'Check if failures correlate with specific times of day (provider load).',
        'Consider adding a fallback model (e.g., Groq) for transient failures.',
      ],
      modalType: 'processing-times',
      ctaLabel: 'View processing details',
    })
  }

  // RULE 13: Time saved — uses ACTUAL averages from the pipeline
  // (mirrors the Processing Times modal, so numbers stay consistent)
  if (
    kpis.avgProcessingTimeSeconds > 0 &&
    kpis.avgManualReviewSeconds > 0 &&
    kpis.avgSavedSeconds > 0
  ) {
    const savedMinutes = Math.round(kpis.avgSavedSeconds / 60)
    const manualMinutes = Math.round(kpis.avgManualReviewSeconds / 60)
    const savedPercent = Math.round(
      (kpis.avgSavedSeconds / kpis.avgManualReviewSeconds) * 100,
    )

    insights.push({
      id: 'time-saved',
      priority: 'success',
      icon: CheckCircle2,
      category: 'ROI',
      observation: `Each interview saves ~${savedMinutes} min vs manual review (${manualMinutes} min manual vs ${kpis.avgProcessingTimeSeconds}s EchoGrow, ${savedPercent}% faster).`,
      recommendation:
        'EchoGrow is delivering significant time savings. Highlight this in your team reports.',
      steps: [
        'Export the report to share with stakeholders.',
        'Track time savings over time to quantify ROI.',
      ],
      modalType: 'processing-times',
      ctaLabel: 'View time savings',
    })
  }

  // RULE 14/15: Average score
  if (kpis.avgOverallScore > 0 && kpis.avgOverallScore < 3) {
    insights.push({
      id: 'low-average-score',
      priority: 'warning',
      icon: AlertTriangle,
      category: 'Candidate quality',
      observation: `Average overall score is ${kpis.avgOverallScore.toFixed(2)}/5 — below the 3/5 threshold.`,
      recommendation:
        'The current cohort is underperforming. Review screening criteria or candidate sources.',
      steps: [
        'Check which dimension is dragging the average down.',
        'Review the source of candidates (job boards, referrals, etc.).',
        'Consider strengthening pre-screening questions.',
      ],
      modalType: 'scores',
      ctaLabel: 'View score details',
    })
  } else if (kpis.avgOverallScore >= 4) {
    insights.push({
      id: 'high-average-score',
      priority: 'success',
      icon: CheckCircle2,
      category: 'Candidate quality',
      observation: `Average overall score is ${kpis.avgOverallScore.toFixed(2)}/5 — strong cohort.`,
      recommendation:
        'The current candidates are high-quality. Continue your sourcing strategy.',
      steps: [
        'Document what sources produced these candidates.',
        'Replicate the sourcing strategy for future cohorts.',
      ],
      modalType: 'scores',
      ctaLabel: 'View score details',
    })
  }

  // RULE 16: Rejected
  if (kpis.rejectedInterviews > 0) {
    insights.push({
      id: 'rejected',
      priority: 'info',
      icon: Info,
      category: 'Human review',
      observation: `${kpis.rejectedInterviews} interview${kpis.rejectedInterviews === 1 ? '' : 's'} were rejected during human review.`,
      recommendation:
        'Rejected interviews indicate low-quality transcripts. Review the rejection reasons.',
      steps: [
        'Open the interviews detail and filter by REJECTED.',
        'Review the rejection reasons (if logged).',
        'Consider adding a transcript quality check before submission.',
      ],
      modalType: 'interviews',
      ctaLabel: 'View rejected',
    })
  }

  return insights
}

// ============================================================
// Priority Order
// ============================================================

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
}

// ============================================================
// Insight Card
// ============================================================

function InsightCard({
  insight,
  onModalOpen,
}: {
  insight: Insight
  onModalOpen?: (type: AnalyticsDetailType) => void
}) {
  const styles = PRIORITY_STYLES[insight.priority]
  const Icon = insight.icon

  const handleCta = () => {
    if (!insight.modalType) return
    if (onModalOpen) {
      onModalOpen(insight.modalType)
    } else if (insight.modalType === 'interviews') {
      window.location.href = '/upload'
    }
  }

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'group relative flex h-full flex-col gap-3 rounded-xl p-4 transition-all',
        styles.border,
        styles.bg,
        styles.hoverShadow,
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <motion.span
          whileHover={{ scale: 1.08, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            styles.iconBg,
            styles.iconText,
          )}
        >
          <Icon className="h-4 w-4" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                styles.badge,
              )}
            >
              {styles.label}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              {insight.category}
            </span>
          </div>
          <p
            className={cn(
              'mt-1.5 text-start text-sm font-medium leading-relaxed',
              styles.text,
            )}
          >
            {insight.observation}
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="pl-12 text-start">
        <p className="text-xs leading-relaxed text-fg dark:text-fg-muted">
          <span className="font-semibold text-fg-strong">Recommendation: </span>
          {insight.recommendation}
        </p>
      </div>

      {/* Steps — centered number badges */}
      {insight.steps.length > 0 && (
        <div className="flex-1 pl-12 text-start">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            Steps
          </p>
          <ol className="space-y-1.5">
            {insight.steps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-start text-xs leading-relaxed text-fg dark:text-fg-muted"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                    styles.stepBadge,
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-start">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* CTA — always at the bottom */}
      {insight.modalType && (
        <div className="mt-auto flex justify-end pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCta}
            className="text-xs"
          >
            {insight.ctaLabel ?? 'View details'}
            <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}
    </motion.div>
  )
}

// ============================================================
// Main Component
// ============================================================

interface InsightsSectionProps {
  data: AnalyticsSummary
  onModalOpen?: (type: AnalyticsDetailType) => void
}

export function InsightsSection({ data, onModalOpen }: InsightsSectionProps) {
  const [showHelp, setShowHelp] = useState(false)

  const insights = useMemo(() => {
    const all = generateInsights(data)
    return all.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    )
  }, [data])

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, success: 0 }
    for (const i of insights) c[i.priority]++
    return c
  }, [insights])

  if (insights.length === 0) return null

  return (
    <motion.div variants={fadeUp}>
      <Card className="overflow-hidden p-0">
        {/* Header */}
        <div className="border-b border-line bg-gradient-to-r from-accent-50/60 to-transparent px-5 py-4 dark:from-accent-500/10 dark:to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ rotate: 12, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/15 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
              >
                <Lightbulb className="h-4 w-4" />
              </motion.div>
              <div>
                <h2 className="text-sm font-semibold text-fg-strong">
                  Insights
                </h2>
                <p className="text-xs text-fg-muted">
                  {insights.length} observation
                  {insights.length === 1 ? '' : 's'} from your data
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {counts.critical > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-danger-500/15 px-2 py-0.5 text-[10px] font-semibold text-danger-700 dark:bg-danger-500/20 dark:text-danger-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-danger-500" />
                  {counts.critical} critical
                </motion.span>
              )}
              {counts.warning > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1 rounded-full bg-warning-500/15 px-2 py-0.5 text-[10px] font-semibold text-warning-700 dark:bg-warning-500/20 dark:text-warning-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                  {counts.warning} warning
                </motion.span>
              )}
              {counts.info > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                  {counts.info} info
                </motion.span>
              )}
              {counts.success > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="inline-flex items-center gap-1 rounded-full bg-success-500/15 px-2 py-0.5 text-[10px] font-semibold text-success-700 dark:bg-success-500/20 dark:text-success-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  {counts.success} good
                </motion.span>
              )}

              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="rounded-md p-1 text-fg-muted transition-colors hover:bg-chip hover:text-fg-strong dark:hover:bg-navy-800"
                aria-label="How are these insights generated?"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cards — equal height via items-stretch + h-full on card */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
          initial="hidden"
          animate="visible"
          className="grid items-stretch gap-3 p-5 lg:grid-cols-2"
        >
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onModalOpen={onModalOpen}
            />
          ))}
        </motion.div>

        {/* Footer */}
        <div className="border-t border-line bg-chip/30 px-5 py-2 text-center dark:bg-navy-900/50">
          <p className="text-[10px] text-fg-muted">
            These insights are generated by deterministic rules — no AI is
            involved. They are based on the aggregated data above.
          </p>
        </div>
      </Card>

      {/* Help Modal — with animations */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-line bg-surface-card shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-accent-50/60 to-transparent px-6 py-5 dark:from-accent-500/10 dark:to-transparent">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/15 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
                    <Info className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-fg-strong">
                      How are these insights generated?
                    </h3>
                    <p className="text-[11px] text-fg-muted">
                      Deterministic rules, zero AI
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-chip hover:text-fg-strong dark:hover:bg-navy-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6 text-start text-xs leading-relaxed text-fg-muted">
                <p className="text-start leading-relaxed">
                  These insights are produced by{' '}
                  <strong className="text-fg-strong">
                    deterministic rules
                  </strong>{' '}
                  written in code — no AI is involved. Each rule checks a
                  specific condition on the aggregated data and, if triggered,
                  produces an observation with a recommendation and actionable
                  steps.
                </p>

                <div className="rounded-xl border border-line bg-chip/40 p-4 text-start">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    Example rules
                  </p>
                  <ul className="space-y-1.5 text-start text-xs leading-relaxed text-fg-muted">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                      <span>
                        If completion rate &lt; 40% → critical insight to
                        investigate failures.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                      <span>
                        If top skill appears in ≥ 30% of interviews →
                        recommend adding an upskilling module.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                      <span>
                        If retry rate &gt; 20% → recommend checking LLM
                        provider reliability.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                      <span>
                        If lowest dimension is ≥ 0.5 points below highest →
                        recommend focusing upskilling content.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-accent-500/30 bg-accent-50/60 p-4 text-start dark:border-accent-500/30 dark:bg-accent-500/10">
                  <p className="text-start text-xs font-semibold text-fg-strong">
                    Why not use AI for insights?
                  </p>
                  <p className="mt-1.5 text-start text-xs leading-relaxed text-fg-muted">
                    Because rules are faster, cheaper, deterministic, and fully
                    auditable. Every insight can be traced back to a specific
                    rule and a specific number in the data. AI would introduce
                    hallucination risk without adding much value at this scale.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}