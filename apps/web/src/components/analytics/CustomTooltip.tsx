import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface TooltipPayloadItem {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string
  payload?: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string | number
  /** Optional formatter for the value */
  valueFormatter?: (value: number | string, name?: string) => ReactNode
  /** Optional label formatter */
  labelFormatter?: (label: string | number) => string
}

/**
 * Custom tooltip for Recharts that works properly in both light and dark mode.
 * Prevents the "black text on dark background" issue.
 */
export function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="min-w-[140px] rounded-lg border border-line-strong bg-surface-card px-3 py-2 text-xs shadow-lift dark:border-navy-600 dark:bg-navy-900">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-fg-strong">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((item, idx) => (
          <li key={idx} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-fg-muted">
              {item.color && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{item.name ?? item.dataKey}</span>
            </span>
            <span className={cn('font-semibold tabular-nums text-fg-strong')}>
              {valueFormatter ? valueFormatter(item.value ?? '', item.name) : item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}