import type { SpeakerTurn } from '../api'

/** How many speaker turns to show before the quoted turn. */
export const CONTEXT_TURNS_BEFORE = 2
/** How many speaker turns to show after the quoted turn. */
export const CONTEXT_TURNS_AFTER = 2

export interface WindowedTurn {
  turn: SpeakerTurn
  index: number
  isMatch: boolean
}

export interface TranscriptWindow {
  /** Turns to render, in transcript order. Empty when the quote was not found. */
  turns: WindowedTurn[]
  /** Index of the matched turn in the original array, or -1 when not found. */
  matchIndex: number
  /** First index of the window in the original array, or -1 when not found. */
  startIndex: number
  /** Last index of the window in the original array, or -1 when not found. */
  endIndex: number
}

export interface HighlightSegment {
  text: string
  highlighted: boolean
}

const WRAPPING_QUOTES = /^["'“”‘’«»]+|["'“”‘’«»]+$/g

/**
 * Removes straight/curly quotes that wrap a quote, so `"hello"` and `hello`
 * match the same transcript text. Handles surrounding whitespace and repeated
 * quote characters.
 */
export function stripWrappingQuotes(value: string): string {
  let result = value.trim()
  let previous = ''

  while (result !== previous) {
    previous = result
    result = result.replace(WRAPPING_QUOTES, '').trim()
  }

  return result
}

/**
 * Case- and whitespace-insensitive form used for containment checks.
 */
export function normalizeForMatch(value: string): string {
  return stripWrappingQuotes(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?…]+$/g, '')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function quotePattern(quote: string): string {
  return escapeRegExp(stripWrappingQuotes(quote)).replace(/\s+/g, '\\s+')
}

/**
 * Locates the quote inside `text`, ignoring case and whitespace differences.
 * Returns offsets into the original `text` so callers can highlight exactly
 * what was rendered.
 */
export function findQuoteSpan(
  text: string,
  quote: string,
): { start: number; end: number } | null {
  const pattern = quotePattern(quote)
  if (!pattern) return null

  const match = new RegExp(pattern, 'i').exec(text)
  if (!match) return null

  return { start: match.index, end: match.index + match[0].length }
}

function tokenize(value: string): string[] {
  return normalizeForMatch(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2)
}

function tokenOverlapScore(text: string, quote: string): number {
  const quoteTokens = tokenize(quote)
  if (quoteTokens.length === 0) return 0

  const textTokens = new Set(tokenize(text))
  const hits = quoteTokens.filter((token) => textTokens.has(token)).length
  return hits / quoteTokens.length
}

/**
 * Finds the speaker turn that contains `quote`.
 *
 * Matching is deliberately tolerant because evidence quotes are produced by an
 * LLM and can differ from the transcript in case, spacing or punctuation:
 *   1. case/whitespace-insensitive substring match,
 *   2. normalized containment (trailing punctuation removed),
 *   3. best token overlap, accepted when at least 60% of quote words appear.
 *
 * Returns -1 when no turn is a credible match.
 */
export function findQuoteTurnIndex(
  turns: readonly SpeakerTurn[],
  quote: string,
): number {
  const target = normalizeForMatch(quote)
  if (!target) return -1

  for (let index = 0; index < turns.length; index += 1) {
    if (findQuoteSpan(turns[index].text, quote)) return index
  }

  for (let index = 0; index < turns.length; index += 1) {
    if (normalizeForMatch(turns[index].text).includes(target)) return index
  }

  let bestIndex = -1
  let bestScore = 0

  turns.forEach((turn, index) => {
    const score = tokenOverlapScore(turn.text, quote)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestScore >= 0.6 ? bestIndex : -1
}

/**
 * Builds the timeline window around the quoted turn: two turns before, the
 * quoted turn, and two turns after (clamped to the transcript bounds).
 */
export function buildContextWindow(
  turns: readonly SpeakerTurn[],
  quote: string,
  before: number = CONTEXT_TURNS_BEFORE,
  after: number = CONTEXT_TURNS_AFTER,
): TranscriptWindow {
  const matchIndex = findQuoteTurnIndex(turns, quote)

  if (matchIndex < 0) {
    return { turns: [], matchIndex: -1, startIndex: -1, endIndex: -1 }
  }

  const startIndex = Math.max(0, matchIndex - before)
  const endIndex = Math.min(turns.length - 1, matchIndex + after)

  const windowedTurns: WindowedTurn[] = []
  for (let index = startIndex; index <= endIndex; index += 1) {
    windowedTurns.push({
      turn: turns[index],
      index,
      isMatch: index === matchIndex,
    })
  }

  return { turns: windowedTurns, matchIndex, startIndex, endIndex }
}

/**
 * Splits a turn into plain and highlighted segments so the quote can be
 * rendered with an accent `<mark>` while keeping the rest of the turn intact.
 */
export function splitHighlightedText(
  text: string,
  quote: string,
): HighlightSegment[] {
  const span = findQuoteSpan(text, quote)
  if (!span) return [{ text, highlighted: false }]

  const segments: HighlightSegment[] = []

  if (span.start > 0) {
    segments.push({ text: text.slice(0, span.start), highlighted: false })
  }

  segments.push({ text: text.slice(span.start, span.end), highlighted: true })

  if (span.end < text.length) {
    segments.push({ text: text.slice(span.end), highlighted: false })
  }

  return segments
}
