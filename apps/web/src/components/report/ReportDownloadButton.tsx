import { useState } from 'react'
import { Button, toast } from '../ui'
import { getDiscrepancies, getRoadmap } from '../../lib/api'
import type { ScorecardResponse } from '../../lib/api'
import { downloadFullReportPDF } from '../../lib/export/exportFullReport'

export interface ReportDownloadButtonProps {
  interviewId: string
  candidateName: string
  interviewDate: string
  scorecard: ScorecardResponse
}

export function ReportDownloadButton({
  interviewId,
  candidateName,
  interviewDate,
  scorecard,
}: ReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
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
      toast.success('Report downloaded', {
        description: 'Ready to share with the candidate.',
      })
    } catch (cause) {
      toast.error('Could not generate the report', {
        description:
          cause instanceof Error ? cause.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={handleDownload} loading={loading}>
      Download full report
    </Button>
  )
}