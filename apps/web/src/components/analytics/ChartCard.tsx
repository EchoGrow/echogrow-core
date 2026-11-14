import type { ReactNode } from 'react'
import { Card } from '../ui'

interface ChartCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({ title, description, action, children, className }: ChartCardProps) {
  return (
    <Card className={`overflow-hidden p-0 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-chip/50 to-transparent px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg-strong">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}