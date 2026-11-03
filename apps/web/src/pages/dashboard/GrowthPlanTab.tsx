import { useScorecard } from '../../lib/scorecard/useScorecard'
import { Card, Spinner } from '../../components/ui'
import { useParams, Link } from 'react-router-dom'
import { ReviewBanner } from '../../components/ui/ReviewBanner'

export function GrowthPlanTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { status, scorecard } = useScorecard()

  if (status === 'loading') {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  if (status === 'needs-review') {
    return <ReviewBanner />
  }

  if (status !== 'ready' || !scorecard || scorecard.status !== 'scored') {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-fg-strong">Growth plan</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Skill gaps turned into a three-week plan will appear here. This feature is coming soon.
        </p>
        <Link to={`/dashboard/${interviewId}/overview`} className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300">
          ← Back to overview
        </Link>
      </Card>
    )
  }

  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
          Growth plan
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong">Upskilling Roadmap</h2>
        <p className="mt-2 text-sm text-fg-muted">
          A three-week plan built from the interview itself.
        </p>
      </div>
      
      <Card className="p-8 text-center">
        <p className="text-sm text-fg-muted">
          This feature will be implemented in Sprint 3 (Issue #38).
        </p>
      </Card>
    </section>
  )
}