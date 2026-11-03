import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, getScorecard } from '../api'
import { INITIAL_SCORECARD_STATE, ScorecardContext } from './context'
import type { ScorecardState } from './context'

export function ScorecardProvider({
  interviewId,
  children,
}: {
  interviewId: string
  children: ReactNode
}) {
  const [state, setState] = useState<ScorecardState>(INITIAL_SCORECARD_STATE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!interviewId) return

    let cancelled = false

    getScorecard(interviewId)
      .then((response) => {
        if (cancelled) return
        
        if (response.status === 'needs_review') {
          setState({
            status: 'needs-review',
            scorecard: response,
            error: response.message ?? 'Manual review required.',
          })
        } else if (response.status === 'rejected') {
          setState({ status: 'rejected', scorecard: response, error: response.message })
        } else {
          setState({ status: 'ready', scorecard: response, error: null })
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return

        const message =
          cause instanceof ApiError
            ? cause.message
            : 'Something went wrong while loading the scorecard. Please try again.'

        if (cause instanceof ApiError && cause.status === 400) {
          setState({ status: 'processing', scorecard: null, error: message })
        } else if (cause instanceof ApiError && cause.status === 404) {
          setState({ status: 'not-found', scorecard: null, error: message })
        } else {
          setState({ status: 'error', scorecard: null, error: message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [interviewId, attempt])

  const refresh = useCallback(() => {
    setState(INITIAL_SCORECARD_STATE)
    setAttempt((value) => value + 1)
  }, [])

  const value = useMemo(
    () => ({
      ...(interviewId
        ? state
        : { status: 'not-found' as const, scorecard: null, error: null }),
      refresh,
    }),
    [interviewId, state, refresh],
  )

  return <ScorecardContext.Provider value={value}>{children}</ScorecardContext.Provider>
}