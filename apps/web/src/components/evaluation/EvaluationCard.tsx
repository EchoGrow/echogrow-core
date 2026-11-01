
import { EvidenceQuote } from './EvidenceQuote'

interface EvaluationCardProps {
  name: string
  score: number
  reason: string
  evidenceQuote: string
}

export function EvaluationCard({
  name,
  score,
  reason,
  evidenceQuote,
}: EvaluationCardProps) {
  return (
    <article className="rounded-xl border border-line bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-fg-strong">
          {name}
        </h3>

        <span className="rounded-lg bg-chip px-3 py-1 text-sm font-semibold text-accent-700">
          {score} / 5
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-fg-muted">
        {reason}
      </p>

      <EvidenceQuote quote={evidenceQuote} />
    </article>
  )
}
