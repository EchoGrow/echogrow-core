
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Card, Spinner } from '../../components/ui'
import { DiscrepancyDetail } from '../../components/discrepancies/DiscrepancyDetail'

import {
  getDiscrepancies,
  updateDiscrepancyStatus,
} from '../../lib/api'

import type {
  DiscrepancyRecord,
  DiscrepancyStatus,
} from '../../lib/api'

export function ClaimVerificationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Fetch discrepancies for this interview
  useEffect(() => {
    let cancelled = false

    async function loadDiscrepancies() {
      setLoading(true)
      setError(null)

      try {
        const response = await getDiscrepancies(interviewId)

        if (!cancelled) {
          setDiscrepancies(response.discrepancies)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Failed to load discrepancies.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (interviewId) {
      loadDiscrepancies()
    } else {
      setError('Interview ID is missing.')
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [interviewId, reloadKey])

  // Confirm or dismiss a discrepancy
  async function handleStatusChange(
    id: string,
    status: DiscrepancyStatus,
  ) {
    setActionError(null)

    try {
      await updateDiscrepancyStatus(
        id,
        status as Exclude<DiscrepancyStatus, 'pending'>,
      )

      setDiscrepancies((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
      )
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'Failed to update discrepancy status.',
      )
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-fg-strong">
          Unable to load discrepancies
        </h2>

        <p className="mt-2 text-sm text-fg-muted">{error}</p>

        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="mt-5 rounded-lg bg-accent-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Try again
        </button>
      </Card>
    )
  }

  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
          Claim verification
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-fg-strong">
          Verification
        </h2>

        <p className="mt-2 text-sm text-fg-muted">
          Review claims that differ between the candidate's CV and interview.
          Confirm or dismiss each discrepancy.
        </p>
      </div>

      {actionError && (
        <Card className="p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {actionError}
          </p>
        </Card>
      )}

      {discrepancies.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold text-fg-strong">
            No discrepancies found
          </h3>

          <p className="mt-2 text-sm text-fg-muted">
            There are currently no claims requiring verification.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {discrepancies.map((discrepancy) => (
            <DiscrepancyDetail
              key={discrepancy.id}
              discrepancy={discrepancy}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}
