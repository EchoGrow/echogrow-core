import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target,
  Flag,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Trash2,
  ArrowRight,
  Calendar,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  User,
} from 'lucide-react';
import { SEO } from '../../components/SEO';
import { Alert, Button, Card, toast } from '../../components/ui';
import { ReviewBanner } from '../../components/ui/ReviewBanner';
import { ProcessingState } from '../../components/dashboard/ProcessingState';
import { useScorecard } from '../../lib/scorecard/useScorecard';
import { forceEvaluation } from '../../lib/api';
import type { ScorecardDimension } from '../../lib/api';
import { cn } from '../../lib/cn';
import { fadeUp, scaleIn, staggerContainer } from '../../lib/animations';

const MAX_SCORE = 5;

type Tone = 'danger' | 'warning' | 'success';

const TONES: Record<
  Tone,
  {
    text: string;
    bg: string;
    stroke: string;
    bar: string;
    dot: string;
    label: string;
    border: string;
    gradient: string;
    ring: string;
  }
> = {
  danger: {
    text: 'text-danger-700 dark:text-danger-500',
    bg: 'bg-danger-50 dark:bg-danger-500/10',
    stroke: 'stroke-danger-500',
    bar: 'bg-danger-500',
    dot: 'bg-danger-500',
    label: 'Below the bar',
    border: 'border-t-danger-500',
    gradient: 'from-danger-500/10 to-transparent',
    ring: 'ring-danger-500/20',
  },
  warning: {
    text: 'text-warning-700 dark:text-warning-500',
    bg: 'bg-warning-50 dark:bg-warning-500/10',
    stroke: 'stroke-warning-500',
    bar: 'bg-warning-500',
    dot: 'bg-warning-500',
    label: 'On the bar',
    border: 'border-t-warning-500',
    gradient: 'from-warning-500/10 to-transparent',
    ring: 'ring-warning-500/20',
  },
  success: {
    text: 'text-success-700 dark:text-success-500',
    bg: 'bg-success-50 dark:bg-success-500/10',
    stroke: 'stroke-success-500',
    bar: 'bg-success-500',
    dot: 'bg-success-500',
    label: 'Above the bar',
    border: 'border-t-success-500',
    gradient: 'from-success-500/10 to-transparent',
    ring: 'ring-success-500/20',
  },
};

function toneFor(score: number): Tone {
  if (score < 3) return 'danger';
  if (score > 3) return 'success';
  return 'warning';
}

function formatDate(value?: string): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function averageScore(dimensions: ScorecardDimension[]): number {
  if (dimensions.length === 0) return 0;
  return dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length;
}

function showCount(value?: number): string {
  return typeof value === 'number' ? String(value) : '—';
}

function nextStepSentence(pendingDiscrepancies?: number): string {
  if (typeof pendingDiscrepancies !== 'number') {
    return 'Read the evidence behind each score, then check any claims flagged for review.';
  }
  if (pendingDiscrepancies === 0) {
    return 'Read the evidence behind each score. Nothing is waiting for a human decision right now.';
  }
  return `Read the evidence behind each score, then decide on the ${pendingDiscrepancies} claim${
    pendingDiscrepancies === 1 ? '' : 's'
  } flagged for review.`;
}

// ============================================================
// Hero Header
// ============================================================
function PageHeading({
  candidateName,
  interviewDate,
  interviewId,
}: {
  candidateName: string;
  interviewDate: string;
  interviewId: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(interviewId);
      setCopied(true);
      toast.success('Interview ID copied', { description: interviewId });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy', { description: 'Please copy manually.' });
    }
  };

  return (
    <motion.header
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-accent-50 via-surface-card to-surface-card p-6 sm:p-8 dark:from-accent-500/5 dark:via-surface-card dark:to-surface-card"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04] dark:opacity-[0.06]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="overview-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#overview-grid)" />
      </svg>

      <div
        className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-accent-500 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-accent-500/30 bg-surface-card shadow-lg"
          >
            <User className="h-5 w-5 text-accent-600 dark:text-accent-400" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-[9px] font-bold text-white shadow-sm ring-2 ring-surface-card">
              {candidateName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          </motion.div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
              Overview
            </p>
            <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl lg:text-4xl">
              {candidateName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(interviewDate)}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="group inline-flex items-center gap-1.5 rounded-md bg-chip px-2 py-0.5 font-mono text-xs transition-colors hover:bg-accent-50 hover:text-accent-700 dark:hover:bg-accent-500/10 dark:hover:text-accent-300"
                title="Click to copy full ID"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-success-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
                    {interviewId.slice(0, 12)}...
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
            'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
          </span>
          Ready for review
        </span>
      </div>
    </motion.header>
  );
}

