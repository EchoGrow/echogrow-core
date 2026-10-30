import { Link, useParams } from 'react-router-dom'

/**
 * Temporary placeholder so the post-upload redirect has a real destination.
 * Replaced by the dashboard shell in #30 and the Overview tab in #20.
 */
export function DashboardPlaceholder() {
  const { interviewId } = useParams<{ interviewId: string }>()

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Interview report</h1>
      <p className="mt-2 text-sm text-slate-600">
        Interview ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{interviewId}</code>
      </p>
      <Link className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline" to="/upload">
        Back to upload
      </Link>
    </main>
  )
}
