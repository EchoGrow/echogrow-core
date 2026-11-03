import { Link, useParams } from 'react-router-dom'
import { Card } from './Card'
import { Button } from './Button'

export function ReviewBanner() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  
  return (
    <Card className="mx-auto max-w-xl p-8 text-center animate-fade-up">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 className="mt-5 text-lg font-semibold text-warning-700 dark:text-warning-500">
        Manual review required
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
        This interview has a low-confidence transcript. A human reviewer must check the transcript before we can generate this tab.
      </p>
      <Link to={`/dashboard/${interviewId}/review`}>
        <Button className="mt-6" variant="primary">
          Go to Human Review
        </Button>
      </Link>
    </Card>
  )
}