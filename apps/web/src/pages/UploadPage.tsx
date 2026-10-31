import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button, Card, Dropzone, Field, Spinner, Textarea, toast } from '../components/ui'
import { ApiError, createInterview } from '../lib/api'
import { DEMO_SCENARIOS } from '../lib/demoInterview'
import { extractPdfText } from '../lib/pdf'
import { cn } from '../lib/cn'

const MIN_TRANSCRIPT = 40
const MIN_CV = 20
const MAX_LENGTH = 100_000

interface FieldErrors {
  transcript?: string
  cv?: string
}

function CharCounter({ value }: { value: number }) {
  const nearLimit = value > MAX_LENGTH * 0.9
  return (
    <span className={cn(nearLimit && 'font-medium text-warning-700')}>
      {value.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
    </span>
  )
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500/15 font-mono text-xs font-semibold text-accent-700 dark:text-accent-300">
      {String(step).padStart(2, '0')}
    </span>
  )
}

function SampleMenu({ disabled, onPick }: { disabled: boolean; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        Load sample
        <svg viewBox="0 0 20 20" fill="currentColor" className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}>
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </Button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface-card shadow-lift animate-scale-in">
            {DEMO_SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-chip"
                onClick={() => {
                  setOpen(false)
                  onPick(s.id)
                }}
              >
                <span className="block text-sm font-semibold text-fg-strong">{s.label}</span>
                <span className="mt-0.5 block text-xs text-fg-muted">{s.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function IconQuote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M9 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v2a2 2 0 0 1-2 2H4m15-11h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v2a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M5 21V4m0 0h9l-1.5 4H5m0 4h11l-1.5 4H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPath() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M4 19h4v-6H4v6Zm6 0h4V9h-4v10Zm6 0h4V5h-4v14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UploadPage() {
  const navigate = useNavigate()
  const [transcript, setTranscript] = useState('')
  const [cv, setCv] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (transcript.trim().length < MIN_TRANSCRIPT) errors.transcript = `Paste at least ${MIN_TRANSCRIPT} characters of interview transcript.`
    if (cv.trim().length < MIN_CV) errors.cv = `Upload or paste at least ${MIN_CV} characters of resume text.`
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Missing text', { description: 'Fill in both the transcript and the resume before analyzing.' })
      return
    }
    setSubmitting(true)
    try {
      const { interviewId } = await createInterview({ transcript: transcript.trim(), cv: cv.trim() })
      toast.success('Analysis started', { description: 'Redirecting to the report…' })
      navigate(`/dashboard/${interviewId}/overview`, { replace: true })
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : 'Something went wrong while starting the analysis. Please try again.'
      toast.error('Could not start the analysis', { description: message })
      setSubmitting(false)
    }
  }

  function loadScenario(id: string) {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id)
    if (!scenario) return
    setTranscript(scenario.transcript)
    setCv(scenario.cv)
    setFieldErrors({})
    toast.success('Sample loaded', { description: scenario.label })
  }

  // ✅ معالجة ملف الـ Transcript (TXT)
  async function handleTranscriptFile(file: File) {
    try {
      const text = await file.text()
      if (!text.trim()) {
        toast.error('Empty file', { description: 'The text file is empty. Try another file.' })
        return
      }
      setTranscript(text.slice(0, MAX_LENGTH))
      toast.success('Transcript loaded', { description: `${file.name} → ${text.length.toLocaleString()} characters` })
    } catch {
      toast.error('Could not read file', { description: 'Make sure it is a valid text file.' })
    }
  }

  // ✅ معالجة ملف الـ CV (PDF أو TXT)
  async function handleCvFile(file: File) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    
    try {
      let text = ''
      
      if (isPdf) {
        toast.loading('Extracting PDF text…', { id: 'cv-extract' })
        text = await extractPdfText(file)
        toast.dismiss('cv-extract')
      } else {
        text = await file.text()
      }

      if (!text.trim()) {
        toast.error('Empty file', { description: 'Could not extract any text. Try a different file or paste the text.' })
        return
      }

      setCv(text.slice(0, MAX_LENGTH))
      toast.success('Resume extracted', { description: `${file.name} → ${text.length.toLocaleString()} characters` })
    } catch (error) {
      toast.dismiss('cv-extract')
      toast.error('Could not read file', { description: 'Try a different file or paste the resume text.' })
    }
  }

  return (
    <>
      <SEO
        title="Analyze an interview"
        description="Upload an interview transcript and a resume (PDF or text). EchoGrow scores four dimensions with verbatim evidence, flags contradictions, and drafts a three-week plan."
        url="https://echogrow.app/upload"
      />
      <div className="min-h-svh bg-surface">
        <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur">
          <div className="container-custom flex h-16 items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <SampleMenu disabled={submitting} onPick={loadScenario} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container-custom max-w-4xl py-10 lg:py-16 animate-fade-up">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-chip px-3 py-1 text-xs font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-glow" />
              Evidence-based candidate vetting
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">
              Turn an interview into <span className="text-accent-600 dark:text-accent-400">evidence</span>.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
              Upload the transcript and the resume. EchoGrow scores four dimensions with verbatim quotes, flags every contradiction, and drafts a three-week plan aimed at the real gap.
            </p>
          </div>

          <form className="mt-10 space-y-6" onSubmit={handleSubmit} noValidate>
            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <StepBadge step={1} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-fg-strong">Interview transcript</h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    Keep the <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-[12px]">Interviewer:</code> and{' '}
                    <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-[12px]">Candidate:</code> labels so each answer can be traced.
                  </p>
                </div>
              </div>

              <Field id="transcript" label="" error={fieldErrors.transcript} counter={<CharCounter value={transcript.trim().length} />} className="mt-5">
                <Dropzone
                  id="transcript-file"
                  accept=".txt,text/plain"
                  hint="Drop a .txt file, or paste below"
                  disabled={submitting}
                  onFile={handleTranscriptFile}
                  onError={(msg) => toast.error('Could not read file', { description: msg })}
                  className="mb-4"
                />
                <Textarea
                  id="transcript"
                  className="min-h-56 font-mono text-[13px]"
                  placeholder={'Interviewer: Tell me about a time you improved performance…\nCandidate: At my previous company…'}
                  value={transcript}
                  maxLength={MAX_LENGTH}
                  disabled={submitting}
                  invalid={Boolean(fieldErrors.transcript)}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </Field>
            </Card>

            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <StepBadge step={2} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-fg-strong">Resume (PDF or text)</h2>
                  <p className="mt-1 text-sm text-fg-muted">Upload the candidate's resume. We extract the text so every claim can be checked.</p>
                </div>
              </div>

              <Field id="cv" label="" error={fieldErrors.cv} counter={<CharCounter value={cv.trim().length} />} className="mt-5">
                <Dropzone
                  id="cv-file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  hint="Drop a PDF or .txt file"
                  disabled={submitting}
                  onFile={handleCvFile}
                  onError={(msg) => toast.error('Could not read file', { description: msg })}
                  className="mb-4"
                />
                <Textarea
                  id="cv"
                  className="min-h-40 font-mono text-[13px]"
                  placeholder="The extracted resume text will appear here. You can also paste it manually."
                  value={cv}
                  maxLength={MAX_LENGTH}
                  disabled={submitting}
                  invalid={Boolean(fieldErrors.cv)}
                  onChange={(e) => setCv(e.target.value)}
                />
              </Field>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface-card p-4 sm:p-5">
              <p className="text-xs leading-relaxed text-fg-muted" aria-live="polite">
                {submitting ? (
                  <span className="inline-flex items-center gap-2 text-accent-700 dark:text-accent-300">
                    <Spinner className="h-3.5 w-3.5" label="Analyzing" />
                    Analyzing transcript &amp; generating the evidence-based report…
                  </span>
                ) : null}
              </p>
              <Button type="submit" size="lg" loading={submitting} disabled={submitting}>
                Analyze interview
              </Button>
            </div>
          </form>

          <div className="mt-16 grid gap-6 sm:grid-cols-3 stagger">
            <div className="flex flex-col items-center text-center rounded-card border border-line bg-surface-card p-6 transition-all hover:shadow-lift hover:border-line-strong">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 mb-4">
                <IconQuote />
              </div>
              <h3 className="text-base font-semibold text-fg-strong">Evidence, not opinion</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">Every score carries a verbatim quote from the transcript, so decisions are defensible.</p>
            </div>
            <div className="flex flex-col items-center text-center rounded-card border border-line bg-surface-card p-6 transition-all hover:shadow-lift hover:border-line-strong">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 mb-4">
                <IconFlag />
              </div>
              <h3 className="text-base font-semibold text-fg-strong">Contradictions surfaced</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">Claims that clash with the resume are flagged for human review, not auto-rejected.</p>
            </div>
            <div className="flex flex-col items-center text-center rounded-card border border-line bg-surface-card p-6 transition-all hover:shadow-lift hover:border-line-strong">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 mb-4">
                <IconPath />
              </div>
              <h3 className="text-base font-semibold text-fg-strong">A plan, not a verdict</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">Weak dimensions become a three-week plan built from the interview itself.</p>
            </div>
          </div>
        </main>

        <footer className="container-custom max-w-4xl pb-10 text-center text-xs text-fg-subtle">
          <p>EchoGrow turns an interview into structured evidence, verifies claims against the resume, and guides the candidate's next step.</p>
        </footer>
      </div>
    </>
  )
}