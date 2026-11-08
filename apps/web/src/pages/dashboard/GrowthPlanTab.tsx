import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target,
  BookOpen,
  ExternalLink,
  Calendar,
  Sparkles,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FileJson,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { SEO } from '../../components/SEO';
import { Alert, Button, Card, toast } from '../../components/ui';
import { ReviewBanner } from '../../components/ui/ReviewBanner';
import { useScorecard } from '../../lib/scorecard/useScorecard';
import {
  getRoadmap,
  type RoadmapResponse,
  type RoadmapItemRecord,
  type SkillGapPriority,
} from '../../lib/api';
import {
  downloadRoadmapPDF,
  copyRoadmapMarkdown,
  downloadRoadmapJSON,
  ExportValidationError,
} from '../../lib/export/exportRoadmap';
import { fadeUp, staggerContainer } from '../../lib/animations';
import { cn } from '../../lib/cn';

// ============================================================
// Priority styling
// ============================================================
const PRIORITY_STYLES: Record<
  SkillGapPriority,
  { label: string; badge: string; dot: string; border: string }
> = {
  HIGH: {
    label: 'High',
    badge:
      'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500 border-danger-500/30',
    dot: 'bg-danger-500',
    border: 'border-l-danger-500',
  },
  MEDIUM: {
    label: 'Medium',
    badge:
      'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500 border-warning-500/30',
    dot: 'bg-warning-500',
    border: 'border-l-warning-500',
  },
  LOW: {
    label: 'Low',
    badge:
      'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500 border-success-500/30',
    dot: 'bg-success-500',
    border: 'border-l-success-500',
  },
};

// ============================================================
// Loading skeleton
// ============================================================
function GrowthPlanSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading growth plan…</span>
      <div className="h-3 w-24 rounded skeleton" />
      <div className="h-9 w-64 max-w-full rounded-lg skeleton" />
      <div className="h-4 w-96 max-w-full rounded skeleton" />
      <div className="h-32 w-full rounded-card skeleton" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 w-full rounded-card skeleton" />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Error state
// ============================================================
function ErrorState({
  message,
  onRetry,
  interviewId,
}: {
  message: string;
  onRetry: () => void;
  interviewId: string;
}) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Alert
        variant="error"
        title="Could not load the growth plan"
        action={
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {message}
      </Alert>
      <Link
        to={`/dashboard/${interviewId}/overview`}
        className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
      >
        ← Back to overview
      </Link>
    </div>
  );
}

// ============================================================
// Empty state (no gaps)
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
          <CheckCircle2 className="h-10 w-10" strokeWidth={2.5} />
        </motion.div>

        <h2 className="mt-6 text-2xl font-semibold text-fg-strong">
          No skill gaps detected
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
          This candidate demonstrated strong performance across all four dimensions. No upskilling
          plan is needed right now.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to={`/dashboard/${interviewId}/overview`}>
            <Button variant="primary" size="md">
              <TrendingUp className="mr-2 h-4 w-4" />
              View evaluation
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

