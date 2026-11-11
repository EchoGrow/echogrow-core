import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FileUser,
  Layers,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { MultiDropzone } from '../components/bulk/MultiDropzone'
import { StatusPill } from '../components/bulk/StatusPill'
import { Alert, Button, Card, Spinner, toast } from '../components/ui'
import { ApiError, bulkUploadInterviews, getScorecard } from '../lib/api'
import type { BulkUploadResponse, RejectedFileRecord, ScorecardResponse } from '../lib/api'
import {
  MAX_BULK_CANDIDATES,
  MAX_BULK_FILE_BYTES,
  buildCandidates,
  formatBytes,
  inferKind,
  isTerminalStatus,
  isValidEmail,
  mergeCandidates,
  metadataTemplate,
  progressForStatus,
  rowIssues,
  toMetadata,
  toUploadableFile,
} from '../lib/bulkUpload'
import type { CandidateDraft, PickedFile, RowStatus } from '../lib/bulkUpload'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/animations'

/** Status polling cadence and the point where the page stops waiting. */
const POLL_INTERVAL_MS = 3_000
const MAX_POLL_MS = 3 * 60 * 1000

interface RowState {
  status: RowStatus
  interviewId?: string
  error?: string
  progress?: { isScored: boolean; isVerified: boolean; isPlanned: boolean }
}

interface Summary {
  total: number
  inProgress: number
  scored: number
  needsReview: number
  failed: number
}

let fileSeq = 0

function nextFileId(): string {
  fileSeq += 1
  return `file-${fileSeq}-${Date.now()}`
}

/** Maps a scorecard response onto the row state used by the table. */
function toRowState(response: ScorecardResponse): RowState {
  switch (response.status) {
    case 'scored': {
      const progress = response.progress
      const done = !progress || (progress.isScored && progress.isVerified && progress.isPlanned)
      return { status: done ? 'scored' : 'processing', progress }
    }
    case 'processing':
      return { status: 'processing', progress: response.progress }
    case 'needs_review':
      return { status: 'needs_review' }
    case 'rejected':
      return { status: 'rejected', error: response.message }
    case 'failed':
      return { status: 'failed', error: response.message }
  }
}

function progressColor(status: RowStatus): string {
  switch (status) {
    case 'scored':
      return 'bg-success-500'
    case 'needs_review':
      return 'bg-warning-500'
    case 'rejected':
    case 'failed':
    case 'error':
      return 'bg-danger-500'
    case 'processing':
      return 'bg-accent-500'
    default:
      return 'bg-line-strong'
  }
}

const STEPS = [
  {
    icon: FileText,
    title: '1. Pair the files',
    desc: 'Give each pair the same prefix, e.g. ahmed-transcript.txt and ahmed-cv.pdf. EchoGrow groups them for you.',
  },
  {
    icon: CheckCircle2,
    title: '2. Review the rows',
    desc: 'Names and emails are pre-filled from the file names. Correct anything that is wrong before submitting.',
  },
  {
    icon: TrendingUp,
    title: '3. Track progress',
    desc: 'Queued candidates move to scored or needs-review, and every finished row links to its dashboard.',
  },
]

const inputBase =
  'w-full rounded-lg border bg-surface-card px-3 py-2 text-sm text-fg transition-all focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60'

