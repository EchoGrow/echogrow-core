
import { Link, useParams } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { DashboardNavigation } from '../components/dashboard/DashboardNavigation'
import { Card } from '../components/ui'

export function DashboardPlaceholder() {
  const { interviewId } = useParams<{ interviewId: string }>()

  return (
    <>
      <SEO
        title="Interview Overview"
        description="Overview of your interview report."
        noIndex
      />

      <div className="min-h-svh bg-surface">
        <header className="border-b border-line bg-surface-card">
          <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
            <Logo size="sm" />

            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <DashboardNavigation interviewId={interviewId ?? ''} />

        <main className="mx-auto max-w-5xl px-6 py-10 animate-fade-up">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent-600 uppercase">
              Interview Report
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg-strong">
              Interview Overview
            </h1>

            <p className="mt-3 text-sm text-fg-muted">
              Interview ID: {interviewId}
            </p>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-fg-strong">
              Overview
            </h2>

            <p className="mt-2 text-sm text-fg-muted">
              General interview information will appear here.
            </p>
          </Card>

          <Link
            className="mt-8 inline-block text-sm font-semibold text-accent-700 hover:underline"
            to="/upload"
          >
            ← Back to upload
          </Link>
        </main>
      </div>
    </>
  )
}
