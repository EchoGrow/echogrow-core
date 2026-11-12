import type { BulkUploadCandidate } from './api'
import { extractPdfText } from './pdf'

export const MAX_BULK_CANDIDATES = 50
export const MAX_BULK_FILE_BYTES = 2 * 1024 * 1024

export type FileKind = 'transcript' | 'resume'

export interface PickedFile {
  id: string
  file: File
  kind: FileKind
}

export interface CandidateDraft {
  key: string
  candidateName: string
  candidateEmail: string
  transcript: PickedFile | null
  resume: PickedFile | null
}

export type RowStatus =
  | 'ready'
  | 'queued'
  | 'processing'
  | 'scored'
  | 'needs_review'
  | 'rejected'
  | 'failed'
  | 'error'

const TERMINAL_STATUSES = new Set<RowStatus>([
  'scored',
  'needs_review',
  'rejected',
  'failed',
  'error',
])

const RESUME_TOKENS = new Set(['cv', 'resume', 'curriculum', 'vitae'])
const TRANSCRIPT_TOKENS = new Set(['transcript', 'transcripts', 'interview', 'conversation'])

export function isTerminalStatus(status: RowStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function tokensOf(filename: string): string[] {
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/)
    .filter(Boolean)
}

/** Guesses whether a file is a transcript or a resume from its name. */
export function detectKind(filename: string): FileKind | null {
  const tokens = tokensOf(filename)
  if (tokens.some((token) => TRANSCRIPT_TOKENS.has(token))) return 'transcript'
  if (tokens.some((token) => RESUME_TOKENS.has(token))) return 'resume'
  return null
}

/** Resolves the kind for a newly added file. */
export function inferKind(filename: string, existing: PickedFile[]): FileKind {
  const explicit = detectKind(filename)
  if (explicit) return explicit
  const key = baseKey(filename)
  const siblings = existing.filter((picked) => baseKey(picked.file.name) === key)
  if (siblings.some((picked) => picked.kind === 'transcript')) return 'resume'
  return 'transcript'
}

/**
 * Groups `ahmed-transcript.txt` with `ahmed-cv.pdf` by stripping the extension
 * and the transcript/resume keywords.
 *
 * STRICT MODE: Only removes the EXACT keywords (transcript, resume, cv, etc.).
 * Everything else (e.g., "copy", "2", "final") is preserved to avoid accidental merging.
 */
export function baseKey(filename: string): string {
  const tokens = tokensOf(filename)
  const filtered = tokens.filter(
    (token) => !RESUME_TOKENS.has(token) && !TRANSCRIPT_TOKENS.has(token)
  )
  return filtered.join('-') || tokens.join('-') || 'candidate'
}

export function candidateNameFromKey(key: string): string {
  const name = key
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return name || 'Candidate'
}

/**
 * Result of buildCandidates:
 * - candidates: rows with both transcript + resume (valid pairs)
 * - orphans: files that did not find a matching pair (missing transcript or resume)
 */
export interface BuildResult {
  candidates: CandidateDraft[]
  orphans: PickedFile[]
}

/**
 * Pairs files into candidate rows STRICTLY.
 * If a file does not have a matching pair (same baseKey but different kind), it becomes an orphan.
 */
export function buildCandidates(files: PickedFile[]): BuildResult {
  const buckets = new Map<string, { transcript: PickedFile[]; resume: PickedFile[] }>()

  for (const picked of files) {
    const key = baseKey(picked.file.name)
    const bucket = buckets.get(key) ?? { transcript: [], resume: [] }
    bucket[picked.kind].push(picked)
    buckets.set(key, bucket)
  }

  const candidates: CandidateDraft[] = []
  const orphans: PickedFile[] = []

  for (const [key, bucket] of buckets) {
    // STRICT: Only create a row if BOTH transcript and resume exist
    if (bucket.transcript.length > 0 && bucket.resume.length > 0) {
      const pairs = Math.min(bucket.transcript.length, bucket.resume.length)
      for (let i = 0; i < pairs; i++) {
        candidates.push({
          key: pairs > 1 ? `${key}#${i + 1}` : key,
          candidateName: candidateNameFromKey(key),
          candidateEmail: '',
          transcript: bucket.transcript[i],
          resume: bucket.resume[i],
        })
      }
      // Any leftovers (e.g., 2 transcripts but 1 resume) are orphans
      if (bucket.transcript.length > pairs) {
        orphans.push(...bucket.transcript.slice(pairs))
      }
      if (bucket.resume.length > pairs) {
        orphans.push(...bucket.resume.slice(pairs))
      }
    } else {
      // No pair: all files in this bucket are orphans
      orphans.push(...bucket.transcript, ...bucket.resume)
    }
  }

  return {
    candidates: candidates.sort((a, b) => a.key.localeCompare(b.key)),
    orphans,
  }
}

