import { useScorecard } from '../../lib/scorecard/useScorecard'
import { Alert, Button, Card, Spinner } from '../../components/ui'
import { Link, useParams } from 'react-router-dom'
import { ReviewBanner } from '../../components/ui/ReviewBanner'

export function EvaluationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { status, scorecard, error, refresh } = useScorecard()

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <Spinner className="mx-auto h-6 w-6" />
        <h2 className="mt-4 text-lg font-semibold text-fg-strong">Analysis in progress</h2>
        <p className="mt-2 text-sm text-fg-muted">The evaluation is being generated. Please wait.</p>
        <Button className="mt-4" variant="secondary" onClick={refresh}>Check again</Button>
      </Card>
    )
  }

  // حالة needs-review: عرض رسالة توجيه للمراجعة
  if (status === 'needs-review') {
    return <ReviewBanner />
  }

  if (status === 'not-found') {
    return (
      <Alert variant="error" title="Interview not found">
        This interview does not exist or was removed.
      </Alert>
    )
  }

  if (status === 'error' || !scorecard || scorecard.status !== 'scored') {
    return (
      <Alert
        variant="error"
        title="Could not load the evaluation"
        action={<Button size="sm" variant="secondary" onClick={refresh}>Retry</Button>}
      >
        {error ?? 'Something went wrong.'}
      </Alert>
    )
  }

  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
          Evaluation
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong">Interview Evaluation</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Review the candidate's performance across four dimensions, backed by verbatim evidence from the transcript.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scorecard.dimensions?.map((dim) => (
          <Card key={dim.name} className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-fg-strong">{dim.name}</h3>
              <span className="rounded-lg bg-chip px-3 py-1 text-sm font-semibold text-accent-700 dark:text-accent-300">
                {dim.score} / 5
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{dim.reason}</p>
            
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-accent-700 dark:text-accent-300 hover:underline">
                View evidence
              </summary>
              <blockquote className="mt-3 border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
                "{dim.evidenceQuote}"
                {dim.timestamp && (
                  <span className="ml-2 block text-xs not-italic text-fg-subtle">
                    — {dim.timestamp}
                  </span>
                )}
              </blockquote>
            </details>
          </Card>
        ))}
      </div>

      <Link
        to={`/dashboard/${interviewId}/overview`}
        className="inline-block text-sm font-semibold text-accent-700 dark:text-accent-300 hover:underline"
      >
        ← Back to overview
      </Link>
    </section>
  )
}