import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { Alert, Button, Card, Field, Spinner, Textarea } from '../components/ui'
import { ApiError, createInterview } from '../lib/api'
import { DEMO_CV, DEMO_TRANSCRIPT } from '../lib/demoInterview'
import { cn } from '../lib/cn'

const MIN_TRANSCRIPT = 40
const MIN_CV = 20
const MAX_LENGTH = 100_000

interface FieldErrors {
  transcript?: string
  cv?: string
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn('h-4 w-4', className)}>
      <path
        d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CharCounter({ value }: { value: number }) {
  const nearLimit = value > MAX_LENGTH * 0.9
  return (
    <span className={cn(nearLimit && 'font-medium text-amber-600')}>
      {value.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
    </span>
  )
}

function ValuePoint({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
        <CheckIcon />
      </span>
      <span className="text-sm leading-relaxed text-navy-100">{children}</span>
    </li>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* ambient glow + texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl"
      />
      <div aria-hidden="true" className="bg-dot-grid pointer-events-none absolute inset-0" />

      <div className="relative">
        <Logo variant="light" size="lg" />

        <p className="mt-16 text-xs font-semibold tracking-[0.18em] text-accent-400 uppercase">
          Interview verification
        </p>
        <h2 className="mt-4 max-w-sm text-3xl leading-tight font-semibold tracking-tight text-white text-balance">
          Hire on evidence, not on memory.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-200">
          EchoGrow reads the transcript and the resume together — scoring four dimensions with
          verbatim quotes and flagging every claim that does not line up.
        </p>

        <figure className="mt-8 max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <blockquote className="font-mono text-[13px] leading-relaxed text-navy-100">
            “I led a team of six backend engineers for about two years.”
          </blockquote>
          <figcaption className="mt-3 flex items-center gap-2 text-xs text-accent-300">
            <span className="h-px w-6 bg-accent-400" />
            Resume: Backend Developer — no leadership role
          </figcaption>
        </figure>

        <ul className="mt-8 space-y-3">
          <ValuePoint>Verbatim evidence behind every score</ValuePoint>
          <ValuePoint>Contradictions caught against the resume</ValuePoint>
          <ValuePoint>A three-week plan aimed at the real gap</ValuePoint>
        </ul>
      </div>

      <p className="relative mt-10 text-xs text-navy-400">
        Built for interviewers who have to justify the decision.
      </p>
    </aside>
  )
}

export function UploadPage() {
  const navigate = useNavigate()
  const transcriptInput = useRef<HTMLInputElement>(null)
  const cvInput = useRef<HTMLInputElement>(null)

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

  async function loadTextFile(
    event: ChangeEvent<HTMLInputElement>,
    apply: (text: string) => void,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      apply(text.slice(0, MAX_LENGTH))
      setError(null)
    } catch {
      setError(`Could not read “${file.name}”. Make sure it is a plain text file.`)
    }
  }

  function loadDemo() {
    setTranscript(DEMO_TRANSCRIPT)
    setCv(DEMO_CV)
    setFieldErrors({})
    setError(null)
  }

  return (
    <div className="min-h-svh bg-canvas lg:grid lg:grid-cols-[minmax(0,46%)_minmax(0,1fr)]">
      <BrandPanel />

      <div className="flex min-h-svh flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-6 py-4 lg:hidden">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={loadDemo} disabled={submitting}>
            Load sample
          </Button>
        </header>

        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10 lg:px-12 lg:py-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-accent-600 uppercase">
                New analysis
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
                Analyze an interview
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                Paste both texts below. The report is usually ready within a few seconds.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadDemo}
              disabled={submitting}
              className="hidden lg:inline-flex"
            >
              Load sample data
            </Button>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
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

            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-accent-600">01</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <Field
                id="transcript"
                label="Interview transcript"
                hint={
                  <>
                    Keep the <code className="rounded bg-navy-50 px-1 py-0.5 font-mono text-[11px]">Interviewer:</code>{' '}
                    and <code className="rounded bg-navy-50 px-1 py-0.5 font-mono text-[11px]">Candidate:</code>{' '}
                    labels so each answer can be traced to its question.
                  </>
                }
                error={fieldErrors.transcript}
                counter={<CharCounter value={transcript.trim().length} />}
                action={
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={submitting}
                      onClick={() => transcriptInput.current?.click()}
                    >
                      <UploadIcon />
                      Upload .txt
                    </Button>
                    <input
                      ref={transcriptInput}
                      type="file"
                      accept=".txt,text/plain"
                      className="sr-only"
                      tabIndex={-1}
                      disabled={submitting}
                      onChange={(event) => void loadTextFile(event, setTranscript)}
                    />
                  </>
                }
              >
                <Textarea
                  id="transcript"
                  className="min-h-56 font-mono text-[13px]"
                  placeholder={
                    'Interviewer: Tell me about a time you improved performance…\nCandidate: At my previous company…'
                  }
                  value={transcript}
                  maxLength={MAX_LENGTH}
                  disabled={submitting}
                  invalid={Boolean(fieldErrors.transcript)}
                  onChange={(event) => setTranscript(event.target.value)}
                />
              </Field>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-accent-600">02</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <Field
                id="cv"
                label="Resume"
                hint="Plain text. It is stored unchanged so every claim can be checked against it."
                error={fieldErrors.cv}
                counter={<CharCounter value={cv.trim().length} />}
                action={
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={submitting}
                      onClick={() => cvInput.current?.click()}
                    >
                      <UploadIcon />
                      Upload .txt
                    </Button>
                    <input
                      ref={cvInput}
                      type="file"
                      accept=".txt,text/plain"
                      className="sr-only"
                      tabIndex={-1}
                      disabled={submitting}
                      onChange={(event) => void loadTextFile(event, setCv)}
                    />
                  </>
                }
              >
                <Textarea
                  id="cv"
                  className="min-h-40 font-mono text-[13px]"
                  placeholder={'Name: …\nExperience:\n- Backend Developer, Company (2022 – 2024)'}
                  value={cv}
                  maxLength={MAX_LENGTH}
                  disabled={submitting}
                  invalid={Boolean(fieldErrors.cv)}
                  onChange={(event) => setCv(event.target.value)}
                />
              </Field>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
              <p className="text-xs leading-relaxed text-ink-muted" aria-live="polite">
                {submitting ? (
                  <span className="inline-flex items-center gap-2 text-accent-700">
                    <Spinner className="h-3.5 w-3.5" label="Analyzing" />
                    Analyzing transcript &amp; generating the evidence-based report…
                  </span>
                ) : (
                  'Text only — no audio upload.'
                )}
              </p>
              <Button type="submit" size="lg" loading={submitting} disabled={submitting}>
                Analyze Interview
              </Button>
            </div>
          </form>
        </main>

        <footer className="mx-auto w-full max-w-xl px-6 pb-8 text-xs text-ink-subtle lg:px-12">
          EchoGrow scores Technical Depth, Communication, Domain Experience and Problem Solving.
        </footer>
      </div>
    </div>
  )
}