// ============================================================
// Average Score Card
// ============================================================
function AverageScoreCard({ average, count }: { average: number; count: number }) {
  const tone = TONES[toneFor(average)];
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, average / MAX_SCORE));

  return (
    <motion.div variants={scaleIn} className="h-full">
      <Card
        className={cn(
          'group relative flex h-full flex-col overflow-hidden border-t-2 p-5 shadow-sm ring-1 ring-transparent transition-all duration-300 hover:shadow-lift hover:ring-line-strong',
          tone.border,
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100',
            tone.gradient,
          )}
          aria-hidden="true"
        />

        <div className="relative flex justify-center pt-1">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 88 88" className="h-24 w-24 -rotate-90" aria-hidden="true">
              <circle cx="44" cy="44" r={radius} fill="none" strokeWidth="8" className="stroke-chip" />
              <motion.circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={tone.stroke}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - progress) }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-fg-strong">
                {average.toFixed(1)}
              </span>
              <span className="text-[10px] font-medium text-fg-subtle">/ {MAX_SCORE}</span>
            </div>
          </div>
        </div>

        <div className="relative mt-3 flex flex-col items-center gap-1.5 text-center">
          <p className="text-xs font-medium text-fg-muted">Average score</p>
          <span
            className={cn(
              'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1',
              tone.text,
              tone.bg,
              tone.ring,
            )}
          >
            <span className={cn('h-1 w-1 shrink-0 rounded-full', tone.dot)} />
            <span className="truncate">{tone.label}</span>
          </span>
        </div>

        <div className="relative mt-auto border-t border-line pt-3">
          <p className="text-center text-xs text-fg-muted">
            Averaged across <span className="font-semibold text-fg-strong">{count}</span> dimensions
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Stat Card
// ============================================================
function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  href,
  hrefLabel,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone?: Tone;
  href?: string;
  hrefLabel?: string;
}) {
  const styles = tone ? TONES[tone] : null;

  const card = (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden border-t-2 p-5 shadow-sm ring-1 ring-transparent transition-all duration-300 hover:shadow-lift hover:border-line-strong hover:ring-line-strong',
        styles?.border ?? 'border-t-transparent',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          styles?.gradient ?? 'from-accent-500/5 to-transparent',
        )}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
            styles ? styles.bg : 'bg-chip',
            styles ? styles.text : 'text-fg-muted',
            styles ? styles.ring : 'ring-line',
          )}
        >
          {icon}
        </span>
      </div>

      <p className="relative mt-3 text-3xl font-bold tracking-tight tabular-nums text-fg-strong">
        {value}
      </p>
      <p className="relative mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p>

      {href ? (
        <span className="relative mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-accent-700 transition-all duration-200 group-hover:gap-2 dark:text-accent-300">
          {hrefLabel}
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </Card>
  );

  if (!href) {
    return (
      <motion.div variants={fadeUp} className="h-full">
        {card}
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp} className="h-full">
      <Link
        to={href}
        className="block h-full rounded-card focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {card}
      </Link>
    </motion.div>
  );
}

// ============================================================
// Dimension Row
// ============================================================
function DimensionRow({ dimension }: { dimension: ScorecardDimension }) {
  const tone = TONES[toneFor(dimension.score)];

  return (
    <li className="group relative overflow-hidden rounded-xl border border-line bg-surface-card p-4 transition-all duration-300 hover:border-line-strong hover:bg-chip/40 hover:shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-fg-strong">{dimension.name}</p>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular-nums ring-1',
            tone.text,
            tone.bg,
            tone.ring,
          )}
        >
          {dimension.score} / {MAX_SCORE}
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-chip">
        <motion.div
          className={cn('h-full rounded-full', tone.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${(dimension.score / MAX_SCORE) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </li>
  );
}

// ============================================================
// Dimensions Card
// ============================================================
function DimensionsCard({
  dimensions,
  base,
}: {
  dimensions: ScorecardDimension[];
  base: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="overflow-hidden p-0 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line bg-gradient-to-r from-chip/50 to-transparent px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-700 ring-1 ring-accent-500/20 dark:text-accent-300">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-fg-strong">Dimensions</h2>
          </div>
          <Link
            to={`${base}/evaluation`}
            className="group inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300"
          >
            See the evidence
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="space-y-2.5 p-4">
          {dimensions.map((dimension) => (
            <DimensionRow key={dimension.name} dimension={dimension} />
          ))}
        </ul>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Loading skeleton
// ============================================================
function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading scorecard…</span>

      <div className="rounded-2xl border border-line bg-surface-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl skeleton" />
          <div className="flex-1">
            <div className="h-3 w-24 rounded skeleton" />
            <div className="mt-3 h-9 w-64 max-w-full rounded-lg skeleton" />
            <div className="mt-3 h-4 w-44 rounded skeleton" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-card border border-line bg-surface-card p-5">
            <div className="h-4 w-24 rounded skeleton" />
            <div className="mt-4 h-8 w-16 rounded skeleton" />
            <div className="mt-3 h-3 w-28 rounded skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// States
// ============================================================
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert
        variant="error"
        title="Could not load the scorecard"
        action={
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {message}
      </Alert>
      <Link
        to="/upload"
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
      >
        ← Start a new analysis
      </Link>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert variant="error" title="Interview not found">
        This interview does not exist or was removed.
      </Alert>
      <Link
        to="/upload"
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
      >
        ← Start a new analysis
      </Link>
    </div>
  );
}

function EmptyState({ base }: { base: string }) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert variant="info" title="No dimensions yet">
        The scorecard was returned without any dimension scores. Re-run the analysis or check the
        API response for this interview.
      </Alert>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/upload"
          className="text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
        >
          ← Start a new analysis
        </Link>
        <Link
          to={`${base}/evaluation`}
          className="text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
        >
          Open evaluation →
        </Link>
      </div>
    </div>
  );
}