/** Rebuilds rows after the file list changed, keeping anything the user typed. */
export function mergeCandidates(previous: CandidateDraft[], next: CandidateDraft[]): CandidateDraft[] {
  const byKey = new Map(previous.map((row) => [row.key, row]))
  return next.map((row) => {
    const existing = byKey.get(row.key)
    if (!existing) return row
    return {
      ...row,
      candidateName: existing.candidateName,
      candidateEmail: existing.candidateEmail,
    }
  })
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Per-row blockers shown inline and used to disable the submit button. */
export function rowIssues(rows: CandidateDraft[]): Record<string, string[]> {
  const issues: Record<string, string[]> = {}
  const seenNames = new Map<string, number>()

  for (const row of rows) {
    for (const picked of [row.transcript, row.resume]) {
      if (!picked) continue
      const name = picked.file.name
      seenNames.set(name, (seenNames.get(name) ?? 0) + 1)
    }
  }

  for (const row of rows) {
    const problems: string[] = []
    if (!row.transcript) problems.push('Missing transcript file')
    if (!row.resume) problems.push('Missing resume file')
    if (row.candidateName.trim().length < 2) problems.push('Candidate name is required')
    if (!isValidEmail(row.candidateEmail)) problems.push('Valid email is required')
    for (const picked of [row.transcript, row.resume]) {
      if (picked && (seenNames.get(picked.file.name) ?? 0) > 1) {
        problems.push(`Duplicate file name "${picked.file.name}"`)
        break
      }
    }
    if (problems.length > 0) issues[row.key] = problems
  }
  return issues
}

export function toMetadata(rows: CandidateDraft[]): BulkUploadCandidate[] {
  return rows.map((row) => ({
    candidateName: row.candidateName.trim(),
    candidateEmail: row.candidateEmail.trim(),
    transcriptFileName: row.transcript?.file.name ?? '',
    resumeFileName: row.resume?.file.name ?? '',
  }))
}

export function metadataTemplate(): string {
  return JSON.stringify(
    [
      {
        candidateName: 'Ahmed Al-Mansour',
        candidateEmail: 'ahmed@example.com',
        transcriptFileName: 'ahmed-transcript.txt',
        resumeFileName: 'ahmed-cv.txt',
      },
      {
        candidateName: 'Sara Odeh',
        candidateEmail: 'sara@example.com',
        transcriptFileName: 'sara-transcript.txt',
        resumeFileName: 'sara-cv.txt',
      },
    ],
    null,
    2,
  )
}

/** Converts PDFs to text in the browser. */
export async function toUploadableFile(file: File): Promise<File> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) return file
  const text = await extractPdfText(file)
  if (!text.trim()) {
    throw new Error(`No text found in "${file.name}". If it is a scanned PDF, upload a .txt version instead.`)
  }
  return new File([text], file.name, { type: 'text/plain' })
}

/** 0–100, driven by the scorecard pipeline flags while the analysis runs. */
export function progressForStatus(
  status: RowStatus,
  progress?: { isScored: boolean; isVerified: boolean; isPlanned: boolean },
): number {
  switch (status) {
    case 'ready':
      return 0
    case 'queued':
      return 8
    case 'processing': {
      const steps = [progress?.isScored, progress?.isVerified, progress?.isPlanned].filter(Boolean).length
      return 20 + steps * 25
    }
    default:
      return 100
  }
}