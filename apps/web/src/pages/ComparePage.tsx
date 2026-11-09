import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card } from '../components/ui'
import {
  ApiError,
  getScorecard,
  type ScorecardResponse,
  type ScoredResponse,
} from '../lib/api'

const DIMENSIONS = [
  'Technical Depth',
  'Communication Clarity',
  'Domain Experience',
  'Problem Solving',
] as const

type ComparisonMetric =
  | { kind: 'dimension'; name: (typeof DIMENSIONS)[number] }
  | { kind: 'count'; name: 'Pending discrepancies' | 'Skill gaps'; key: 'pendingDiscrepancies' | 'skillGaps' }
  | { kind: 'confidence'; name: 'Overall confidence' }

type ComparisonResult =
  | { key: string; status: 'ready'; candidates: ScoredResponse[] }
  | { key: string; status: 'pending' }
  | { key: string; status: 'error'; error: string }

const METRICS: ComparisonMetric[] = [
  ...DIMENSIONS.map((name) => ({ kind: 'dimension' as const, name })),
  { kind: 'count', name: 'Pending discrepancies', key: 'pendingDiscrepancies' },
  { kind: 'count', name: 'Skill gaps', key: 'skillGaps' },
  { kind: 'confidence', name: 'Overall confidence' },
]

function getMetricValue(candidate: ScoredResponse, metric: ComparisonMetric): number | undefined {
  if (metric.kind === 'dimension') {
    return candidate.dimensions.find((dimension) => dimension.name === metric.name)?.score
  }
  if (metric.kind === 'count') return candidate[metric.key]
  return candidate.overallConfidence
}

function getBestValue(metric: ComparisonMetric, candidates: ScoredResponse[]): number | undefined {
  const values = candidates
    .map((candidate) => getMetricValue(candidate, metric))
    .filter((value): value is number => value !== undefined)
  if (values.length === 0) return undefined

  return metric.kind === 'count' ? Math.min(...values) : Math.max(...values)
}

function formatMetricValue(metric: ComparisonMetric, value: number | undefined) {
  if (value === undefined) return '—'
  if (metric.kind === 'confidence') return `${Math.round(value * 100)}%`
  if (metric.kind === 'dimension') return `${value} / 5`
  return value
}

function getUnavailableMessage(response: Exclude<ScorecardResponse, ScoredResponse>) {
  if (response.status === 'needs_review') {
    return `${response.candidateName} needs manual review before the comparison is available.`
  }
  if (response.status === 'rejected') {
    return `${response.candidateName}'s interview was rejected and cannot be compared.`
  }
  return `${response.candidateName}'s interview evaluation failed and cannot be compared.`
}

export function ComparePage() {
  const [searchParams] = useSearchParams()
  const ids = useMemo(
    () => [...new Set((searchParams.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean))],
    [searchParams],
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const hasValidIds = ids.length >= 2 && ids.length <= 3
  const requestKey = `${ids.join(',')}:${reloadKey}`
  const currentResult = result?.key === requestKey ? result : null
  const loading =
    hasValidIds && (currentResult === null || currentResult.status === 'pending')
  const error = !hasValidIds
    ? 'Select two or three interview IDs to compare.'
    : currentResult?.status === 'error'
      ? currentResult.error
      : null
  const candidates =
    currentResult?.status === 'ready' ? currentResult.candidates : []

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined

    if (!hasValidIds) return

    const fetchCandidates = async () => {
      try {
        const results = await Promise.all(ids.map((id) => getScorecard(id)))
        if (!active) return

        const scoredCandidates = results.filter(
          (result): result is ScoredResponse => result.status === 'scored',
        )

        if (scoredCandidates.length === results.length) {
          setResult({
            key: requestKey,
            status: 'ready',
            candidates: scoredCandidates,
          })
          return
        }

        const unavailable = results.find(
          (result) =>
            result.status !== 'scored' && result.status !== 'processing',
        )
        if (unavailable) {
          setResult({
            key: requestKey,
            status: 'error',
            error: getUnavailableMessage(unavailable),
          })
          return
        }

        setResult({ key: requestKey, status: 'pending' })
        timer = setTimeout(() => {
          void fetchCandidates()
        }, 2000)
      } catch (cause: unknown) {
        if (!active) return
        setResult({
          key: requestKey,
          status: 'error',
          error: cause instanceof ApiError ? cause.message : 'Could not load candidate comparisons.',
        })
      }
    }

    void fetchCandidates()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [hasValidIds, ids, requestKey])

  return (
    <main className="container-custom min-h-svh max-w-6xl py-8 lg:py-12">
      <header className="mb-8">
        <Link to="/upload" className="text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300">
          ← Back to upload
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
          Candidate shortlist
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-fg-strong">Candidate comparison</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Compare evaluation scores, open discrepancies, skill gaps, and confidence side by side.
        </p>
      </header>

      {loading && (
        <p role="status" className="py-8 text-center text-sm text-fg-muted">
          Waiting for all candidates to finish scoring. This comparison updates automatically…
        </p>
      )}

      {!loading && error && (
        <Alert variant="error" title="Unable to compare candidates">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th scope="col" className="w-52 px-5 py-4 font-semibold text-fg-muted">Measure</th>
                  {candidates.map((candidate) => (
                    <th key={candidate.interviewId} scope="col" className="px-5 py-4 font-semibold">
                      <Link
                        to={`/dashboard/${encodeURIComponent(candidate.interviewId)}/overview`}
                        className="text-accent-700 hover:underline dark:text-accent-300"
                      >
                        {candidate.candidateName}
                      </Link>
                      <span className="mt-1 block font-mono text-xs font-normal text-fg-muted">
                        {candidate.interviewId}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const best = getBestValue(metric, candidates)
                  return (
                    <tr key={metric.name} className="border-b border-line last:border-0">
                      <th scope="row" className="px-5 py-4 font-medium text-fg-strong">{metric.name}</th>
                      {candidates.map((candidate) => {
                        const value = getMetricValue(candidate, metric)
                        const isBest = value !== undefined && value === best
                        return (
                          <td
                            key={candidate.interviewId}
                            className={`px-5 py-4 tabular-nums text-fg ${isBest ? 'bg-success-50 font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-500' : ''}`}
                          >
                            {formatMetricValue(metric, value)}
                            {isBest && <span className="sr-only"> — best result</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && error && (
        <div className="mt-5">
          <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </div>
      )}
    </main>
  )
}