function FailedState({ interviewId, onRetry }: { interviewId: string; onRetry: () => void }) {
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await forceEvaluation(interviewId);
      toast.success('Retrying analysis', { description: 'The pipeline will restart shortly.' });
      onRetry();
    } catch (cause) {
      toast.error('Could not retry', {
        description: cause instanceof Error ? cause.message : 'Unknown error',
      });
      setIsRetrying(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8 animate-fade-up">
      <Card className="border-danger-500/30 bg-danger-50 p-8 text-center dark:bg-danger-500/10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/15 text-danger-600">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-danger-700 dark:text-danger-500">
          Analysis Failed
        </h2>
        <p className="mt-2 text-sm text-danger-700/80 dark:text-danger-500/80">
          The AI pipeline encountered an error and could not complete the analysis. You can try
          again or start a new one.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={handleRetry} disabled={isRetrying}>
            <RotateCcw className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')} />
            {isRetrying ? 'Retrying…' : 'Retry Analysis'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/upload')}>
            <Trash2 className="mr-2 h-4 w-4" />
            Start New
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export function OverviewTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { status, scorecard, error, refresh } = useScorecard();
  const base = `/dashboard/${interviewId}`;

  useEffect(() => {
    if (status === 'rejected') {
      toast.error('Session Rejected', {
        description: 'This interview was rejected. Please upload a new one.',
      });
      navigate('/upload', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'loading') {
    return (
      <>
        <SEO title="Interview overview" description="Candidate scorecard overview." noIndex />
        <OverviewSkeleton />
      </>
    );
  }

  if (status === 'needs-review') {
    return (
      <>
        <SEO title="Manual review required" description="Interview needs manual review." noIndex />
        <ReviewBanner />
      </>
    );
  }

  if (status === 'processing') {
    return (
      <>
        <SEO title="Interview overview" description="Candidate scorecard overview." noIndex />
        <ProcessingState />
      </>
    );
  }

  if (status === 'failed') {
    return (
      <>
        <SEO title="Analysis failed" description="The analysis failed." noIndex />
        <FailedState interviewId={interviewId} onRetry={refresh} />
      </>
    );
  }

  if (status === 'not-found') {
    return (
      <>
        <SEO title="Interview not found" description="Interview not found." noIndex />
        <NotFoundState />
      </>
    );
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
    );
  }

  const {
    candidateName,
    interviewDate,
    dimensions,
    overallConfidence,
    pendingDiscrepancies,
    skillGaps,
  } = scorecard;
  const average = averageScore(dimensions);

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
                tone={
                  typeof pendingDiscrepancies === 'number'
                    ? pendingDiscrepancies > 0
                      ? 'danger'
                      : 'success'
                    : undefined
                }
                href={`${base}/discrepancies`}
                hrefLabel="Review claims"
                icon={<Flag className="h-4 w-4" />}
              />

              <StatCard
                label="Skill gaps"
                value={showCount(skillGaps)}
                hint="Growth areas detected in the interview"
                tone={
                  typeof skillGaps === 'number' ? (skillGaps > 0 ? 'warning' : 'success') : undefined
                }
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
                <Card className="flex h-full flex-col overflow-hidden p-0 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-line bg-gradient-to-r from-chip/50 to-transparent px-6 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-700 ring-1 ring-accent-500/20 dark:text-accent-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-semibold text-fg-strong">Next step</h2>
                  </div>

                  <div className="flex-1 p-6">
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {nextStepSentence(pendingDiscrepancies)}
                    </p>

                    <div className="mt-5 space-y-2">
                      <Link
                        to={`${base}/evaluation`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent-500 hover:bg-accent-50/40 active:scale-[0.98] dark:hover:bg-accent-500/10"
                      >
                        <span className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                          Evaluation &amp; evidence
                        </span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                      <Link
                        to={`${base}/discrepancies`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent-500 hover:bg-accent-50/40 active:scale-[0.98] dark:hover:bg-accent-500/10"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                          Claim verification
                        </span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                      <Link
                        to={`${base}/roadmap`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-chip/60 px-4 py-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent-500 hover:bg-accent-50/40 active:scale-[0.98] dark:hover:bg-accent-500/10"
                      >
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                          Growth plan
                        </span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-line bg-gradient-to-r from-chip/30 to-transparent px-6 py-4">
                    <p className="text-xs leading-relaxed text-fg-muted">
                      Scores are evidence-based, not a hiring decision. Every flag stays pending
                      until a human reviews it.
                    </p>
                  </div>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}