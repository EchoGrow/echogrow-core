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
    let timer: ReturnType<typeof setTimeout> | null = null

    const fetchData = () => {
      getScorecard(interviewId)
        .then((response) => {
          if (cancelled) return

          if (response.status === 'processing') {
            // Pipeline still running → poll again in 2 seconds.
            setState({ status: 'processing', scorecard: response, error: null })
            timer = setTimeout(() => setAttempt((v) => v + 1), 2000)
          } else if (response.status === 'needs_review') {
            setState({
              status: 'needs-review',
              scorecard: response,
              error: response.message ?? 'Manual review required.',
            })
          } else if (response.status === 'rejected') {
            setState({ status: 'rejected', scorecard: response, error: response.message })
          } else if (response.status === 'failed') {
            setState({ status: 'failed', scorecard: response, error: response.message })
          } else {
            // status === 'scored' — the scorecard exists, but the pipeline may
            // still be finishing verification and planning. The backend moves
            // through SCORED → SCORED → SCORED → COMPLETED as each step finishes,
            // and returns `progress.{isScored,isVerified,isPlanned}` so we can
            // tell exactly which step is done.
            //
            // Keep polling while:
            //   (a) the pipeline is still running (any of the three flags is false), OR
            //   (b) SPK is still being built (status 'pending' or 'building').
            //
            // Without this, the UI would freeze after Step 1 (isScored=true) and
            // show an incomplete report until a manual page reload.
            setState({ status: 'ready', scorecard: response, error: null })

            const progress = response.progress
            const pipelineStillRunning =
              progress !== undefined &&
              (!progress.isScored || !progress.isVerified || !progress.isPlanned)

            const spkBuilding =
              response.spkStatus === 'building' || response.spkStatus === 'pending'

            if (pipelineStillRunning || spkBuilding) {
              timer = setTimeout(() => setAttempt((v) => v + 1), 2000)
            }
          }
        })
        .catch((cause: unknown) => {
          if (cancelled) return

          const message =
            cause instanceof ApiError
              ? cause.message
              : 'Something went wrong while loading the scorecard. Please try again.'

          if (cause instanceof ApiError && cause.status === 400) {
            // 400 usually means the pipeline hasn't produced a scorecard yet.
            // Treat it like 'processing' and keep polling.
            setState({ status: 'processing', scorecard: null, error: message })
            timer = setTimeout(() => setAttempt((v) => v + 1), 3000)
          } else if (cause instanceof ApiError && cause.status === 404) {
            setState({ status: 'not-found', scorecard: null, error: message })
          } else {
            setState({ status: 'error', scorecard: null, error: message })
          }
        })
    }

    fetchData()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
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