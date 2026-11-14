import { describe, expect, it } from 'vitest'
import type { SpeakerTurn } from '../src/lib/api'
import {
  CONTEXT_TURNS_AFTER,
  CONTEXT_TURNS_BEFORE,
  buildContextWindow,
  findQuoteSpan,
  findQuoteTurnIndex,
  normalizeForMatch,
  splitHighlightedText,
  stripWrappingQuotes,
} from '../src/lib/transcript/contextWindow'

const turns: SpeakerTurn[] = [
  { speaker: 'Interviewer', text: 'Tell me about your last project.', timestamp: '00:00:01' },
  { speaker: 'Candidate', text: 'I led the migration of our billing service.' },
  { speaker: 'Interviewer', text: 'How did you handle downtime?' },
  {
    speaker: 'Candidate',
    text: 'We used a phased rollout with feature flags to avoid downtime.',
    timestamp: '00:00:42',
  },
  { speaker: 'Interviewer', text: 'Nice, that sounds solid.' },
  { speaker: 'Candidate', text: 'Thanks, it took three months.' },
]

describe('transcript context helpers', () => {
  describe('stripWrappingQuotes', () => {
    it('removes straight and curly wrapping quotes', () => {
      expect(stripWrappingQuotes('"phased rollout"')).toBe('phased rollout')
      expect(stripWrappingQuotes('“phased rollout”')).toBe('phased rollout')
      expect(stripWrappingQuotes('«phased rollout»')).toBe('phased rollout')
    })
  })

  describe('normalizeForMatch', () => {
    it('normalizes case, whitespace and trailing punctuation', () => {
      expect(normalizeForMatch('  “We  Used a Phased Rollout.”  ')).toBe(
        'we used a phased rollout',
      )
    })
  })

  describe('findQuoteSpan', () => {
    it('finds an exact quote and returns offsets into the original text', () => {
      const text = 'We used a phased rollout with feature flags.'
      const span = findQuoteSpan(text, 'phased rollout')

      expect(span).not.toBeNull()
      expect(text.slice(span!.start, span!.end)).toBe('phased rollout')
    })

    it('ignores case, wrapping quotes and whitespace differences', () => {
      const text = 'We used a phased\nrollout with feature flags.'
      const span = findQuoteSpan(text, '“PHASED   rollout”')

      expect(span).not.toBeNull()
      expect(text.slice(span!.start, span!.end)).toBe('phased\nrollout')
    })

    it('returns null for an empty quote', () => {
      expect(findQuoteSpan('anything', '   ')).toBeNull()
    })
  })

  describe('findQuoteTurnIndex', () => {
    it('finds the turn containing the quote', () => {
      expect(findQuoteTurnIndex(turns, 'feature flags to avoid downtime')).toBe(3)
    })

    it('matches when punctuation differs inside the quote', () => {
      // The transcript has a comma after "rollout" that the quote omits.
      const punctuated: SpeakerTurn[] = [
        { speaker: 'Candidate', text: 'We used a phased rollout, with feature flags.' },
      ]

      expect(findQuoteTurnIndex(punctuated, 'phased rollout with feature flags')).toBe(0)
    })

    it('returns -1 when no turn is a credible match', () => {
      expect(findQuoteTurnIndex(turns, 'I have never worked with Kubernetes')).toBe(-1)
    })

    it('returns -1 for an empty quote', () => {
      expect(findQuoteTurnIndex(turns, '')).toBe(-1)
    })
  })

  describe('buildContextWindow', () => {
    it('returns two turns before and after the match by default', () => {
      const window = buildContextWindow(turns, 'feature flags to avoid downtime')

      expect(CONTEXT_TURNS_BEFORE).toBe(2)
      expect(CONTEXT_TURNS_AFTER).toBe(2)
      expect(window.matchIndex).toBe(3)
      expect(window.startIndex).toBe(1)
      expect(window.endIndex).toBe(5)
      expect(window.turns.map((entry) => entry.index)).toEqual([1, 2, 3, 4, 5])
      expect(window.turns.filter((entry) => entry.isMatch).map((entry) => entry.index)).toEqual([3])
    })

    it('clamps the window at the start of the transcript', () => {
      const window = buildContextWindow(turns, 'Tell me about your last project')

      expect(window.matchIndex).toBe(0)
      expect(window.startIndex).toBe(0)
      expect(window.endIndex).toBe(2)
    })

    it('clamps the window at the end of the transcript', () => {
      const window = buildContextWindow(turns, 'it took three months')

      expect(window.matchIndex).toBe(5)
      expect(window.startIndex).toBe(3)
      expect(window.endIndex).toBe(5)
    })

    it('returns an empty window when the quote cannot be found', () => {
      const window = buildContextWindow(turns, 'completely unrelated sentence')

      expect(window).toEqual({
        turns: [],
        matchIndex: -1,
        startIndex: -1,
        endIndex: -1,
      })
    })

    it('handles an empty transcript', () => {
      expect(buildContextWindow([], 'anything').matchIndex).toBe(-1)
    })
  })

  describe('splitHighlightedText', () => {
    it('splits the turn into plain, highlighted and trailing segments', () => {
      const text = 'We used a phased rollout with feature flags to avoid downtime.'
      const segments = splitHighlightedText(text, 'phased rollout')

      expect(segments).toHaveLength(3)
      expect(segments[0]).toEqual({ text: 'We used a ', highlighted: false })
      expect(segments[1]).toEqual({ text: 'phased rollout', highlighted: true })
      expect(segments[2]).toEqual({
        text: ' with feature flags to avoid downtime.',
        highlighted: false,
      })
    })

    it('highlights a quote that starts at the beginning of the turn', () => {
      const segments = splitHighlightedText('Thanks, it took three months.', 'Thanks')

      expect(segments).toHaveLength(2)
      expect(segments[0]).toEqual({ text: 'Thanks', highlighted: true })
    })

    it('returns the whole turn as plain text when the quote is missing', () => {
      expect(splitHighlightedText('Some turn text.', 'not present')).toEqual([
        { text: 'Some turn text.', highlighted: false },
      ])
    })
  })
})
