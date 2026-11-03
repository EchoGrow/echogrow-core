import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/brand/Logo'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Card, Spinner, Alert, Button, toast } from '../../components/ui'
import { getScorecard, forceEvaluation, rejectInterview } from '../../lib/api'
import type { NeedsReviewResponse } from '../../lib/api'

export function ReviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<NeedsReviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!interviewId) return
    getScorecard(interviewId)
      .then((res) => {
        if (res.status === 'needs_review') {
          setData(res as NeedsReviewResponse)
        } else if (res.status === 'rejected') {
          toast.error('Interview Rejected', { description: 'This interview was rejected and cannot be reviewed.' })
          navigate('/upload')
        } else {
          setError('This interview does not require manual review.')
        }
      })
      .catch((err) => setError(err.message))
  }, [interviewId, navigate])

  const handleProceed = async () => {
    if (!interviewId) return
    setIsProcessing(true)
    try {
      await forceEvaluation(interviewId)
      toast.success('Evaluation queued', { description: 'The worker will process it shortly.' })
      setTimeout(() => {
        navigate(`/dashboard/${interviewId}/overview`)
      }, 1000)
    } catch (err) {
      toast.error('Failed to proceed', { description: err instanceof Error ? err.message : 'Unknown error' })
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!interviewId) return
    setIsProcessing(true)
    try {
      await rejectInterview(interviewId)
      toast.success('Interview rejected', { description: 'The candidate will be notified.' })
      navigate('/upload')
    } catch (err) {
      toast.error('Failed to reject', { description: err instanceof Error ? err.message : 'Unknown error' })
      setIsProcessing(false)
    }
  }

  if (error) return <div className="p-10 text-center text-danger-500">{error}</div>
  if (!data) return <div className="flex justify-center p-20"><Spinner className="h-8 w-8" /></div>

  const wordCount = data.transcript.split(/\s+/).length
  const hasNoise = /\[inaudible|\[static|\[audio cuts/i.test(data.transcript)
  const hasFillers = /\b(um|uh|like)\b/i.test(data.transcript)

  return (
    <div className="min-h-svh bg-surface">
      <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur">
        <div className="container-custom flex h-16 items-center justify-between max-w-5xl">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
      </header>

      <main className="container-custom max-w-5xl py-10 animate-fade-up">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-warning-700 uppercase dark:text-warning-500">
            Manual Review
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-fg-strong">{data.candidateName}</h1>
          <p className="mt-1 text-sm text-fg-muted">Interview ID: {data.interviewId}</p>
        </div>

        <Alert variant="error" title="Low-confidence transcript">
          {data.message}
        </Alert>

        <Card className="mt-6 p-6">
          <h2 className="text-base font-semibold text-fg-strong mb-3">Why is this flagged?</h2>
          <ul className="space-y-2 text-sm text-fg-muted">
            <li>• <strong>Confidence score:</strong> {data.confidence} (threshold: 0.6)</li>
            <li>• <strong>Word count:</strong> {wordCount} words {wordCount < 50 && '(too short)'}</li>
            <li>• <strong>Noise indicators:</strong> {hasNoise ? 'Yes (inaudible/static detected)' : 'None'}</li>
            <li>• <strong>Filler words:</strong> {hasFillers ? 'Excessive (um, uh, like)' : 'None'}</li>
          </ul>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-fg-strong mb-2">Interview Transcript</h2>
            <pre className="max-h-96 overflow-auto rounded-lg bg-chip p-4 text-xs font-mono text-fg whitespace-pre-wrap">
              {data.transcript}
            </pre>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-fg-strong mb-2">Resume</h2>
            <pre className="max-h-96 overflow-auto rounded-lg bg-chip p-4 text-xs font-mono text-fg whitespace-pre-wrap">
              {data.resume}
            </pre>
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <h2 className="text-base font-semibold text-fg-strong mb-3">Reviewer Decision</h2>
          <p className="text-sm text-fg-muted mb-4">
            If the transcript is usable, proceed with scoring. Otherwise, reject and ask the candidate to re-upload.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={handleProceed} loading={isProcessing} disabled={isProcessing}>
              Proceed with Scoring
            </Button>
            <Button variant="secondary" onClick={handleReject} disabled={isProcessing}>
              Reject & Request Re-upload
            </Button>
            <Link to="/upload">
              <Button variant="ghost">Back to Upload</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}