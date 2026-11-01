import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, getScorecard } from '../api'
import { INITIAL_SCORECARD_STATE, ScorecardContext } from './context'
import type { ScorecardState } from './context'

/**
 * Fetches the scorecard once per interview and shares it with every dashboard
 * tab, so switching from Overview to Evaluation does not refetch or flash a
 * skeleton. #21 can consume `useScorecard()` as-is.
 *
 * Mount this with `key={interviewId}` so a different interview starts clean.
 */
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
      .then((scorecard) => {
        if (!cancelled) setState({ status: 'ready', scorecard, error: null })
      })
      .catch((cause: unknown) => {
        if (cancelled) return

        const message =
          cause instanceof ApiError
            ? cause.message
            : 'Something went wrong while loading the scorecard. Please try again.'

        // #18 returns 400 while the interview is still processing and 404 when
        // the session does not exist. Both deserve their own state.
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
