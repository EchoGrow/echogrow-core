
import { useEffect } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'
import { SEO } from '../../components/SEO'
import { Alert, Button, Card, Spinner, toast } from '../../components/ui'
import { ReviewBanner } from '../../components/ui/ReviewBanner'
import { useScorecard } from '../../lib/scorecard/useScorecard'
import type { ScorecardDimension } from '../../lib/api'
import { cn } from '../../lib/cn'

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

function PageHeading({ candidateName, interviewDate, interviewId, pendingDiscrepancies }: any) {
  const reviewState = typeof pendingDiscrepancies !== 'number' ? 'unknown' : pendingDiscrepancies > 0 ? 'pending' : 'clear'
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">Overview</p>
        <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">{candidateName}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
          <span>{formatDate(interviewDate)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-xs" title={interviewId}>Interview {interviewId.slice(0, 8)}</span>
        </p>
      </div>
      <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        reviewState === 'pending' && 'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
        reviewState === 'clear' && 'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
        reviewState === 'unknown' && 'border-line bg-chip text-fg-muted')}>
        <span className={cn('h-1.5 w-1.5 rounded-full', reviewState === 'pending' && 'bg-warning-500', reviewState === 'clear' && 'bg-success-500', reviewState === 'unknown' && 'bg-fg-muted/50')} aria-hidden="true" />
        {reviewState === 'pending' ? 'Needs review' : reviewState === 'clear' ? 'Ready for review' : 'Review status unknown'}
      </span>
    </header>
  )
}

function AverageScoreCard({ average, count }: { average: number; count: number }) {
  const tone = TONES[toneFor(average)]
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, average / MAX_SCORE))
  return (
    <Card className="flex h-full items-center gap-5 p-5">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="7" className="stroke-chip" />
          <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="7" strokeLinecap="round" className={tone.stroke} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums text-fg-strong">{average.toFixed(1)}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg-muted">Average score</p>
        <p className="mt-1 text-sm text-fg-muted"><span className="text-2xl font-semibold tabular-nums text-fg-strong">{average.toFixed(1)}</span><span> / {MAX_SCORE}</span></p>
        <p className={cn('mt-1 text-xs font-semibold', tone.text)}>{tone.label} · {count} dimensions</p>
      </div>
    </Card>
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
    <Card className="group flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span aria-hidden="true" className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', styles ? styles.bg : 'bg-chip', styles ? styles.text : 'text-fg-muted')}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-fg-strong">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p>
      {href ? <span className="mt-auto pt-3 text-xs font-semibold text-accent-700 dark:text-accent-300">{hrefLabel} <span aria-hidden="true">→</span></span> : null}
    </Card>
  )
  if (!href) return card
  return <Link to={href} className="block rounded-card focus-visible:ring-2 focus-visible:ring-accent-500">{card}</Link>
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
        <div className={cn('h-full rounded-full transition-[width] duration-700', tone.bar)} style={{ width: `${(dimension.score / MAX_SCORE) * 100}%` }} />
      </div>
    </li>
  )
}

function DimensionsCard({ dimensions, base }: { dimensions: ScorecardDimension[]; base: string }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-fg-strong">Dimensions</h2>
        <Link to={`${base}/evaluation`} className="text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300">See the evidence <span aria-hidden="true">→</span></Link>
      </div>
      <ul className="mt-5 space-y-4">
        {dimensions.map((dimension) => <DimensionRow key={dimension.name} dimension={dimension} />)}
      </ul>
    </Card>
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

function ProcessingState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Card className="p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300"><Spinner className="h-6 w-6" label="Analyzing" /></span>
        <h2 className="mt-5 text-lg font-semibold text-fg-strong">Analysis in progress</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">EchoGrow is still scoring this interview. This usually takes a few seconds — check again shortly.</p>
        <Button className="mt-6" variant="secondary" onClick={onRetry}>Check again</Button>
      </Card>
    </div>
  )
}

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
        <ProcessingState onRetry={refresh} />
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

  // Type Guard: التأكد من أن scorecard هو ScoredResponse
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

      <div className="animate-fade-up">
        <PageHeading
          candidateName={candidateName}
          interviewDate={interviewDate}
          interviewId={scorecard.interviewId || interviewId}
          pendingDiscrepancies={pendingDiscrepancies}
        />

        {dimensions.length === 0 ? (
          <EmptyState base={base} />
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AverageScoreCard average={average} count={dimensions.length} />

              <StatCard
                label="Pending discrepancies"
                value={showCount(pendingDiscrepancies)}
                hint="Claims that still need a human decision"
                tone={
                  typeof pendingDiscrepancies === 'number'
                    ? pendingDiscrepancies > 0
                      ? 'danger'
                      : 'success'
                    : undefined
                }
                href={`${base}/discrepancies`}
                hrefLabel="Review claims"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path d="M5 21V4m0 0h9l-1.5 4H5m0 4h11l-1.5 4H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />

              <StatCard
                label="Skill gaps"
                value={showCount(skillGaps)}
                hint="Growth areas detected in the interview"
                tone={
                  typeof skillGaps === 'number'
                    ? skillGaps > 0
                      ? 'warning'
                      : 'success'
                    : undefined
                }
                href={`${base}/roadmap`}
                hrefLabel="Open growth plan"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path d="M4 19h4v-6H4v6Zm6 0h4V9h-4v10Zm6 0h4V5h-4v14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />

              <StatCard
                label="Model confidence"
                value={`${Math.round(overallConfidence * 100)}%`}
                hint="How certain the scoring model is"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-5.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                }
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <DimensionsCard dimensions={dimensions} base={base} />

              <Card className="flex flex-col p-6">
                <h2 className="text-base font-semibold text-fg-strong">Next step</h2>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {nextStepSentence(pendingDiscrepancies)}
                </p>

                <div className="mt-5 space-y-2">
                  <Link to={`${base}/evaluation`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-accent-500 hover:bg-accent-50/40 dark:hover:bg-accent-500/10">
                    Evaluation &amp; evidence
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link to={`${base}/discrepancies`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-accent-500 hover:bg-accent-50/40 dark:hover:bg-accent-500/10">
                    Claim verification
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <p className="mt-auto pt-5 text-xs leading-relaxed text-fg-muted">
                  Scores are evidence-based, not a hiring decision. Every flag stays pending until a human reviews it.
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}
