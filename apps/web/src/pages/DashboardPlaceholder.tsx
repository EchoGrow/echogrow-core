import { Link, useParams } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { Card } from '../components/ui'

/**
 * Temporary placeholder so the post-upload redirect has a real destination.
 * Replaced by the dashboard shell in #30 and the Overview tab in #20.
 */
export function DashboardPlaceholder() {
  const { interviewId } = useParams<{ interviewId: string }>()

  return (
    <div className="min-h-svh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-600 uppercase">
          Analysis queued
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">
          Interview report
        </h1>

        <Card className="mt-6 p-6">
          <p className="text-sm text-ink-muted">
            The scorecard for this interview is still being generated.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            Interview ID:
            <code className="rounded-md bg-navy-50 px-2 py-1 font-mono text-xs text-navy-800">
              {interviewId}
            </code>
          </p>
        </Card>

        <Link
          className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline"
          to="/upload"
        >
          ← Back to upload
        </Link>
      </main>
    </div>
  )
}
