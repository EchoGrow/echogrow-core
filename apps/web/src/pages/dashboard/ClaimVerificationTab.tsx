import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, Spinner } from '../../components/ui'
import { ReviewBanner } from '../../components/ui/ReviewBanner'
import { DiscrepancyDetail } from '../../components/discrepancies/DiscrepancyDetail'
import { getDiscrepancies, updateDiscrepancyStatus } from '../../lib/api'
import type { DiscrepancyRecord, DiscrepancyStatus } from '../../lib/api'
import { useScorecard } from '../../lib/scorecard/useScorecard'
import { fadeUp, staggerContainer } from '../../lib/animations'

export function ClaimVerificationTab() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { status: scorecardStatus } = useScorecard()

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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
          setError(cause instanceof Error ? cause.message : 'Failed to load discrepancies.')
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
  }, [interviewId])

  async function handleStatusChange(id: string, status: DiscrepancyStatus) {
    setActionError(null)
    try {
      await updateDiscrepancyStatus(id, status as Exclude<DiscrepancyStatus, 'pending'>)
      
      setDiscrepancies((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      )
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to update status.')
    }
  }

  if (scorecardStatus === 'needs-review') {
    return <ReviewBanner />
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 animate-fade-in">
        <Spinner className="h-8 w-8 text-accent-600" />
        <p className="text-sm text-fg-muted">Loading discrepancies…</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center animate-fade-up">
        <h2 className="text-lg font-semibold text-fg-strong">Unable to load discrepancies</h2>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
        <Link
          to={`/dashboard/${interviewId}/overview`}
          className="mt-6 inline-block text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
        >
          ← Back to overview
        </Link>
      </Card>
    )
  }

  return (
    <motion.section 
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
          Claim verification
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-fg-strong sm:text-3xl">Verification</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Review claims that differ between the candidate's CV and interview. Confirm or dismiss each discrepancy.
        </p>
      </motion.div>

      {actionError && (
        <Card className="border-danger-500/30 bg-danger-50 p-4 animate-scale-in dark:bg-danger-500/10">
          <p className="text-sm text-danger-700 dark:text-danger-500">{actionError}</p>
        </Card>
      )}

      {discrepancies.length === 0 ? (
        <Card className="p-8 text-center animate-fade-up">
          <h3 className="text-lg font-semibold text-fg-strong">No discrepancies found</h3>
          <p className="mt-2 text-sm text-fg-muted">
            There are currently no claims requiring verification.
          </p>
        </Card>
      ) : (
        <div className="stagger space-y-4">
          {discrepancies.map((discrepancy) => (
            <DiscrepancyDetail
              key={discrepancy.id}
              discrepancy={discrepancy}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}