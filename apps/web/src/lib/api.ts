const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
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
  structuredTranscript?: any
  confidence: number
  message: string
}

export interface RejectedResponse {
  status: 'rejected'
  interviewId: string
  candidateName: string
  message: string
}

export interface ScoredResponse {
  status: 'scored'
  interviewId: string
  candidateName: string
  interviewDate: string
  dimensions: ScorecardDimension[]
  overallConfidence: number
  pendingDiscrepancies: number
  skillGaps: number
}

export type ScorecardResponse = NeedsReviewResponse | ScoredResponse | RejectedResponse

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
      if (typeof record.message === 'string' && record.message.trim()) return record.message
      if (record.error && typeof record.error === 'object') {
        const nested = (record.error as { message?: unknown }).message
        if (typeof nested === 'string' && nested.trim()) return nested
      }
    }
  } catch { /* ignore */ }
  return fallbackMessage(response.status)
}

const MOCK_META_PREFIX = 'echogrow:mock-interview:'

interface MockInterviewMeta {
  candidateName: string
  createdAt: string
}

function readMockMeta(interviewId: string): MockInterviewMeta | null {
  try {
    const raw = sessionStorage.getItem(`${MOCK_META_PREFIX}${interviewId}`)
    return raw ? (JSON.parse(raw) as MockInterviewMeta) : null
  } catch {
    return null
  }
}

async function mockCreateInterview(input: CreateInterviewRequest): Promise<CreateInterviewResponse> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  const interviewId = crypto.randomUUID()

  const candidateName =
    /^\s*name\s*:\s*(.+)$/im.exec(input.cv)?.[1]?.trim() || 'Sample candidate'
  try {
    sessionStorage.setItem(
      `${MOCK_META_PREFIX}${interviewId}`,
      JSON.stringify({ candidateName, createdAt: new Date().toISOString() }),
    )
  } catch {
    /* ignore */
  }

  return { interviewId, status: 'queued' }
}

const MOCK_DIMENSIONS: ScorecardDimension[] = [
  {
    name: 'Technical Depth',
    score: 2,
    reason: 'Applied indexes correctly from EXPLAIN output, but could not explain how a B-tree works.',
    evidenceQuote: "I know indexes speed up lookups, but I haven't gone deep into B-trees.",
  },
  {
    name: 'Communication Clarity',
    score: 4,
    reason: 'Answers followed situation → action → measurable result.',
    evidenceQuote: 'I profiled it with EXPLAIN ANALYZE and added a composite index.',
  },
  {
    name: 'Domain Experience',
    score: 3,
    reason: 'Solid backend background, but payments exposure is limited.',
    evidenceQuote: 'Limited. Most of my work was on internal tools.',
  },
  {
    name: 'Problem Solving',
    score: 4,
    reason: 'Splits delivery into vertical slices and debugs methodically.',
    evidenceQuote: 'I broke the work into vertical slices and reviewed every PR myself.',
  },
]

async function mockGetScorecard(interviewId: string): Promise<ScorecardResponse> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  const meta = readMockMeta(interviewId)
  return {
    status: 'scored',
    interviewId,
    candidateName: meta?.candidateName ?? 'Ahmed Al-Mansour',
    interviewDate: meta?.createdAt ?? new Date().toISOString(),
    dimensions: MOCK_DIMENSIONS,
    overallConfidence: 0.82,
    pendingDiscrepancies: 1,
    skillGaps: 2,
  }
}

export async function createInterview(input: CreateInterviewRequest): Promise<CreateInterviewResponse> {
  if (USE_MOCK) return mockCreateInterview(input)
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
    if (!data.interviewId) throw new ApiError('The server response did not include an interviewId.', response.status)
    return { interviewId: data.interviewId, status: data.status ?? 'queued' }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out. Check your connection and try again.')
    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getScorecard(interviewId: string): Promise<ScorecardResponse> {
  if (USE_MOCK) return mockGetScorecard(interviewId)
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
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out. Check your connection and try again.')
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
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out. Check your connection and try again.')
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
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out. Check your connection and try again.')
    throw new ApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}