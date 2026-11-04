import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Target, Flag, TrendingUp, ShieldCheck } from 'lucide-react'
import { SEO } from '../../components/SEO'
import { Alert, Button, Card, Spinner, toast } from '../../components/ui'
import { ReviewBanner } from '../../components/ui/ReviewBanner'
import { ProcessingState } from '../../components/dashboard/ProcessingState' // <--- استيراد المكون الجديد
import { useScorecard } from '../../lib/scorecard/useScorecard'
import type { ScorecardDimension } from '../../lib/api'
import { cn } from '../../lib/cn'
import { fadeUp, scaleIn, staggerContainer } from '../../lib/animations'

const MAX_SCORE = 5

type Tone = 'danger' | 'warning' | 'success'

const TONES: Record<Tone, { text: string; bg: string; stroke: string; bar: string; dot: string; label: string }> = {
  danger: { text: 'text-danger-700 dark:text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10', stroke: 'stroke-danger-500', bar: 'bg-danger-500', dot: 'bg-danger-500', label: 'Below the bar' },
  warning: { text: 'text-warning-700 dark:text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10', stroke: 'stroke-warning-500', bar: 'bg-warning-500', dot: 'bg-warning-500', label: 'On the bar' },
  success: { text: 'text-success-700 dark:text-success-500', bg: 'bg-success-50 dark:bg-success-500/10', stroke: 'stroke-success-500', bar: 'bg-success-500', dot: 'bg-success-500', label: 'Above the bar' },
}

function toneFor(score: number): Tone {
  if (score < 3) return 'danger'
  if (score > 3) return 'success'
  return 'warning'
}

function formatDate(value?: string): string {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function averageScore(dimensions: ScorecardDimension[]): number {
  if (dimensions.length === 0) return 0
  return dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length
}

function showCount(value?: number): string {
  return typeof value === 'number' ? String(value) : '—'
}

function nextStepSentence(pendingDiscrepancies?: number): string {
  if (typeof pendingDiscrepancies !== 'number') {
    return 'Read the evidence behind each score, then check any claims flagged for review.'
  }
  if (pendingDiscrepancies === 0) {
    return 'Read the evidence behind each score. Nothing is waiting for a human decision right now.'
  }
  return `Read the evidence behind each score, then decide on the ${pendingDiscrepancies} claim${pendingDiscrepancies === 1 ? '' : 's'} flagged for review.`
}

function PageHeading({ candidateName, interviewDate, interviewId }: any) {
  return (
    <motion.header variants={fadeUp} className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">Overview</p>
        <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl lg:text-4xl">{candidateName}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
          <span>{formatDate(interviewDate)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-xs" title={interviewId}>Interview {interviewId}</span>
        </p>
      </div>
      <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500')}>
        <ShieldCheck className="h-3.5 w-3.5" />
        Ready for review
      </span>
    </motion.header>
  )
}

function AverageScoreCard({ average, count }: { average: number; count: number }) {
  const tone = TONES[toneFor(average)]
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, average / MAX_SCORE))
  
  return (
    <motion.div variants={scaleIn} className="h-full">
      <Card className="flex h-full items-center gap-5 p-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="7" className="stroke-chip" />
            <motion.circle 
              cx="40" cy="40" r={radius} fill="none" strokeWidth="7" strokeLinecap="round" className={tone.stroke} 
              strokeDasharray={circumference} 
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - progress) }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums text-fg-strong">{average.toFixed(1)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg-muted">Average score</p>
          <p className="mt-1 text-sm text-fg-muted"><span className="text-2xl font-semibold tabular-nums text-fg-strong">{average.toFixed(1)}</span><span> / {MAX_SCORE}</span></p>
          <p className={cn('mt-1 text-xs font-semibold', tone.text)}>{tone.label} · {count} dimensions</p>
        </div>
      </Card>
    </motion.div>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  href,
  hrefLabel,
}: {
  label: string
  value: string | number
  hint: string
  icon: import('react').ReactNode
  tone?: Tone
  href?: string
  hrefLabel?: string
}) {
  const styles = tone ? TONES[tone] : null
  const card = (
    <Card className="group flex h-full flex-col p-5 transition-all duration-300 hover:shadow-lift hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span aria-hidden="true" className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110', styles ? styles.bg : 'bg-chip', styles ? styles.text : 'text-fg-muted')}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-fg-strong">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p>
      {href ? <span className="mt-auto pt-3 text-xs font-semibold text-accent-700 dark:text-accent-300">{hrefLabel} <span aria-hidden="true">→</span></span> : null}
    </Card>
  )
  if (!href) return <motion.div variants={fadeUp} className="h-full">{card}</motion.div>
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Link to={href} className="block h-full rounded-card focus-visible:ring-2 focus-visible:ring-accent-500">{card}</Link>
    </motion.div>
  )
}

