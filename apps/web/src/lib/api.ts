const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

const REQUEST_TIMEOUT_MS = 30_000

export interface CreateInterviewRequest {
  candidateName: string;
  candidateEmail: string;
  transcript: string;
  cv: string;
}

export interface CreateInterviewResponse {
  interviewId: string
  status: string
}

export type DimensionName =
  | 'Technical Depth'
  | 'Communication Clarity'
  | 'Domain Experience'
  | 'Problem Solving'

export interface ScorecardDimension {
  name: DimensionName
  score: number
  reason: string
  evidenceQuote: string
  timestamp?: string
}

export interface NeedsReviewResponse {
  status: 'needs_review'
  interviewId: string
  candidateName: string
  transcript: string
  resume: string
  structuredTranscript?: unknown
  confidence: number
  message: string
}

export interface RejectedResponse {
  status: 'rejected'
  interviewId: string
  candidateName: string
  message: string
}

export interface ProcessingResponse {
  status: 'processing'
  interviewId: string
  candidateName: string
  progress: {
    isScored: boolean
    isVerified: boolean
    isPlanned: boolean
  }
  isQueued?: boolean
}

export interface TimeSavedBreakdown {
  manualMinutes: number;
  echoGrowSeconds: number;
  savedMinutes: number;
  savedSeconds: number;
}

export type SpkStatus = 'pending' | 'building' | 'ready' | 'failed';

export interface ScoredResponse {
  status: 'scored'
  interviewId: string
  candidateName: string
  interviewDate: string
  dimensions: ScorecardDimension[]
  overallConfidence: number
  pendingDiscrepancies: number
  totalDiscrepancies: number
  skillGaps: number
  timeSaved?: TimeSavedBreakdown
  spkStatus?: SpkStatus
  spkError?: string | null
  progress?: {
    isScored: boolean
    isVerified: boolean
    isPlanned: boolean
  }
}

export interface FailedResponse {
  status: 'failed'
  interviewId: string
  candidateName: string
  message: string
}

export type DiscrepancyStatus = 'pending' | 'confirmed' | 'dismissed'

export type DiscrepancySeverity = 'low' | 'medium' | 'high'

export interface DiscrepancyRecord {
  id: string
  field: string
  cvSays: string
  interviewSays: string
  cvQuote: string
  interviewQuote: string
  confidence: number
  severity: DiscrepancySeverity 
  action: 'flag_for_human_review'
  status: DiscrepancyStatus
  reviewerNotes: string | null 
}

export interface DiscrepancyResponse {
  discrepancies: DiscrepancyRecord[]
}

export type ScorecardResponse = 
  | NeedsReviewResponse 
  | ScoredResponse 
  | RejectedResponse 
  | ProcessingResponse
  | FailedResponse

// ============================================================
// Roadmap Types
// ============================================================
export type SkillGapPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SkillGapRecord {
  skillName: string;
  priority: SkillGapPriority;
}

export interface RoadmapItemRecord {
  week: number;
  task: string;
  resourceUrl: string | null;
  skillName: string;
}

export interface RoadmapResponse {
  gaps: SkillGapRecord[];
  roadmap: RoadmapItemRecord[];
}

// ============================================================
// SPK Export Types
// ============================================================
export interface SpkDimension {
  name: string;
  score: number;
  raw_score: number;
  reason?: string;
  evidence_quote?: string;
  evidence_timestamp?: string;
}

export interface SpkDiscrepancy {
  field: string;
  cv_says: string;
  interview_says: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  confidence: number;
}

export interface SpkSkillGap {
  skill: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SpkRoadmapItem {
  week: number;
  skill: string;
  task: string;
  resource_url?: string | null;
}

export interface SpkExport {
  candidate_id: string;
  candidate_name: string;
  overall_score: number;
  confidence: number;
  dimensions: SpkDimension[];
  verified_skills: string[];
  recommended_upskilling: SpkSkillGap[];
  roadmap: SpkRoadmapItem[];
  discrepancies: SpkDiscrepancy[];
  discrepancies_count: number;
  human_review_status: 'approved' | 'pending' | 'rejected';
  seniority: string | null;
  primary_role: string | null;
  timezone: string | null;
  languages: string[] | null;
  years_of_experience: number | null;
  generated_at: string;
  schema_version: string;
}

// ============================================================
// Bulk Upload Types
// ============================================================

/** One candidate in the `metadata` part of a bulk upload. Files are matched by name. */
export interface BulkUploadCandidate {
  candidateName: string
  candidateEmail: string
  transcriptFileName: string
  resumeFileName: string
}

export interface BulkUploadResultRecord {
  candidateName: string
  candidateEmail: string
  status: 'queued' | 'error'
  interviewId?: string
  error?: string
}

export interface RejectedFileRecord {
  filename: string
  reason: string
  sizeBytes: number
}

export interface BulkUploadSummary {
  total: number
  queued: number
  failed: number
  rejectedFilesCount: number
}

export interface BulkUploadResponse {
  results: BulkUploadResultRecord[]
  rejectedFiles: RejectedFileRecord[]
  summary: BulkUploadSummary
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'The server rejected the request. Check that the transcript and resume were pasted correctly.',
  401: 'You are not authorised to upload interviews.',
  403: 'You do not have permission to upload interviews.',
  404: 'The upload endpoint was not found. Check VITE_API_URL.',
  409: 'This interview is already being processed.',
  413: 'The text is too long. Please shorten it and try again.',
  422: 'Some fields are invalid. Please review the transcript and resume.',
  429: 'Too many requests. Wait a moment and try again.',
  500: 'The server failed while starting the analysis. Please try again.',
  502: 'The server is temporarily unavailable. Please try again.',
  503: 'The service is starting up. Please try again in a few seconds.',
}

function fallbackMessage(status: number): string {
  return MESSAGE_BY_STATUS[status] ?? `The request failed with status ${status}. Please try again.`
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()

    if (body && typeof body === 'object') {
      const record = body as { message?: unknown; error?: unknown }

      if (typeof record.message === 'string' && record.message.trim()) {
        return record.message
      }

      if (record.error && typeof record.error === 'object') {
        const nested = (record.error as { message?: unknown }).message

        if (typeof nested === 'string' && nested.trim()) return nested
      }
    }
  } catch {
    /* ignore */
  }

