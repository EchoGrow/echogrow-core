import { useState } from 'react';
import { useScorecard } from '../../lib/scorecard/useScorecard';
import { Card } from '../../components/ui';
import { Link, useParams } from 'react-router-dom';
import { ReviewBanner } from '../../components/ui/ReviewBanner';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronDown } from 'lucide-react';
import { fadeUp, staggerContainer } from '../../lib/animations';
import { cn } from '../../lib/cn';

function EvaluationSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading evaluation…</span>

      <div>
        <div className="h-3 w-24 rounded skeleton" />
        <div className="mt-2 h-8 w-56 rounded-lg skeleton" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded skeleton" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface-card p-6 min-h-[220px]">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-36 rounded skeleton" />
              <div className="h-8 w-16 rounded-lg skeleton" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full rounded skeleton" />
              <div className="h-4 w-5/6 rounded skeleton" />
              <div className="h-4 w-2/3 rounded skeleton" />
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded skeleton" />
                <div className="h-4 w-4 rounded skeleton" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvaluationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const { status, scorecard, error, retryAll } = useScorecard();

  const [openDimension, setOpenDimension] = useState<string | null>(null);

  if (status === 'loading' || status === 'processing') {
    return <EvaluationSkeleton />;
  }

  if (status === 'needs-review') {
    return <ReviewBanner />;
  }

  if (status === 'not-found') {
    return (
      <DashboardErrorState
        title="Interview not found"
        message="This interview does not exist or was removed."
        onRetry={retryAll}
        backHref={`/dashboard/${interviewId}/overview`}
      />
    );
  }

  if (status === 'error' || !scorecard || scorecard.status !== 'scored') {
    return (
      <DashboardErrorState
        title="Could not load the evaluation"
        message={error ?? 'Something went wrong while loading the evaluation.'}
        onRetry={retryAll}
        backHref={`/dashboard/${interviewId}/overview`}
      />
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
          Evaluation
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">Interview Evaluation</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Review the candidate's performance across four dimensions, backed by verbatim evidence from the transcript.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
        {scorecard.dimensions?.map((dim) => {
          const isOpen = openDimension === dim.name;
          
          return (
            <motion.div 
              key={dim.name} 
              variants={fadeUp} 
            >
              <Card className={cn(
                "flex flex-col p-6 transition-all duration-300 hover:shadow-lift hover:border-line-strong",
                "min-h-[220px]",
                isOpen && "border-accent-500 ring-1 ring-accent-500/20 shadow-lift"
              )}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-fg-strong">{dim.name}</h3>
                  <span className={cn(
                    "shrink-0 rounded-lg px-3 py-1 text-sm font-semibold",
                    dim.score < 3 ? "bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500" :
                    dim.score === 3 ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500" :
                    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500"
                  )}>
                    {dim.score} / 5
                  </span>
                </div>
                
                <p className="mt-3 flex-1 text-sm leading-relaxed text-fg-muted">
                  {dim.reason}
                </p>
                
                <div className="mt-4 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => setOpenDimension(isOpen ? null : dim.name)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-300 dark:hover:text-accent-200"
                  >
                    <span className="flex items-center gap-2">
                      <Quote className="h-3.5 w-3.5" />
                      {isOpen ? 'Hide evidence' : 'View evidence'}
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )} />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <blockquote className="mt-3 rounded-r-lg border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                          "{dim.evidenceQuote}"
                          {dim.timestamp && (
                            <span className="ml-2 block text-xs not-italic text-fg-subtle">
                              — {dim.timestamp}
                            </span>
                          )}
                        </blockquote>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <motion.div variants={fadeUp}>
        <Link
          to={`/dashboard/${interviewId}/overview`}
          className="inline-block text-sm font-semibold text-accent-700 dark:text-accent-300 hover:underline"
        >
          ← Back to overview
        </Link>
      </motion.div>
    </motion.section>
  );
}