import { pdf } from '@react-pdf/renderer'
import { AnalyticsReportPDF } from './AnalyticsReportPDF'
import type { AnalyticsSummary } from '@echogrow/shared'

export class AnalyticsExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyticsExportError'
  }
}

export async function downloadAnalyticsPDF(
  data: AnalyticsSummary,
): Promise<void> {
  try {
    const blob = await pdf(<AnalyticsReportPDF data={data} />).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `EchoGrow-Analytics-${new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (cause) {
    throw new AnalyticsExportError(
      `PDF generation failed: ${cause instanceof Error ? cause.message : 'Unknown error'}`,
    )
  }
}

export function downloadAnalyticsJSON(data: AnalyticsSummary): void {
  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'EchoGrow — Analytics',
      website: 'echogrow.app',
      range: data.range,
    },
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `EchoGrow-Analytics-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}