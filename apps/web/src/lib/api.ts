const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const REQUEST_TIMEOUT_MS = 30_000

export interface CreateInterviewRequest {
  transcript: string
  cv: string
}

export interface CreateInterviewResponse {
  interviewId: string
  status: string
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
      if (typeof record.message === 'string' && record.message.trim()) return record.message
      if (record.error && typeof record.error === 'object') {
        const nested = (record.error as { message?: unknown }).message
        if (typeof nested === 'string' && nested.trim()) return nested
      }
    }
  } catch { /* ignore */ }
  return fallbackMessage(response.status)
}

async function mockCreateInterview(): Promise<CreateInterviewResponse> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return { interviewId: crypto.randomUUID(), status: 'queued' }
}

export async function createInterview(input: CreateInterviewRequest): Promise<CreateInterviewResponse> {
  if (USE_MOCK) return mockCreateInterview()
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