
import { useState } from 'react'

interface EvidenceQuoteProps {
  quote: string
}

export function EvidenceQuote({ quote }: EvidenceQuoteProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="text-sm font-semibold text-accent-700 hover:underline"
      >
        {isOpen ? 'Hide Evidence' : 'View Evidence'}
      </button>

      {isOpen && (
        <blockquote className="mt-3 border-l-4 border-accent-500 bg-surface px-4 py-3 text-sm italic leading-6 text-fg-muted">
          "{quote}"
        </blockquote>
      )}
    </div>
  )
}
