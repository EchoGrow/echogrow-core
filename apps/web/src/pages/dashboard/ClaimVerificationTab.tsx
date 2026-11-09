import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import { ReviewBanner } from '../../components/ui/ReviewBanner';
import { DiscrepancyDetail } from '../../components/discrepancies/DiscrepancyDetail';
import { getDiscrepancies, updateDiscrepancyStatus } from '../../lib/api';
import type { DiscrepancyRecord, DiscrepancyStatus } from '../../lib/api';
import { useScorecard } from '../../lib/scorecard/useScorecard';
import { fadeUp, staggerContainer } from '../../lib/animations';

// ============================================================
// Loading skeleton — matches the discrepancy card shape
// ============================================================
function ClaimVerificationSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading discrepancies…</span>

      {/* Header skeleton */}
      <div>
        <div className="h-3 w-32 rounded skeleton" />
        <div className="mt-2 h-8 w-48 rounded-lg skeleton" />
        <div className="mt-3 h-4 w-full max-w-lg rounded skeleton" />
      </div>

      {/* Discrepancy cards skeleton */}
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface-card p-5 sm:p-6">
            {/* Left accent bar */}
            <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-card bg-line-strong" />

            {/* Header: field name + badges */}
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

            {/* Two quote blocks */}
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

            {/* Action buttons */}
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

// ============================================================
// Empty state — same pattern as GrowthPlanTab
// ============================================================
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
          Every claim in the interview matches the resume. No human review is needed for this
          interview.
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

export function ClaimVerificationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const { status: scorecardStatus } = useScorecard();

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDiscrepancies() {
      setLoading(true);
      setError(null);
      try {
        const response = await getDiscrepancies(interviewId);
        if (!cancelled) {
          setDiscrepancies(response.discrepancies);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load discrepancies.');
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

  async function handleStatusChange(id: string, status: DiscrepancyStatus) {
    setActionError(null);
    try {
      await updateDiscrepancyStatus(id, status as Exclude<DiscrepancyStatus, 'pending'>);
      
      setDiscrepancies((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to update status.');
    }
  }

  if (scorecardStatus === 'needs-review') {
    return <ReviewBanner />;
  }

  // Loading — use skeleton, not spinner
  if (loading) {
    return <ClaimVerificationSkeleton />;
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center animate-fade-up">
        <h2 className="text-lg font-semibold text-fg-strong">Unable to load discrepancies</h2>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
        <Link
          to={`/dashboard/${interviewId}/overview`}
          className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
        >
          ← Back to overview
        </Link>
      </Card>
    );
  }

  // Empty state — no discrepancies
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
          <h2 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">Verification</h2>
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
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">Verification</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Review claims that differ between the candidate's CV and interview. Confirm or dismiss each discrepancy.
        </p>
      </motion.div>

      {actionError && (
        <Card className="border-danger-500/30 bg-danger-50 p-4 animate-scale-in dark:bg-danger-500/10">
          <p className="text-sm text-danger-700 dark:text-danger-500">{actionError}</p>
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