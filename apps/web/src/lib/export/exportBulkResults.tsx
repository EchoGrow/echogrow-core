import { pdf } from '@react-pdf/renderer'
import { BulkResultsPDF } from './BulkResultsPDF'
import type { BulkUploadResultRecord, BulkUploadCandidate } from '../api'

/**
 * Exports the bulk upload results as a JSON file.
 */
export function exportBulkResultsAsJSON(
  results: BulkUploadResultRecord[],
  metadata: BulkUploadCandidate[],
): void {
  const payload = results.map((result) => {
    const meta = metadata.find((m) => m.candidateEmail === result.candidateEmail)
    return {
      candidateName: meta?.candidateName ?? result.candidateName,
      candidateEmail: result.candidateEmail,
      status: result.status,
      interviewId: result.interviewId ?? null,
      dashboardLink: result.interviewId
        ? `${window.location.origin}/dashboard/${result.interviewId}/overview`
        : null,
      error: result.error ?? null,
    }
  })

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `echogrow-bulk-results-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports the bulk upload results as a CSV file.
 */
export function exportBulkResultsAsCSV(
  results: BulkUploadResultRecord[],
  metadata: BulkUploadCandidate[],
): void {
  const headers = [
    'Candidate Name',
    'Email',
    'Status',
    'Interview ID',
    'Dashboard Link',
    'Error',
  ]

  const rows = results.map((result) => {
    const meta = metadata.find((m) => m.candidateEmail === result.candidateEmail)
    const dashboardLink = result.interviewId
      ? `${window.location.origin}/dashboard/${result.interviewId}/overview`
      : ''

    return [
      meta?.candidateName ?? result.candidateName,
      result.candidateEmail,
      result.status,
      result.interviewId ?? '',
      dashboardLink,
      result.error ?? '',
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `echogrow-bulk-results-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports the bulk upload results as a PDF file.
 */
export async function exportBulkResultsAsPDF(
  results: BulkUploadResultRecord[],
  metadata: BulkUploadCandidate[],
  summary: {
    total: number
    queued: number
    failed: number
    rejectedFilesCount: number
    scored?: number
    needsReview?: number
  },
): Promise<void> {
  const payload = results.map((result) => {
    const meta = metadata.find((m) => m.candidateEmail === result.candidateEmail)
    return {
      candidateName: meta?.candidateName ?? result.candidateName,
      candidateEmail: result.candidateEmail,
      status: result.status,
      interviewId: result.interviewId ?? null,
      error: result.error ?? null,
    }
  })

  const blob = await pdf(
    <BulkResultsPDF
      results={payload}
      summary={summary}
      generatedAt={new Date()}
    />,
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `echogrow-bulk-results-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}