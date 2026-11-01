import { Link, useParams } from 'react-router-dom'
import { SEO } from '../../components/SEO'
import { Card } from '../../components/ui'

interface ComingSoonTabProps {
  title: string
  description: string
  /** GitHub issue that owns the real implementation. */
  issue: number
}

/**
 * Placeholder for tabs whose issues have not landed yet. The navigation and
 * routes already exist (#30) so the shell does not change when #21, #28 and
 * #38 fill them in.
 */
export function ComingSoonTab({ title, description, issue }: ComingSoonTabProps) {
  const { interviewId = '' } = useParams<{ interviewId: string }>()

  return (
    <>
      <SEO title={title} description={description} noIndex />

      <Card className="mx-auto max-w-xl p-8 text-center animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-chip px-3 py-1 text-xs font-medium text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-glow" aria-hidden="true" />
          In progress
        </span>

        <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg-strong">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>

        <p className="mt-4 text-xs text-fg-muted">
          Tracked in{' '}
          <a
            href={`https://github.com/EchoGrow/echogrow-core/issues/${issue}`}
            className="font-semibold text-accent-700 hover:underline dark:text-accent-300"
            target="_blank"
            rel="noreferrer"
          >
            issue #{issue}
          </a>
          .
        </p>

        <Link
          to={`/dashboard/${interviewId}/overview`}
          className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
        >
          <span aria-hidden="true">←</span> Back to overview
        </Link>
      </Card>
    </>
  )
}
