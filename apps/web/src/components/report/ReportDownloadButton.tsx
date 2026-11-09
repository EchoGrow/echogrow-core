import { useState } from 'react'
import { Button } from '../ui'
import { getDiscrepancies, getRoadmap } from '../../lib/api'
import type { ScorecardResponse } from '../../lib/api'
import { downloadFullReportPDF } from '../../lib/export/exportFullReport'

export interface ReportDownloadButtonProps {
  interviewId: string
  candidateName: string
  interviewDate: string
  scorecard: ScorecardResponse
}

export function ReportDownloadButton({ interviewId, candidateName, interviewDate, scorecard }: ReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const [discrepancies, roadmap] = await Promise.all([
        getDiscrepancies(interviewId),
        getRoadmap(interviewId),
      ])
      await downloadFullReportPDF(
        candidateName,
        interviewDate,
        scorecard,
        discrepancies,
        roadmap,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate the report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" onClick={handleDownload} loading={loading}>
        Download full report
      </Button>
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  )
}