function FileCell({
  picked,
  onRemove,
  disabled,
}: {
  picked: PickedFile | null
  onRemove: () => void
  disabled: boolean
}) {
  if (!picked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-500">
        <XCircle className="h-3.5 w-3.5" />
        Missing
      </span>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 max-w-[190px]">
        <p className="truncate text-[13px] font-medium text-fg" title={picked.file.name}>
          {picked.file.name}
        </p>
        <p className="text-xs text-fg-muted">{formatBytes(picked.file.size)}</p>
      </div>
      {!disabled ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${picked.file.name}`}
          className="mt-0.5 rounded-md p-1 text-fg-muted transition-colors hover:bg-chip hover:text-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', tone ?? 'text-fg-strong')}>{value}</p>
    </div>
  )
}

export function BulkUploadPage() {
  const [files, setFiles] = useState<PickedFile[]>([])
  const [rows, setRows] = useState<CandidateDraft[]>([])
  const [localRejected, setLocalRejected] = useState<RejectedFileRecord[]>([])
  const [rowState, setRowState] = useState<Record<string, RowState>>({})
  const [response, setResponse] = useState<BulkUploadResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [polling, setPolling] = useState(false)

  const rowStateRef = useRef<Record<string, RowState>>({})

  useEffect(() => {
    rowStateRef.current = rowState
  }, [rowState])

  const busy = submitting || response !== null
  const issues = useMemo(() => rowIssues(rows), [rows])
  const issueCount = Object.keys(issues).length

  const rejectedFiles = useMemo(() => {
    const seen = new Set<string>()
    const combined = [...localRejected, ...(response?.rejectedFiles ?? [])]

    return combined.filter((file) => {
      const key = `${file.filename}|${file.reason}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [localRejected, response])

  const summary = useMemo<Summary>(() => {
    const statuses = rows.map((row) => rowState[row.key]?.status ?? 'ready')

    return {
      total: rows.length,
      inProgress: statuses.filter((status) => status === 'queued' || status === 'processing').length,
      scored: statuses.filter((status) => status === 'scored').length,
      needsReview: statuses.filter((status) => status === 'needs_review').length,
      failed: statuses.filter(
        (status) => status === 'failed' || status === 'error' || status === 'rejected',
      ).length,
    }
  }, [rows, rowState])

  const canSubmit =
    rows.length > 0 &&
    rows.length <= MAX_BULK_CANDIDATES &&
    issueCount === 0 &&
    !submitting &&
    response === null

  /* ------------------------------------------------------------------ */
  /* Polling                                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!polling) return

    let cancelled = false
    let inFlight = false
    const startedAt = Date.now()

    const finishWithTimeout = () => {
      const next = { ...rowStateRef.current }
      for (const [key, state] of Object.entries(next)) {
        if (state.interviewId && !isTerminalStatus(state.status)) {
          next[key] = {
            ...state,
            status: 'failed',
            error: 'Still processing after 3 minutes. Open the dashboard to check the result.',
          }
        }
      }
      rowStateRef.current = next
      setRowState(next)
      setPolling(false)
    }

    const tick = async () => {
      if (inFlight) return
      inFlight = true

      try {
        const pending = Object.entries(rowStateRef.current).filter(
          ([, state]) => state.interviewId && !isTerminalStatus(state.status),
        )

        if (pending.length === 0) {
          setPolling(false)
          return
        }

        if (Date.now() - startedAt >= MAX_POLL_MS) {
          finishWithTimeout()
          return
        }

        const settled = await Promise.allSettled(
          pending.map(async ([key, state]) => ({
            key,
            interviewId: state.interviewId,
            result: await getScorecard(state.interviewId as string),
          })),
        )

        if (cancelled) return

        const next = { ...rowStateRef.current }
        for (const item of settled) {
          if (item.status !== 'fulfilled') continue
          const { key, interviewId, result } = item.value
          next[key] = { ...toRowState(result), interviewId }
        }

        rowStateRef.current = next
        setRowState(next)

        const stillRunning = Object.values(next).some(
          (state) => state.interviewId && !isTerminalStatus(state.status),
        )
        if (!stillRunning) setPolling(false)
      } finally {
        inFlight = false
      }
    }

    const timer = window.setInterval(() => {
      void tick()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [polling])

  /* ------------------------------------------------------------------ */
  /* File handling                                                       */
  /* ------------------------------------------------------------------ */

  const handleFiles = (incoming: File[]) => {
    if (busy) {
      toast.info('This batch is locked', {
        description: 'Start a new batch to add more candidates.',
      })
      return
    }

    const accepted: PickedFile[] = []
    const rejected: RejectedFileRecord[] = []
    const pool = [...files]

    for (const file of incoming) {
      if (file.size === 0) {
        rejected.push({ filename: file.name, reason: 'File is empty (0 bytes).', sizeBytes: 0 })
        continue
      }

      if (file.size > MAX_BULK_FILE_BYTES) {
        rejected.push({
          filename: file.name,
          reason: `File is too large. Maximum is ${formatBytes(MAX_BULK_FILE_BYTES)} per file.`,
          sizeBytes: file.size,
        })
        continue
      }

      const kind = inferKind(file.name, [...pool, ...accepted])
      accepted.push({ id: nextFileId(), file, kind })
    }

    if (rejected.length > 0) {
      setLocalRejected((prev) => [...prev, ...rejected])
    }

    if (accepted.length === 0) {
      toast.error('No files were added', {
        description: rejected[0]?.reason ?? 'Try different files.',
      })
      return
    }

    const nextFiles = [...files, ...accepted]
    setFiles(nextFiles)
    setRows((prev) => mergeCandidates(prev, buildCandidates(nextFiles)))

    toast.success(`${accepted.length} file${accepted.length === 1 ? '' : 's'} added`, {
      description:
        rejected.length > 0
          ? `${rejected.length} file${rejected.length === 1 ? '' : 's'} skipped — see the banner.`
          : 'Check the candidate names and emails below.',
    })
  }

  const rebuild = (nextFiles: PickedFile[]) => {
    setFiles(nextFiles)
    setRows((prev) => mergeCandidates(prev, buildCandidates(nextFiles)))
  }

  const removeFile = (id: string) => {
    if (busy) return
    rebuild(files.filter((file) => file.id !== id))
  }

  const removeRow = (row: CandidateDraft) => {
    if (busy) return
    const ids = new Set(
      [row.transcript?.id, row.resume?.id].filter((id): id is string => Boolean(id)),
    )
    rebuild(files.filter((file) => !ids.has(file.id)))
  }

  const updateRow = (key: string, patch: Partial<Pick<CandidateDraft, 'candidateName' | 'candidateEmail'>>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const resetBatch = () => {
    setFiles([])
    setRows([])
    setLocalRejected([])
    setRowState({})
    rowStateRef.current = {}
    setResponse(null)
    setSubmitError(null)
    setPolling(false)
    setSubmitting(false)
  }

  const downloadTemplate = () => {
    const blob = new Blob([metadataTemplate()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'echogrow-bulk-metadata-template.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  /* ------------------------------------------------------------------ */
  /* Submit                                                              */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    setSubmitError(null)

    const failed: Record<string, RowState> = {}
    const prepared: CandidateDraft[] = []

    for (const row of rows) {
      try {
        const transcript = row.transcript
          ? { ...row.transcript, file: await toUploadableFile(row.transcript.file) }
          : null
        const resume = row.resume
          ? { ...row.resume, file: await toUploadableFile(row.resume.file) }
          : null

        prepared.push({ ...row, transcript, resume })
      } catch (cause) {
        failed[row.key] = {
          status: 'failed',
          error: cause instanceof Error ? cause.message : 'Could not read this file.',
        }
      }
    }

    if (prepared.length === 0) {
      setRowState(failed)
      rowStateRef.current = failed
      setSubmitError('None of the selected files could be read. Convert scanned PDFs to .txt and try again.')
      setSubmitting(false)
      return
    }

    const uploadFiles = prepared.flatMap((row) =>
      [row.transcript?.file, row.resume?.file].filter((file): file is File => Boolean(file)),
    )

    try {
      const result = await bulkUploadInterviews(uploadFiles, toMetadata(prepared))
      const next: Record<string, RowState> = { ...failed }

      prepared.forEach((row, index) => {
        const item = result.results[index]

        if (!item) {
          next[row.key] = {
            status: 'error',
            error: 'The server did not return a result for this candidate.',
          }
          return
        }

        if (item.status === 'queued' && item.interviewId) {
          next[row.key] = { status: 'queued', interviewId: item.interviewId }
          return
        }

        next[row.key] =
          item.status === 'queued'
            ? {
                status: 'error',
                error: 'The server queued this candidate but did not return an interview id.',
              }
            : { status: 'error', error: item.error ?? 'The server rejected this candidate.' }
      })

      rowStateRef.current = next
      setRowState(next)
      setResponse(result)

      const queued = Object.values(next).filter(
        (state) => state.status === 'queued' && state.interviewId,
      ).length
      const failures = Object.values(next).filter(
        (state) => state.status === 'error' || state.status === 'failed',
      ).length

      if (queued > 0) setPolling(true)

      if (failures > 0) {
        toast.error('Batch submitted with issues', {
          description: `${queued} queued, ${failures} could not be queued. Check the highlighted rows.`,
        })
      } else {
        toast.success('Batch queued', {
          description: `${queued} candidate${queued === 1 ? '' : 's'} are being analyzed.`,
        })
      }
    } catch (cause) {
      rowStateRef.current = failed
      setRowState(failed)
      const message =
        cause instanceof ApiError
          ? cause.message
          : 'The upload failed. Check your connection and try again.'
      setSubmitError(message)
      toast.error('Upload failed', { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SEO
        title="Bulk upload"
        description="Upload transcripts and resumes for up to 50 candidates at once. EchoGrow queues every interview and tracks scoring progress in one table."
        url="https://echogrow.app/bulk-upload"
      />

      <div className="flex min-h-svh flex-col bg-surface">
        <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur">
          <div className="container-custom flex h-16 items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <Link to="/upload">
                <Button variant="ghost" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Single upload
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <motion.main
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="container-custom w-full flex-1 py-10 lg:py-14"
        >
          <motion.div variants={fadeUp} className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-chip px-3 py-1 text-xs font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-glow" />
              Bulk pipeline
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl lg:text-5xl">
              Score a whole shortlist{' '}
              <span className="text-accent-600 dark:text-accent-400">in one pass</span>.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
              Drop transcripts and resumes for up to {MAX_BULK_CANDIDATES} candidates. EchoGrow pairs
              the files, queues each interview, and tracks progress in one table.
            </p>
          </motion.div>

          <div className="mt-10 space-y-6">
            <motion.div variants={fadeUp}>
              <Card className="p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-fg-strong">1. Add files</h2>
                    <p className="mt-1 max-w-xl text-sm text-fg-muted">
                      Name each pair with the same prefix, for example{' '}
                      <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-[11px] text-fg">
                        ahmed-transcript.txt
                      </code>{' '}
                      and{' '}
                      <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-[11px] text-fg">
                        ahmed-cv.pdf
                      </code>
                      .
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={downloadTemplate} disabled={busy}>
                    <Download className="mr-2 h-4 w-4" />
                    Download metadata template
                  </Button>
                </div>

                <MultiDropzone
                  id="bulk-files"
                  disabled={busy}
                  onFiles={handleFiles}
                  hint={
                    busy
                      ? 'Start a new batch to upload more files'
                      : 'Transcripts and resumes for every candidate, all at once'
                  }
                  className="mt-5"
                />

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    PDF or TXT
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Up to {MAX_BULK_CANDIDATES} candidates
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileUser className="h-3.5 w-3.5" />
                    {formatBytes(MAX_BULK_FILE_BYTES)} per file
                  </span>
                  {files.length > 0 ? (
                    <span className="font-medium text-fg">
                      {files.length} file{files.length === 1 ? '' : 's'} selected
                    </span>
                  ) : null}
                </div>
              </Card>
            </motion.div>

            {rejectedFiles.length > 0 ? (
              <motion.div variants={fadeUp}>
                <div className="rounded-xl border border-warning-500/30 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {rejectedFiles.length} file{rejectedFiles.length === 1 ? '' : 's'} rejected
                      </p>
                      <ul className="mt-2 space-y-1">
                        {rejectedFiles.map((file, index) => (
                          <li
                            key={`${file.filename}-${index}`}
                            className="flex flex-wrap items-baseline gap-x-2 text-xs"
                          >
                            <span className="font-medium">{file.filename}</span>
                            <span className="opacity-80">{file.reason}</span>
                            <span className="opacity-70">({formatBytes(file.sizeBytes)})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {rows.length === 0 ? (
              <motion.div variants={fadeUp} className="grid gap-6 sm:grid-cols-3">
                {STEPS.map((step) => (
                  <div
                    key={step.title}
                    className="flex flex-col items-center rounded-card border border-line bg-surface-card p-6 text-center transition-all hover:border-line-strong hover:shadow-lift"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-fg-strong">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.desc}</p>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={fadeUp}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                      <h2 className="text-base font-semibold text-fg-strong">
                        2. Review and submit
                      </h2>
                      <span className="rounded-full border border-line bg-chip px-2 py-0.5 text-xs tabular-nums text-fg-muted">
                        {rows.length} / {MAX_BULK_CANDIDATES}
                      </span>
                    </div>
                    {polling ? (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-accent-700 dark:text-accent-300">
                        <Spinner className="h-3.5 w-3.5" label="Polling statuses" />
                        Updating every 3s…
                      </span>
                    ) : null}
                  </div>

                  {response ? (
                    <div className="grid grid-cols-2 gap-3 border-b border-line bg-chip/40 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
                      <SummaryStat label="Candidates" value={summary.total} />
                      <SummaryStat
                        label="Queued / processing"
                        value={summary.inProgress}
                        tone="text-accent-700 dark:text-accent-300"
                      />
                      <SummaryStat
                        label="Scored"
                        value={summary.scored}
                        tone="text-success-700 dark:text-success-500"
                      />
                      <SummaryStat
                        label="Needs review"
                        value={summary.needsReview}
                        tone="text-warning-700 dark:text-warning-500"
                      />
                      <SummaryStat
                        label="Failed"
                        value={summary.failed}
                        tone="text-danger-700 dark:text-danger-500"
                      />
                      <SummaryStat
                        label="Rejected files"
                        value={rejectedFiles.length}
                        tone="text-warning-700 dark:text-warning-500"
                      />
                    </div>
                  ) : null}

                  {submitError ? (
                    <div className="px-5 pt-4">
                      <Alert variant="error" title="Upload failed">
                        {submitError}
                      </Alert>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <caption className="sr-only">
                        Candidate files, statuses, and progress for this bulk upload
                      </caption>
                      <thead>
                        <tr className="border-b border-line bg-chip/30 text-[11px] uppercase tracking-wide text-fg-muted">
                          <th scope="col" className="px-4 py-3 font-medium">#</th>
                          <th scope="col" className="px-3 py-3 font-medium">Candidate</th>
                          <th scope="col" className="px-3 py-3 font-medium">Transcript</th>
                          <th scope="col" className="px-3 py-3 font-medium">Resume</th>
                          <th scope="col" className="px-3 py-3 font-medium">Status</th>
                          <th scope="col" className="px-3 py-3 font-medium">Progress</th>
                          <th scope="col" className="px-3 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => {
                          const state = rowState[row.key]
                          const status: RowStatus = state?.status ?? 'ready'
                          const percent = progressForStatus(status, state?.progress)
                          const rowIssueList = issues[row.key] ?? []
                          const nameInvalid =
                            row.candidateName.trim().length < 2 && !busy
                          const emailInvalid = !isValidEmail(row.candidateEmail) && !busy

                          return (
                            <Fragment key={row.key}>
                              <tr className="border-b border-line transition-colors last:border-0 hover:bg-chip/40">
                                <td className="px-4 py-3 align-top text-xs tabular-nums text-fg-muted">
                                  {index + 1}
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <div className="min-w-[220px] space-y-2">
                                    <div>
                                      <label
                                        htmlFor={`name-${row.key}`}
                                        className="sr-only"
                                      >
                                        Candidate name for row {index + 1}
                                      </label>
                                      <input
                                        id={`name-${row.key}`}
                                        type="text"
                                        value={row.candidateName}
                                        disabled={busy}
                                        onChange={(event) =>
                                          updateRow(row.key, { candidateName: event.target.value })
                                        }
                                        placeholder="Candidate name"
                                        className={cn(
                                          inputBase,
                                          nameInvalid
                                            ? 'border-danger-500'
                                            : 'border-line-strong hover:border-accent-500',
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <label
                                        htmlFor={`email-${row.key}`}
                                        className="sr-only"
                                      >
                                        Candidate email for row {index + 1}
                                      </label>
                                      <input
                                        id={`email-${row.key}`}
                                        type="email"
                                        value={row.candidateEmail}
                                        disabled={busy}
                                        onChange={(event) =>
                                          updateRow(row.key, { candidateEmail: event.target.value })
                                        }
                                        placeholder="name@company.com"
                                        className={cn(
                                          inputBase,
                                          emailInvalid
                                            ? 'border-danger-500'
                                            : 'border-line-strong hover:border-accent-500',
                                        )}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <FileCell
                                    picked={row.transcript}
                                    onRemove={() =>
                                      row.transcript ? removeFile(row.transcript.id) : undefined
                                    }
                                    disabled={busy}
                                  />
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <FileCell
                                    picked={row.resume}
                                    onRemove={() =>
                                      row.resume ? removeFile(row.resume.id) : undefined
                                    }
                                    disabled={busy}
                                  />
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <div className="flex flex-col items-start gap-1.5">
                                    <StatusPill status={status} />
                                    {state?.error ? (
                                      <p className="max-w-[230px] text-xs leading-snug text-danger-500">
                                        {state.error}
                                      </p>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <div className="w-28">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-chip">
                                      <div
                                        className={cn(
                                          'h-full rounded-full transition-all duration-500',
                                          progressColor(status),
                                        )}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    <p className="mt-1 text-xs tabular-nums text-fg-muted">
                                      {percent}%
                                    </p>
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-top text-right">
                                  <div className="flex flex-col items-end gap-2">
                                    {state?.interviewId ? (
                                      <Link
                                        to={`/dashboard/${state.interviewId}/overview`}
                                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-500/10"
                                      >
                                        Dashboard
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Link>
                                    ) : null}
                                    {!busy ? (
                                      <button
                                        type="button"
                                        onClick={() => removeRow(row)}
                                        aria-label={`Remove row ${index + 1}`}
                                        className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-chip hover:text-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>

                              {rowIssueList.length > 0 && !busy ? (
                                <tr className="border-b border-line bg-danger-50/50 last:border-0 dark:bg-danger-500/5">
                                  <td />
                                  <td colSpan={6} className="px-3 pb-3">
                                    <ul className="space-y-0.5 text-xs leading-relaxed text-danger-500">
                                      {rowIssueList.map((issue) => (
                                        <li key={issue}>• {issue}</li>
                                      ))}
                                    </ul>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-relaxed text-fg-muted" aria-live="polite">
                      {rows.length > MAX_BULK_CANDIDATES ? (
                        <span className="font-medium text-danger-500">
                          Too many candidates ({rows.length}). Remove{' '}
                          {rows.length - MAX_BULK_CANDIDATES} to continue.
                        </span>
                      ) : issueCount > 0 ? (
                        `${issueCount} row${issueCount === 1 ? '' : 's'} need attention before upload.`
                      ) : response ? (
                        polling ? (
                          'Analysis is running. This page keeps polling for up to 3 minutes.'
                        ) : (
                          'Batch finished. Open a dashboard for the full evidence report.'
                        )
                      ) : (
                        'Names and emails are pre-filled from the file names. Edit anything that is wrong.'
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {response ? (
                        <Button variant="secondary" size="sm" onClick={resetBatch}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Start a new batch
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetBatch}
                            disabled={submitting}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={!canSubmit}
                          >
                            Upload {rows.length} candidate{rows.length === 1 ? '' : 's'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </motion.main>

        <footer className="container-custom pb-10 text-center text-xs text-fg-muted">
          <p>
            EchoGrow turns every interview into structured evidence, verifies claims against the
            resume, and guides the candidate&apos;s next step.
          </p>
        </footer>
      </div>
    </>
  )
}