function DimensionRow({ dimension }: { dimension: ScorecardDimension }) {
  const tone = TONES[toneFor(dimension.score)]
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-fg-strong">{dimension.name}</p>
        <span className={cn('shrink-0 font-mono text-sm font-semibold tabular-nums', tone.text)}>{dimension.score} / {MAX_SCORE}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-chip">
        <motion.div 
          className={cn('h-full rounded-full', tone.bar)} 
          initial={{ width: 0 }}
          animate={{ width: `${(dimension.score / MAX_SCORE) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </li>
  )
}

function DimensionsCard({ dimensions, base }: { dimensions: ScorecardDimension[]; base: string }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-fg-strong">Dimensions</h2>
          <Link to={`${base}/evaluation`} className="text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300">See the evidence <span aria-hidden="true">→</span></Link>
        </div>
        <ul className="mt-5 space-y-4">
          {dimensions.map((dimension) => <DimensionRow key={dimension.name} dimension={dimension} />)}
        </ul>
      </Card>
    </motion.div>
  )
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading scorecard…</span>
      <div className="h-3 w-24 rounded skeleton" />
      <div className="mt-4 h-9 w-64 max-w-full rounded-lg skeleton" />
      <div className="mt-3 h-4 w-44 rounded skeleton" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-card border border-line bg-surface-card p-5">
            <div className="h-4 w-24 rounded skeleton" />
            <div className="mt-4 h-8 w-16 rounded skeleton" />
            <div className="mt-3 h-3 w-28 rounded skeleton" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert variant="error" title="Could not load the scorecard" action={<Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}>{message}</Alert>
      <Link to="/upload" className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"><span aria-hidden="true">←</span> Start a new analysis</Link>
    </div>
  )
}

// تم حذف ProcessingState القديم واستبداله بالمكون الجديد

function NotFoundState() {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert variant="error" title="Interview not found">This interview does not exist or was removed.</Alert>
      <Link to="/upload" className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"><span aria-hidden="true">←</span> Start a new analysis</Link>
    </div>
  )
}

function EmptyState({ base }: { base: string }) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert variant="info" title="No dimensions yet">
        The scorecard was returned without any dimension scores. Re-run the analysis or check the API response for this interview.
      </Alert>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/upload" className="text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"><span aria-hidden="true">←</span> Start a new analysis</Link>
        <Link to={`${base}/evaluation`} className="text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300">Open evaluation <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  )
}

export function OverviewTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const { status, scorecard, error, refresh } = useScorecard()
  const base = `/dashboard/${interviewId}`

  useEffect(() => {
    if (status === 'rejected') {
      toast.error('Session Rejected', { description: 'This interview was rejected. Please upload a new one.' })
      navigate('/upload', { replace: true })
    }
  }, [status, navigate])

  if (status === 'loading') {
    return (
      <>
        <SEO title="Interview overview" description="Candidate scorecard overview." noIndex />
        <OverviewSkeleton />
      </>
    )
  }

  if (status === 'needs-review') {
    return (
      <>
        <SEO title="Manual review required" description="Interview needs manual review." noIndex />
        <ReviewBanner />
      </>
    )
  }

  if (status === 'processing') {
    return (
      <>
        <SEO title="Interview overview" description="Candidate scorecard overview." noIndex />
        <ProcessingState /> {/* <--- استخدام المكون الجديد */}
      </>
    )
  }

  if (status === 'not-found') {
    return (
      <>
        <SEO title="Interview not found" description="Interview not found." noIndex />
        <NotFoundState />
      </>
    )
  }

  if (status === 'error' || !scorecard || scorecard.status !== 'scored') {
    return (
      <>
        <SEO title="Interview overview" description="Candidate scorecard overview." noIndex />
        <ErrorState
          message={error ?? 'Something went wrong while loading the scorecard.'}
          onRetry={refresh}
        />
      </>
    )
  }

  const { candidateName, interviewDate, dimensions, overallConfidence, pendingDiscrepancies, skillGaps } = scorecard
  const average = averageScore(dimensions)

  return (
    <>
      <SEO
        title={`${candidateName} · Interview overview`}
        description={`Scorecard overview for ${candidateName}.`}
        noIndex
      />

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <PageHeading
          candidateName={candidateName}
          interviewDate={interviewDate}
          interviewId={interviewId}
        />

        {dimensions.length === 0 ? (
          <EmptyState base={base} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AverageScoreCard average={average} count={dimensions.length} />

              <StatCard
                label="Pending discrepancies"
                value={showCount(pendingDiscrepancies)}
                hint="Claims that still need a human decision"
                tone={typeof pendingDiscrepancies === 'number' ? pendingDiscrepancies > 0 ? 'danger' : 'success' : undefined}
                href={`${base}/discrepancies`}
                hrefLabel="Review claims"
                icon={<Flag className="h-4 w-4" />}
              />

              <StatCard
                label="Skill gaps"
                value={showCount(skillGaps)}
                hint="Growth areas detected in the interview"
                tone={typeof skillGaps === 'number' ? skillGaps > 0 ? 'warning' : 'success' : undefined}
                href={`${base}/roadmap`}
                hrefLabel="Open growth plan"
                icon={<TrendingUp className="h-4 w-4" />}
              />

              <StatCard
                label="Model confidence"
                value={`${Math.round(overallConfidence * 100)}%`}
                hint="How certain the scoring model is"
                icon={<Target className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <DimensionsCard dimensions={dimensions} base={base} />

              <motion.div variants={fadeUp}>
                <Card className="flex h-full flex-col p-6">
                  <h2 className="text-base font-semibold text-fg-strong">Next step</h2>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    {nextStepSentence(pendingDiscrepancies)}
                  </p>

                  <div className="mt-5 space-y-2">
                    <Link to={`${base}/evaluation`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent-500 hover:bg-accent-50/40 active:scale-[0.98] dark:hover:bg-accent-500/10">
                      Evaluation &amp; evidence
                      <span aria-hidden="true">→</span>
                    </Link>
                    <Link to={`${base}/discrepancies`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent-500 hover:bg-accent-50/40 active:scale-[0.98] dark:hover:bg-accent-500/10">
                      Claim verification
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  <p className="mt-auto pt-5 text-xs leading-relaxed text-fg-muted">
                    Scores are evidence-based, not a hiring decision. Every flag stays pending until a human reviews it.
                  </p>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}