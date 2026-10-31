import { Link, useParams } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { Card } from '../components/ui'

export function DashboardPlaceholder() {
  const { interviewId } = useParams<{ interviewId: string }>()

  return (
    <>
      <SEO title="Interview report" description="Your interview report is being generated." noIndex />
      <div className="min-h-svh bg-surface">
        <header className="border-b border-line bg-surface-card">
          <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
            <Logo size="sm" />
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-16 animate-fade-up">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-600 uppercase">Analysis queued</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg-strong">Interview report</h1>
          <Card className="mt-6 p-6">
            <p className="text-sm text-fg-muted">The scorecard for this interview is still being generated.</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              Interview ID:
              <code className="rounded-md bg-chip px-2 py-1 font-mono text-xs text-fg-strong">{interviewId}</code>
            </p>
          </Card>
          <Link className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline" to="/upload">← Back to upload</Link>
        </main>
      </div>
    </>
  )
}