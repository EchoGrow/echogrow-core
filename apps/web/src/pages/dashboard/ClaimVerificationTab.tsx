import { useScorecard } from '../../lib/scorecard/useScorecard'
import { Card, Spinner } from '../../components/ui'
import { useParams, Link } from 'react-router-dom'
import { ReviewBanner } from '../../components/ui/ReviewBanner'

export function ClaimVerificationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { status, scorecard, refresh } = useScorecard()

  if (status === 'loading') {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  if (status === 'needs-review') {
    return <ReviewBanner />
  }

  if (status !== 'ready' || !scorecard || scorecard.status !== 'scored') {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-fg-strong">Claim verification</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Every claim that clashes with the resume will appear here. This feature is coming soon.
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
          Claim verification
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong">Verification</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Claims that clash with the resume will be displayed here for a human decision.
        </p>
      </div>
      
      <Card className="p-8 text-center">
        <p className="text-sm text-fg-muted">
          This feature will be implemented in Sprint 2 (Issue #28).
        </p>
      </Card>
    </section>
  )
} 