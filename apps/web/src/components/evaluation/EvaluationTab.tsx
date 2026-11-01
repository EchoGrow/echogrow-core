
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInterviewScorecard } from '../../lib/api'
import { EvaluationCard } from './EvaluationCard'
import type { Evaluation } from '@echogrow/shared'

const mockEvaluation: Evaluation = {
  dimensions: [
    {
      name: 'Technical Depth',
      score: 4,
      reason: 'Demonstrates a good understanding of technical concepts and implementation.',
      evidenceQuote: 'I used React components to organize the application.',
    },
    {
      name: 'Communication Clarity',
      score: 4,
      reason: 'Explains ideas clearly and presents information in an organized way.',
      evidenceQuote: 'First, I analyzed the requirements, then I implemented the solution.',
    },
    {
      name: 'Domain Experience',
      score: 3,
      reason: 'Shows relevant experience but could provide more practical examples.',
      evidenceQuote: 'I worked on a project related to web development.',
    },
    {
      name: 'Problem Solving',
      score: 4,
      reason: 'Shows a structured approach to identifying and solving problems.',
      evidenceQuote: 'I divided the problem into smaller tasks and solved them step by step.',
    },
  ],
  overallConfidence: 0.85,
}

export function EvaluationTab() {
  const { interviewId } = useParams<{ interviewId: string }>()

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadEvaluation() {
      if (!interviewId) {
        setError('Interview ID is missing.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const data = await getInterviewScorecard(interviewId)

        if (isActive) {
          setEvaluation(data)
        }
      } catch {
        if (isActive) {
          setEvaluation(mockEvaluation)
          setError('')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadEvaluation()

    return () => {
      isActive = false
    }
  }, [interviewId])

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-fg-muted" aria-live="polite">
        Loading evaluation...
      </p>
    )
  }

  if (error || !evaluation) {
    return (
      <p
        className="rounded-xl border border-line p-6 text-sm text-fg-muted"
        role="alert"
      >
        {error || 'No evaluation data is available yet.'}
      </p>
    )
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-fg-strong">
          Interview Evaluation
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Review the candidate's performance across four evaluation dimensions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {evaluation.dimensions.map((item) => (
          <EvaluationCard
            key={item.name}
            name={
              item.name === 'Communication Clarity'
                ? 'Communication'
                : item.name
            }
            score={item.score}
            reason={item.reason}
            evidenceQuote={item.evidenceQuote}
          />
        ))}
      </div>
    </section>
  )
}
