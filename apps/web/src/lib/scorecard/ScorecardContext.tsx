import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { ApiError, getScorecard } from '../api'
import type { SpkStatus } from '../api'
import { INITIAL_SCORECARD_STATE, ScorecardContext } from './context'
import type { ScorecardState } from './context'

const SPK_BUILD_WATCHDOG_MS = 90_000

export function ScorecardProvider({
  interviewId,
  children,
}: {
  interviewId: string
  children: ReactNode
}) {
  const [state, setState] = useState<ScorecardState>(INITIAL_SCORECARD_STATE)
  const [attempt, setAttempt] = useState(0)

  const rebuildToastIdRef = useRef<string | number | null>(null)
  const previousSpkStatusRef = useRef<SpkStatus | null>(null)
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSpkStatus = useCallback(
    (status: SpkStatus, error: string | null = null) => {
      setState((prev) => {
        if (!prev.scorecard || prev.scorecard.status !== 'scored') {
          return prev
        }
        return {
          ...prev,
          scorecard: {
            ...prev.scorecard,
            spkStatus: status,
            spkError: error,
          },
        }
      })
    },
    [],
  )

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current !== null) {
      clearTimeout(watchdogTimerRef.current)
      watchdogTimerRef.current = null
    }
  }, [])

  const armWatchdog = useCallback(() => {
    clearWatchdog()
    watchdogTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (!prev.scorecard || prev.scorecard.status !== 'scored') {
          return prev
        }
        if (prev.scorecard.spkStatus !== 'building') {
          return prev
        }
        return {
          ...prev,
          scorecard: {
            ...prev.scorecard,
            spkStatus: 'failed',
            spkError:
              'The SPK rebuild did not respond within 90 seconds. This usually means the LLM call failed or timed out.',
          },
        }
      })
    }, SPK_BUILD_WATCHDOG_MS)
  }, [clearWatchdog])

  useEffect(() => {
    if (!interviewId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const fetchData = () => {
      getScorecard(interviewId)
        .then((response) => {
          if (cancelled) return

          if (response.status === 'processing') {
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

  const currentSpkStatus: SpkStatus | null =
    state.scorecard && state.scorecard.status === 'scored'
      ? state.scorecard.spkStatus ?? 'pending'
      : null

  useEffect(() => {
    if (currentSpkStatus === null) return

    const previous = previousSpkStatusRef.current
    const current = currentSpkStatus

    if (current === 'building' && previous !== 'building') {
      if (rebuildToastIdRef.current !== null) {
        toast.dismiss(rebuildToastIdRef.current)
      }
      rebuildToastIdRef.current = toast.loading('Rebuilding SPK profile…', {
        description:
          'Extracting metadata and verified skills. This may take up to 90 seconds.',
      })
      armWatchdog()
    }

    if (previous === 'building' && current === 'ready') {
      clearWatchdog()
      if (rebuildToastIdRef.current !== null) {
        toast.dismiss(rebuildToastIdRef.current)
        rebuildToastIdRef.current = null
      }
      toast.success('SPK updated', {
        description: 'Agent David now sees the latest human review decisions.',
      })
    }

    if (previous === 'building' && current === 'failed') {
      clearWatchdog()
      if (rebuildToastIdRef.current !== null) {
        toast.dismiss(rebuildToastIdRef.current)
        rebuildToastIdRef.current = null
      }
      toast.error('SPK rebuild failed', {
        description:
          state.scorecard?.status === 'scored'
            ? state.scorecard.spkError ?? 'The profile could not be rebuilt. Try again.'
            : 'The profile could not be rebuilt. Try again.',
      })
    }

    previousSpkStatusRef.current = current
  }, [currentSpkStatus, state.scorecard, armWatchdog, clearWatchdog])

  useEffect(() => {
    return () => {
      if (rebuildToastIdRef.current !== null) {
        toast.dismiss(rebuildToastIdRef.current)
      }
      clearWatchdog()
    }
  }, [clearWatchdog])

  const refresh = useCallback(() => {
    setState(INITIAL_SCORECARD_STATE)
    setAttempt((value) => value + 1)
  }, [])

  /**
   * Full dashboard reload. Resets state, clears the watchdog, and re-fetches
   * the scorecard. This causes DashboardLayout + all tabs to re-mount with
   * fresh data.
   */
  const retryAll = useCallback(() => {
    if (rebuildToastIdRef.current !== null) {
      toast.dismiss(rebuildToastIdRef.current)
      rebuildToastIdRef.current = null
    }
    clearWatchdog()
    setState(INITIAL_SCORECARD_STATE)
    setAttempt((value) => value + 1)
  }, [clearWatchdog])

  const value = useMemo(
    () => ({
      ...(interviewId
        ? state
        : { status: 'not-found' as const, scorecard: null, error: null }),
      refresh,
      retryAll,
      setSpkStatus,
    }),
    [interviewId, state, refresh, retryAll, setSpkStatus],
  )

  return <ScorecardContext.Provider value={value}>{children}</ScorecardContext.Provider>
}