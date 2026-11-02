const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const REQUEST_TIMEOUT_MS = 30_000

export interface CreateInterviewRequest {
  candidateName: string
  candidateEmail: string
  transcript: string
  cv: string
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

export interface ScorecardResponse {
  interviewId: string
  candidateName: string
  dimensions: ScorecardDimension[]
  overallConfidence: number
  interviewDate?: string
  pendingDiscrepancies?: number
  skillGaps?: number
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
  400: 'The server rejected the request.',
  401: 'You are not authorised.',
  403: 'You do not have permission.',
  404: 'The resource was not found.',
  409: 'This interview is already being processed.',
  413: 'The text is too long.',
  422: 'Some fields are invalid.',
  429: 'Too many requests. Wait a moment.',
  500: 'The server failed. Please try again.',
  502: 'The server is temporarily unavailable.',
  503: 'The service is starting up. Please try again in a few seconds.',
}

function fallbackMessage(status: number): string {
  return MESSAGE_BY_STATUS[status] ?? `The request failed with status ${status}.`
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

async function mockCreateInterview(_input: CreateInterviewRequest): Promise<CreateInterviewResponse> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return { interviewId: crypto.randomUUID(), status: 'queued' }
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
  return {
    interviewId,
    candidateName: 'Ahmed Al-Mansour',
    interviewDate: new Date().toISOString(),
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
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out.')
    throw new ApiError('Could not reach the server.')
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
    const data = (await response.json()) as Partial<ScorecardResponse>
    if (!Array.isArray(data.dimensions)) throw new ApiError('The server response did not include a scorecard.', 502)
    return {
      interviewId: data.interviewId ?? interviewId,
      candidateName: data.candidateName?.trim() || 'Candidate',
      interviewDate: data.interviewDate,
      dimensions: data.dimensions,
      overallConfidence: typeof data.overallConfidence === 'number' ? data.overallConfidence : 0,
      pendingDiscrepancies: data.pendingDiscrepancies,
      skillGaps: data.skillGaps,
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out.')
    throw new ApiError('Could not reach the server.')
  } finally {
    window.clearTimeout(timeout)
  }
}