  return fallbackMessage(response.status)
}

// ============================================================
// Real API
// ============================================================

export async function createInterview(input: CreateInterviewRequest): Promise<CreateInterviewResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}/interviews/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    const data = (await response.json()) as Partial<CreateInterviewResponse>

    if (!data.interviewId) {
      throw new ApiError('The server response did not include an interviewId.', response.status)
    }

    return { interviewId: data.interviewId, status: data.status ?? 'queued' }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

const BULK_UPLOAD_TIMEOUT_MS = 120_000

/**
 * Sends every file plus the candidate metadata in one multipart request.
 *
 * The API matches files to candidates by `File.name`, so names are sent as-is
 * (the caller is responsible for keeping them unique).
 */
export async function bulkUploadInterviews(
  files: File[],
  metadata: BulkUploadCandidate[],
): Promise<BulkUploadResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), BULK_UPLOAD_TIMEOUT_MS)

  try {
    const form = new FormData()
    for (const file of files) form.append('files', file, file.name)
    form.append('metadata', JSON.stringify(metadata))

    const response = await fetch(`${API_BASE_URL}/interviews/bulk-upload`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
      signal: controller.signal,
    })

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    const data = (await response.json()) as Partial<BulkUploadResponse>

    if (!Array.isArray(data.results)) {
      throw new ApiError('The server response did not include a results array.', response.status)
    }

    const rejectedFiles = data.rejectedFiles ?? []

    return {
      results: data.results,
      rejectedFiles,
      summary: data.summary ?? {
        total: data.results.length,
        queued: data.results.filter((r) => r.status === 'queued').length,
        failed: data.results.filter((r) => r.status === 'error').length,
        rejectedFilesCount: rejectedFiles.length,
      },
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The upload timed out. Try fewer files or a faster connection.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getScorecard(interviewId: string): Promise<ScorecardResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/scorecard`,
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    const data = (await response.json()) as ScorecardResponse

    if (!data.status) {
      throw new ApiError('The server response did not include a status.', 502)
    }

    return data
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getDiscrepancies(interviewId: string): Promise<DiscrepancyResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/discrepancies`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    )

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    return (await response.json()) as DiscrepancyResponse
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function updateDiscrepancyStatus(
  id: string,
  status: Exclude<DiscrepancyStatus, 'pending'>,
  reviewerNotes?: string,
): Promise<void> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${API_BASE_URL}/discrepancies/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          status,
          ...(reviewerNotes?.trim() ? { reviewerNotes: reviewerNotes.trim() } : {}),
        }),
        signal: controller.signal,
      },
    )

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function forceEvaluation(interviewId: string): Promise<{ interviewId: string; status: string }> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/force-evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    return (await response.json()) as { interviewId: string; status: string }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function rejectInterview(interviewId: string): Promise<{ interviewId: string; status: string }> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    return (await response.json()) as { interviewId: string; status: string }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

// ============================================================
// Roadmap API
// ============================================================
export async function getRoadmap(interviewId: string): Promise<RoadmapResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/roadmap`,
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    );

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);

    return (await response.json()) as RoadmapResponse;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;

    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.');
    }

    throw new ApiError('Could not reach the server. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
}

export function validateRoadmapForExport(data: RoadmapResponse | null | undefined): asserts data is RoadmapResponse {
  if (!data) {
    throw new ApiError(
      'No roadmap data available. Please wait for the analysis to finish, then try again.',
    );
  }

  if (!Array.isArray(data.gaps) || !Array.isArray(data.roadmap)) {
    throw new ApiError(
      'The roadmap response is malformed. Please reload the page and try again.',
    );
  }

  if (data.gaps.length === 0 && data.roadmap.length === 0) {
    throw new ApiError(
      'There is nothing to export yet. This candidate has no skill gaps — the roadmap is empty.',
    );
  }

  if (data.roadmap.length !== data.gaps.length) {
    throw new ApiError(
      'The roadmap is inconsistent (weeks count does not match gaps). Please reload and try again.',
    );
  }

  for (const item of data.roadmap) {
    if (!item.week || !item.task || !item.skillName) {
      throw new ApiError(
        'The roadmap contains incomplete items. Please reload and try again.',
      );
    }
  }
}

// ============================================================
// SPK Export API
// ============================================================
export async function getSpkExport(interviewId: string): Promise<SpkExport> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/spk-export`,
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    );

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);

    return (await response.json()) as SpkExport;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.');
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function rebuildSpkProfile(
  interviewId: string,
): Promise<{ interviewId: string; status: string }> {
  const controller = new AbortController()
  // 10s is enough to confirm the request reached the server.
  // The actual rebuild runs in the background and is tracked by polling.
  const timeout = window.setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/spk-rebuild`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      },
    )

    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)

    return (await response.json()) as { interviewId: string; status: string }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.')
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}