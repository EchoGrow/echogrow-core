import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Spinner, Textarea } from '../components/ui'
import { ApiError, createInterview } from '../lib/api'
import { DEMO_CV, DEMO_TRANSCRIPT } from '../lib/demoInterview'

const MIN_TRANSCRIPT = 40
const MIN_CV = 20
const MAX_LENGTH = 100_000

interface FieldErrors {
  transcript?: string
  cv?: string
}

export function UploadPage() {
  const navigate = useNavigate()

  const [transcript, setTranscript] = useState('')
  const [cv, setCv] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (transcript.trim().length < MIN_TRANSCRIPT) {
      errors.transcript = `Paste at least ${MIN_TRANSCRIPT} characters of interview transcript.`
    }
    if (cv.trim().length < MIN_CV) {
      errors.cv = `Paste at least ${MIN_CV} characters of resume text.`
    }
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setError(null)

    try {
      const { interviewId } = await createInterview({
        transcript: transcript.trim(),
        cv: cv.trim(),
      })
      navigate(`/dashboard/${interviewId}/overview`, { replace: true })
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Something went wrong while starting the analysis. Please try again.',
      )
      setSubmitting(false)
    }
  }

  async function loadTextFile(event: ChangeEvent<HTMLInputElement>, apply: (text: string) => void) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      apply(text.slice(0, MAX_LENGTH))
      setError(null)
    } catch {
      setError(`Could not read "${file.name}". Make sure it is a plain text file.`)
    }
  }

  function loadDemo() {
    setTranscript(DEMO_TRANSCRIPT)
    setCv(DEMO_CV)
    setFieldErrors({})
    setError(null)
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              EG
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">EchoGrow</p>
              <p className="text-xs text-slate-500">Interview verification</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadDemo} disabled={submitting}>
            Load demo interview
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Analyze an interview
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Paste the interview transcript and the candidate&apos;s resume. EchoGrow scores four
            dimensions with verbatim evidence, flags contradictions, and builds an evidence-based
            growth plan.
          </p>
        </div>

        <form className="mt-8 grid gap-6" onSubmit={handleSubmit} noValidate>
          {error ? (
            <Alert
              variant="error"
              title="Could not start the analysis"
              action={
                <Button size="sm" variant="secondary" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label htmlFor="transcript" className="text-sm font-semibold text-slate-900">
                  Interview transcript
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Use <code className="rounded bg-slate-100 px-1">Interviewer:</code> and{' '}
                  <code className="rounded bg-slate-100 px-1">Candidate:</code> prefixes so the
                  answers can be traced back to their questions.
                </p>
              </div>
              <label className="cursor-pointer text-xs font-medium text-brand-700 hover:underline">
                Upload .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="sr-only"
                  disabled={submitting}
                  onChange={(event) => void loadTextFile(event, setTranscript)}
                />
              </label>
            </div>

            <Textarea
              id="transcript"
              className="mt-3 min-h-56 font-mono text-[13px] leading-relaxed"
              placeholder={'Interviewer: Tell me about a time you improved performance...\nCandidate: At my previous company...'}
              value={transcript}
              maxLength={MAX_LENGTH}
              disabled={submitting}
              invalid={Boolean(fieldErrors.transcript)}
              onChange={(event) => setTranscript(event.target.value)}
            />
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
              <p id="transcript-error" className="text-red-600">
                {fieldErrors.transcript ?? ''}
              </p>
              <p className="shrink-0 tabular-nums text-slate-400">
                {transcript.trim().length.toLocaleString()} chars
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label htmlFor="cv" className="text-sm font-semibold text-slate-900">
                  Resume
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Plain text only. The original text is stored unchanged for claim verification.
                </p>
              </div>
              <label className="cursor-pointer text-xs font-medium text-brand-700 hover:underline">
                Upload .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="sr-only"
                  disabled={submitting}
                  onChange={(event) => void loadTextFile(event, setCv)}
                />
              </label>
            </div>

            <Textarea
              id="cv"
              className="mt-3 min-h-40 font-mono text-[13px] leading-relaxed"
              placeholder={'Name: ...\nExperience:\n- Backend Developer, Company (2022 - 2024)'}
              value={cv}
              maxLength={MAX_LENGTH}
              disabled={submitting}
              invalid={Boolean(fieldErrors.cv)}
              onChange={(event) => setCv(event.target.value)}
            />
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
              <p id="cv-error" className="text-red-600">
                {fieldErrors.cv ?? ''}
              </p>
              <p className="shrink-0 tabular-nums text-slate-400">
                {cv.trim().length.toLocaleString()} chars
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Text only — no audio upload. Analysis usually takes a few seconds.
            </p>
            <Button type="submit" size="md" loading={submitting} disabled={submitting}>
              {submitting ? 'Analyzing transcript & generating report...' : 'Analyze Interview'}
            </Button>
          </div>

          {submitting ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Spinner className="h-3.5 w-3.5 text-brand-600" label="Analyzing" />
              Analyzing transcript &amp; generating evidence-based report...
            </p>
          ) : null}
        </form>
      </main>
    </div>
  )
}