// ============================================================
// Gaps summary card
// ============================================================
function GapsSummary({ gaps }: { gaps: { skillName: string; priority: SkillGapPriority }[] }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-chip/50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-500/15 text-warning-700 dark:text-warning-500">
                <AlertCircle className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-fg-strong">
                Identified Skill Gaps
              </h2>
            </div>
            <span className="rounded-full bg-warning-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-warning-700 dark:text-warning-500">
              {gaps.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-6">
          {gaps.map((gap, index) => {
            const style = PRIORITY_STYLES[gap.priority];
            return (
              <motion.span
                key={`${gap.skillName}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                  style.badge,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                {gap.skillName}
              </motion.span>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Week card (timeline item)
// ============================================================
function WeekCard({
  item,
  index,
  priority,
}: {
  item: RoadmapItemRecord;
  index: number;
  priority: SkillGapPriority;
}) {
  const style = PRIORITY_STYLES[priority];
  const isFallback = item.resourceUrl?.startsWith('https://www.google.com/search');

  return (
    <motion.div variants={fadeUp} className="relative pl-16 sm:pl-20">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
        className={cn(
          'absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full text-white font-bold shadow-lg sm:h-14 sm:w-14',
          'bg-gradient-to-br from-accent-500 to-accent-700',
        )}
      >
        <div className="text-center leading-tight">
          <div className="text-[10px] font-medium opacity-80">WEEK</div>
          <div className="text-lg font-bold">{item.week}</div>
        </div>
      </motion.div>

      <Card
        className={cn(
          'group overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lift hover:border-line-strong',
          style.border,
        )}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
                <h3 className="text-base font-semibold text-fg-strong sm:text-lg">
                  {item.skillName}
                </h3>
              </div>
              <span
                className={cn(
                  'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  style.badge,
                )}
              >
                <span className={cn('h-1 w-1 rounded-full', style.dot)} />
                {style.label} Priority
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-chip px-2.5 py-1 text-xs font-medium text-fg-muted">
              <Calendar className="h-3.5 w-3.5" />
              Week {item.week}
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-fg">{item.task}</p>

          {item.resourceUrl ? (
            <div className="mt-4 border-t border-line pt-4">
              <a
                href={item.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group/link inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
                  'transition-all duration-200 active:scale-[0.98]',
                  isFallback
                    ? 'bg-warning-50 text-warning-700 hover:bg-warning-100 dark:bg-warning-500/10 dark:text-warning-500 dark:hover:bg-warning-500/20'
                    : 'bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-500/10 dark:text-accent-300 dark:hover:bg-accent-500/20',
                )}
                aria-label={`Open learning resource for ${item.skillName}`}
              >
                <BookOpen className="h-4 w-4" />
                <span>{isFallback ? 'Search for a resource' : 'Open learning resource'}</span>
                <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
              {isFallback && (
                <p className="mt-2 text-xs text-fg-muted">
                  This skill is not yet in our vetted list. Use the search to find a curated resource.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-chip px-3 py-2 text-xs text-fg-muted">
              No resource available for this skill yet.
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Export dropdown (with validation + disabled state)
// ============================================================
function ExportDropdown({
  candidateName,
  interviewDate,
  roadmapData,
  interviewId,
}: {
  candidateName: string;
  interviewDate: string;
  roadmapData: RoadmapResponse | null;
  interviewId: string;
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'md' | 'json' | null>(null);
  const [copied, setCopied] = useState(false);

  // Can we export? Need data + at least one gap/week.
  const canExport =
    roadmapData !== null &&
    Array.isArray(roadmapData.gaps) &&
    Array.isArray(roadmapData.roadmap) &&
    roadmapData.roadmap.length > 0;

  const showUnavailableToast = () => {
    toast.error('Nothing to export', {
      description:
        'This candidate has no skill gaps, so there is no roadmap to export. Try another candidate.',
      icon: <AlertTriangle className="h-4 w-4" />,
    });
  };

  const handleValidationError = (cause: unknown) => {
    const message =
      cause instanceof ExportValidationError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : 'Unknown error during export.';
    toast.error('Export failed', { description: message });
  };

  const handlePDF = async () => {
    if (!canExport) {
      setOpen(false);
      showUnavailableToast();
      return;
    }
    setOpen(false);
    setExporting('pdf');
    try {
      await downloadRoadmapPDF(candidateName, interviewDate, roadmapData, interviewId);
      toast.success('PDF downloaded', { description: 'Ready to share with the candidate.' });
    } catch (cause) {
      handleValidationError(cause);
    } finally {
      setExporting(null);
    }
  };

  const handleMarkdown = async () => {
    if (!canExport) {
      setOpen(false);
      showUnavailableToast();
      return;
    }
    setOpen(false);
    setExporting('md');
    try {
      await copyRoadmapMarkdown(candidateName, interviewDate, roadmapData, interviewId);
      setCopied(true);
      toast.success('Markdown copied', { description: 'Paste it into an email.' });
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      handleValidationError(cause);
    } finally {
      setExporting(null);
    }
  };

  const handleJSON = () => {
    if (!canExport) {
      setOpen(false);
      showUnavailableToast();
      return;
    }
    setOpen(false);
    try {
      downloadRoadmapJSON(candidateName, interviewDate, roadmapData, interviewId);
      toast.success('JSON downloaded', { description: 'Ready for integrations.' });
    } catch (cause) {
      handleValidationError(cause);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          if (!canExport) {
            showUnavailableToast();
            return;
          }
          setOpen((v) => !v);
        }}
        disabled={exporting !== null}
        title={canExport ? 'Export the roadmap' : 'No roadmap to export'}
        className="whitespace-nowrap"
      >
        {exporting ? (
          <span className="animate-pulse">Exporting…</span>
        ) : (
          <>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export Plan
          </>
        )}
      </Button>

      {open && canExport && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface-card shadow-lift">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-chip"
              onClick={handlePDF}
            >
              <FileText className="h-4 w-4 text-accent-600" />
              Download PDF
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-chip"
              onClick={handleMarkdown}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success-500" />
              ) : (
                <Copy className="h-4 w-4 text-accent-600" />
              )}
              Copy as Markdown
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-chip"
              onClick={handleJSON}
            >
              <FileJson className="h-4 w-4 text-accent-600" />
              Download JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export function GrowthPlanTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const { status: scorecardStatus, scorecard } = useScorecard();

  const [roadmapData, setRoadmapData] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadRoadmap() {
      if (!interviewId) {
        setError('Interview ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getRoadmap(interviewId);
        if (!cancelled) setRoadmapData(response);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load roadmap.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoadmap();

    return () => {
      cancelled = true;
    };
  }, [interviewId, refreshKey]);

  const handleRetry = () => setRefreshKey((k) => k + 1);

  if (scorecardStatus === 'needs-review') {
    return (
      <>
        <SEO title="Growth plan" description="Manual review required." noIndex />
        <ReviewBanner />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <SEO title="Growth plan" description="Loading your personalized upskilling roadmap." noIndex />
        <GrowthPlanSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEO title="Growth plan" description="Error loading roadmap." noIndex />
        <ErrorState message={error} onRetry={handleRetry} interviewId={interviewId} />
      </>
    );
  }

  if (!roadmapData || roadmapData.gaps.length === 0) {
    return (
      <>
        <SEO title="Growth plan" description="No skill gaps detected." noIndex />
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
              Growth plan
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">
              Upskilling Roadmap
            </h1>
          </motion.div>
          <EmptyState interviewId={interviewId} />
        </motion.section>
      </>
    );
  }

  const { gaps, roadmap } = roadmapData;
  const totalWeeks = roadmap.length;

  const candidateName =
    scorecard?.status === 'scored' ? scorecard.candidateName : 'Candidate';
  const interviewDate =
    scorecard?.status === 'scored' ? scorecard.interviewDate : new Date().toISOString();

  return (
    <>
      <SEO
        title={`Growth plan · ${totalWeeks}-week roadmap`}
        description="Personalized upskilling roadmap based on interview evidence."
        noIndex
      />

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
            Growth plan
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-fg-strong sm:text-3xl">
              Upskilling Roadmap
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-chip px-3 py-1 text-xs font-medium text-fg-muted">
                <Clock className="h-3.5 w-3.5" />
                {totalWeeks} {totalWeeks === 1 ? 'week' : 'weeks'} plan
              </div>
              <ExportDropdown
                candidateName={candidateName}
                interviewDate={interviewDate}
                roadmapData={roadmapData}
                interviewId={interviewId}
              />
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
            A {totalWeeks}-week plan built directly from the interview evidence. Each week targets
            one specific skill gap, with a vetted learning resource from our approved library.
          </p>
        </motion.div>

        <GapsSummary gaps={gaps} />

        <motion.div variants={fadeUp} className="relative space-y-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-semibold text-fg-strong">Week-by-week plan</h2>
            <span className="text-xs text-fg-muted">
              ({roadmap.length} {roadmap.length === 1 ? 'week' : 'weeks'})
            </span>
          </div>

          <div
            className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-accent-500/40 via-line-strong/40 to-transparent sm:left-7"
            aria-hidden="true"
          />

          {roadmap.map((item, index) => {
            const gap = gaps.find((g) => g.skillName === item.skillName);
            const priority = gap?.priority ?? 'MEDIUM';

            return (
              <WeekCard
                key={`${item.week}-${item.skillName}`}
                item={item}
                index={index}
                priority={priority}
              />
            );
          })}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden bg-gradient-to-br from-accent-50 to-surface-card p-6 dark:from-accent-500/5 dark:to-surface-card">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-700 dark:text-accent-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-fg-strong">
                  How this roadmap was built
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  Every skill gap is extracted from the candidate's own words during the interview,
                  not from a fixed template. All learning resources come from a vetted library of
                  official documentation and trusted tutorials.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-between gap-3 pt-2"
        >
          <Link
            to={`/dashboard/${interviewId}/overview`}
            className="text-sm font-semibold text-accent-700 dark:text-accent-300 hover:underline"
          >
            ← Back to overview
          </Link>
          <Link
            to={`/dashboard/${interviewId}/evaluation`}
            className="text-sm font-semibold text-accent-700 dark:text-accent-300 hover:underline"
          >
            View evaluation →
          </Link>
        </motion.div>
      </motion.section>
    </>
  );
}