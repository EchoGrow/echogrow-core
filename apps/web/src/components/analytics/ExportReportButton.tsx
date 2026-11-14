import { useState } from 'react'
import { Download, FileJson, FileText, Loader2 } from 'lucide-react'
import { Button, toast } from '../ui'
import {
  downloadAnalyticsPDF,
  downloadAnalyticsJSON,
  AnalyticsExportError,
} from '../../lib/export/exportAnalyticsReport'
import type { AnalyticsSummary } from '@echogrow/shared'

interface ExportReportButtonProps {
  data: AnalyticsSummary
}

export function ExportReportButton({ data }: ExportReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'json' | null>(null)

  const handlePDF = async () => {
    setOpen(false)
    setExporting('pdf')
    try {
      await downloadAnalyticsPDF(data)
      toast.success('PDF downloaded', {
        description: 'Ready to share with the team.',
      })
    } catch (cause) {
      const message =
        cause instanceof AnalyticsExportError
          ? cause.message
          : 'Export failed'
      toast.error('Could not generate PDF', { description: message })
    } finally {
      setExporting(null)
    }
  }

  const handleJSON = () => {
    setOpen(false)
    try {
      downloadAnalyticsJSON(data)
      toast.success('JSON downloaded', {
        description: 'Ready for integrations.',
      })
    } catch {
      toast.error('Could not export JSON')
    }
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={exporting !== null}
        className="whitespace-nowrap"
      >
        {exporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface-card shadow-lift">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-chip"
              onClick={handlePDF}
            >
              <FileText className="h-4 w-4 text-accent-600" />
              Download PDF
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-chip"
              onClick={handleJSON}
            >
              <FileJson className="h-4 w-4 text-accent-600" />
              Download JSON
            </button>
          </div>
        </>
      )}
    </div>
  )
}