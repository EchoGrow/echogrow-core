import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  TrendingUp,
  Sparkles,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, Button, toast } from '../../components/ui';
import { ReviewBanner } from '../../components/ui/ReviewBanner';
import { DiscrepancyDetail } from '../../components/discrepancies/DiscrepancyDetail';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import {
  getDiscrepancies,
  updateDiscrepancyStatus,
  rebuildSpkProfile,
} from '../../lib/api';
import type { DiscrepancyRecord, DiscrepancyStatus } from '../../lib/api';
import { useScorecard } from '../../lib/scorecard/useScorecard';
import { fadeUp, staggerContainer } from '../../lib/animations';
import { cn } from '../../lib/cn';

const SEVERITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function ClaimVerificationSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading discrepancies…</span>

      <div>
        <div className="h-3 w-32 rounded skeleton" />
        <div className="mt-2 h-8 w-48 rounded-lg skeleton" />
        <div className="mt-3 h-4 w-full max-w-lg rounded skeleton" />
      </div>

      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-card border border-line bg-surface-card p-5 sm:p-6"
          >
            <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-card bg-line-strong" />

            <div className="flex flex-wrap items-start justify-between gap-3 pl-3">
              <div className="min-w-0">
                <div className="h-3 w-20 rounded skeleton" />
                <div className="mt-2 h-5 w-40 rounded skeleton" />
              </div>
              <div className="flex shrink-0 gap-2">
                <div className="h-6 w-24 rounded-lg skeleton" />
                <div className="h-6 w-28 rounded-full skeleton" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 pl-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded skeleton" />
                  <div className="h-3 w-16 rounded skeleton" />
                </div>
                <div className="mt-3 h-4 w-full rounded skeleton" />
                <div className="mt-2 h-4 w-3/4 rounded skeleton" />
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded skeleton" />
                  <div className="h-3 w-24 rounded skeleton" />
                </div>
                <div className="mt-3 h-4 w-full rounded skeleton" />
                <div className="mt-2 h-4 w-2/3 rounded skeleton" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 pl-3">
              <div className="h-9 w-28 rounded-xl skeleton" />
              <div className="h-9 w-28 rounded-xl skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ interviewId }: { interviewId: string }) {
  return (
    <motion.div variants={fadeUp} className="mx-auto max-w-2xl">
      <Card className="overflow-hidden p-8 text-center sm:p-12">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500"
        >
          <ShieldCheck className="h-10 w-10" strokeWidth={2.5} />
        </motion.div>

        <h2 className="mt-6 text-2xl font-semibold text-fg-strong">
          No discrepancies detected
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
          Every claim in the interview matches the resume. No human review is
          needed for this interview.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to={`/dashboard/${interviewId}/overview`}>
            <Button variant="primary" size="md">
              <TrendingUp className="mr-2 h-4 w-4" />
              View overview
            </Button>
          </Link>
          <Link to="/upload">
            <Button variant="secondary" size="md">
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze another interview
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

function SpkToolbar({
  pendingCount,
  spkStatus,
  onRebuild,
  isRebuilding,
}: {
  pendingCount: number;
  spkStatus: 'pending' | 'building' | 'ready' | 'failed';
  onRebuild: () => void;
  isRebuilding: boolean;
}) {
  const isFailed = spkStatus === 'failed';
  const isBuilding = spkStatus === 'building';
  const allReviewed = pendingCount === 0;
  const busy = isRebuilding || isBuilding;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-card/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
          <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
          {pendingCount} pending
        </span>

        {allReviewed && spkStatus === 'ready' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-500">
            <ShieldCheck className="h-3 w-3" />
            All reviewed — SPK is up to date
          </span>
        )}

        {isBuilding && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            Rebuilding SPK…
          </span>
        )}

        {allReviewed && isFailed && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-1 text-xs font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
            <AlertTriangle className="h-3 w-3" />
            SPK rebuild failed
          </span>
        )}
      </div>

      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <Button
          size="sm"
          variant={isFailed ? 'primary' : 'secondary'}
          onClick={onRebuild}
          disabled={busy}
          className="whitespace-nowrap"
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Rebuilding…
            </>
          ) : (
            <>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Rebuild SPK now
            </>
          )}
        </Button>

        <span
          className={cn(
            'inline-flex items-start gap-1 text-[11px] leading-relaxed',
            isFailed
              ? 'text-danger-700 dark:text-danger-500'
              : 'text-fg-muted',
          )}
        >
          {isFailed ? (
            <>
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              The last SPK rebuild failed. Click to retry.
            </>
          ) : isBuilding ? (
            <>
              <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
              Rebuilding the SPK profile. This may take up to 90 seconds.
            </>
          ) : (
            <>
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {pendingCount} claim{pendingCount === 1 ? '' : 's'} still pending.
              The SPK rebuilds automatically once all are reviewed. Use this
              button to rebuild early.
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function ClaimVerificationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const {
    status: scorecardStatus,
    scorecard,
    refresh: refreshScorecard,
    retryAll,
    setSpkStatus,
  } = useScorecard();

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const pendingCount = discrepancies.filter(
    (d) => d.status.toLowerCase() === 'pending',
  ).length;

  const spkStatus =
    scorecard?.status === 'scored'
      ? scorecard.spkStatus ?? 'pending'
      : 'pending';

  const showToolbar =
    pendingCount > 0 || spkStatus === 'failed' || spkStatus === 'building';

  useEffect(() => {
    let cancelled = false;

    async function loadDiscrepancies() {
      setLoading(true);
      setError(null);
      try {
        const response = await getDiscrepancies(interviewId);
        if (!cancelled) {
          const sorted = [...response.discrepancies].sort((a, b) => {
            const aOrder = SEVERITY_ORDER[a.severity] ?? 1;
            const bOrder = SEVERITY_ORDER[b.severity] ?? 1;
            return aOrder - bOrder;
          });
          setDiscrepancies(sorted);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Failed to load discrepancies.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (interviewId) {
      loadDiscrepancies();
    } else {
      setError('Interview ID is missing.');
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  async function handleStatusChange(
    id: string,
    status: DiscrepancyStatus,
    reviewerNotes?: string,
  ) {
    setActionError(null);
    try {
      await updateDiscrepancyStatus(
        id,
        status as Exclude<DiscrepancyStatus, 'pending'>,
        reviewerNotes,
      );

      setDiscrepancies((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                reviewerNotes: reviewerNotes ?? item.reviewerNotes ?? null,
              }
            : item,
        ),
      );

      const remaining = discrepancies.filter(
        (d) => d.id !== id && d.status.toLowerCase() === 'pending',
      ).length;

      if (remaining === 0) {
        setTimeout(() => refreshScorecard(), 500);
      }
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Failed to update status.',
      );
    }
  }

  async function handleManualRebuild() {
    setIsRebuilding(true);
    try {
      // Optimistic: mark as building immediately.
      setSpkStatus('building', null);
      await rebuildSpkProfile(interviewId);
      setTimeout(() => refreshScorecard(), 1000);
    } catch (cause) {
      toast.error('Failed to start SPK rebuild', {
        description:
          cause instanceof Error ? cause.message : 'Unknown error',
      });
      refreshScorecard();
    } finally {
      setIsRebuilding(false);
    }
  }

  if (scorecardStatus === 'needs-review') {
    return <ReviewBanner />;
  }

  if (loading) {
    return <ClaimVerificationSkeleton />;
  }

  if (error) {
    return (
      <DashboardErrorState
        title="Could not load discrepancies"
        message={error}
        onRetry={retryAll}
        backHref={`/dashboard/${interviewId}/overview`}
      />
    );
  }

  if (discrepancies.length === 0) {
    return (
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
            Claim verification
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">
            Verification
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Review claims that differ between the candidate's CV and interview.
          </p>
        </motion.div>

        <EmptyState interviewId={interviewId} />
      </motion.section>
    );
  }

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
          Claim verification
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">
          Verification
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          Review claims that differ between the candidate's CV and interview.
          Confirm or dismiss each discrepancy. Sorted by severity (high first).
        </p>
      </motion.div>

      {showToolbar && (
        <motion.div variants={fadeUp}>
          <SpkToolbar
            pendingCount={pendingCount}
            spkStatus={spkStatus}
            onRebuild={handleManualRebuild}
            isRebuilding={isRebuilding}
          />
        </motion.div>
      )}

      {actionError && (
        <Card className="border-danger-500/30 bg-danger-50 p-4 animate-scale-in dark:bg-danger-500/10">
          <p className="text-sm text-danger-700 dark:text-danger-500">
            {actionError}
          </p>
        </Card>
      )}

      <div className="stagger space-y-4">
        {discrepancies.map((discrepancy) => (
          <DiscrepancyDetail
            key={discrepancy.id}
            discrepancy={discrepancy}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </motion.section>
  );
}