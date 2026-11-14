import { useMemo } from 'react'
import type { SpeakerTurn } from '../../lib/api'
import { cn } from '../../lib/cn'
import {
  buildContextWindow,
  splitHighlightedText,
  type HighlightSegment,
} from '../../lib/transcript/contextWindow'

interface TranscriptContextProps {
  turns?: SpeakerTurn[] | null
  quote: string
  timestamp?: string
}

const SPEAKER_CHIP_STYLES: Record<string, string> = {
  interviewer:
    'bg-navy-100 text-navy-800 dark:bg-navy-800 dark:text-navy-100',
  candidate:
    'bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-200',
}

function speakerChipClass(speaker: string): string {
  return (
    SPEAKER_CHIP_STYLES[speaker.toLowerCase()] ??
    'bg-chip text-fg-muted dark:bg-navy-800 dark:text-navy-200'
  )
}

function HighlightedQuote({
  text,
  quote,
}: {
  text: string
  quote: string
}) {
  const segments: HighlightSegment[] = splitHighlightedText(text, quote)

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="rounded bg-accent-200/70 px-0.5 text-fg-strong dark:bg-accent-500/30 dark:text-accent-50"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

function QuoteFallback({
  quote,
  timestamp,
  note,
}: {
  quote: string
  timestamp?: string
  note?: string
}) {
  return (
    <div className="mt-3">
      <blockquote className="rounded-r-lg border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-relaxed text-fg-muted">
        &ldquo;{quote}&rdquo;
        {timestamp && (
          <span className="ml-2 block text-xs not-italic text-fg-subtle">
            — {timestamp}
          </span>
        )}
      </blockquote>
      {note && (
        <p role="note" className="mt-2 text-xs text-fg-subtle">
          {note}
        </p>
      )}
    </div>
  )
}

/**
 * Shows the evidence quote inside its surrounding transcript turns so a
 * reviewer can judge the quote in context. Falls back to the plain quote when
 * the transcript is unavailable or the quote cannot be located.
 */
export function TranscriptContext({
  turns,
  quote,
  timestamp,
}: TranscriptContextProps) {
  const transcriptWindow = useMemo(
    () => buildContextWindow(turns ?? [], quote),
    [turns, quote],
  )

  if (!turns || turns.length === 0) {
    return <QuoteFallback quote={quote} timestamp={timestamp} />
  }

  if (transcriptWindow.matchIndex < 0) {
    return (
      <QuoteFallback
        quote={quote}
        timestamp={timestamp}
        note="This sentence was not found in the transcript. Showing the quoted evidence only."
      />
    )
  }

  return (
    <div className="mt-3 rounded-r-lg border-l-4 border-accent-500 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
          Transcript context
        </span>
        <span className="text-xs text-fg-subtle">
          Turns {transcriptWindow.startIndex + 1}–
          {transcriptWindow.endIndex + 1} of {turns.length}
        </span>
      </div>

      <ol className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
        {transcriptWindow.turns.map(({ turn, index, isMatch }) => (
          <li
            key={index}
            aria-current={isMatch ? 'true' : undefined}
            className={cn(
              'rounded-lg px-2 py-1.5 transition-colors',
              isMatch
                ? 'bg-accent-50 ring-1 ring-accent-200 dark:bg-accent-500/10 dark:ring-accent-500/30'
                : 'hover:bg-chip/60 dark:hover:bg-navy-800/40',
            )}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                  speakerChipClass(turn.speaker),
                )}
              >
                {turn.speaker}
              </span>
              {turn.timestamp && (
                <span className="text-[11px] text-fg-subtle">
                  {turn.timestamp}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              {isMatch ? (
                <HighlightedQuote text={turn.text} quote={quote} />
              ) : (
                turn.text
              )}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
