import { pdf } from '@react-pdf/renderer'
import { FullReportPDF } from './FullReportPDF'
import type { ScorecardResponse, DiscrepancyResponse, RoadmapResponse } from '../api'

export class ReportExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReportExportError'
  }
}

function isScored(s: ScorecardResponse): s is Extract<ScorecardResponse, { status: 'scored' }> {
  return (s as { status?: string }).status === 'scored'
}

export async function downloadFullReportPDF(
  candidateName: string,
  interviewDate: string,
  scorecard: ScorecardResponse,
  discrepancies: DiscrepancyResponse | null | undefined,
  roadmap: RoadmapResponse | null | undefined,
): Promise<void> {
  if (!isScored(scorecard)) {
    throw new ReportExportError('Scorecard is not ready yet. Wait for the analysis to finish.')
  }
  if (!discrepancies || !Array.isArray(discrepancies.discrepancies)) {
    throw new ReportExportError('Discrepancy data is missing.')
  }
  if (!roadmap || !Array.isArray(roadmap.gaps) || !Array.isArray(roadmap.roadmap)) {
    throw new ReportExportError('Roadmap data is missing.')
  }

  try {
    // Use JSX so TypeScript can infer the correct element type.
    // React.createElement(FullReportPDF, {...}) fails because pdf()
    // expects ReactElement<DocumentProps>, and FullReportPDF has
    // FullReportProps (which extends DocumentProps via its return type).
    // JSX avoids this mismatch and removes the need for `as any`.
    const blob = await pdf(
      <FullReportPDF
        candidateName={scorecard.candidateName || candidateName}
        interviewDate={scorecard.interviewDate || interviewDate}
        dimensions={scorecard.dimensions}
        overallConfidence={scorecard.overallConfidence}
        pendingDiscrepancies={scorecard.pendingDiscrepancies}
        skillGaps={scorecard.skillGaps}
        discrepancies={discrepancies.discrepancies}
        roadmap={roadmap}
      />,
    ).toBlob()

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `EchoGrow-Report-${(scorecard.candidateName || candidateName).replace(/\s+/g, '-')}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (cause) {
    throw new ReportExportError(`PDF generation failed: ${cause instanceof Error ? cause.message : 'Unknown error'}`)
  }
}