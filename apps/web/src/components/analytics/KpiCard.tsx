import { motion } from 'framer-motion'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Card } from '../ui'

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

interface KpiCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: Tone
  suffix?: string
  trend?: { value: string; positive: boolean }
  onClick?: () => void
}

const TONES: Record<Tone, { iconBg: string; iconText: string; ring: string; valueText: string }> = {
  accent: {
    iconBg: 'bg-accent-500/15',
    iconText: 'text-accent-700 dark:text-accent-300',
    ring: 'ring-accent-500/20',
    valueText: 'text-fg-strong',
  },
  success: {
    iconBg: 'bg-success-50 dark:bg-success-500/15',
    iconText: 'text-success-700 dark:text-success-500',
    ring: 'ring-success-500/20',
    valueText: 'text-success-700 dark:text-success-500',
  },
  warning: {
    iconBg: 'bg-warning-50 dark:bg-warning-500/15',
    iconText: 'text-warning-700 dark:text-warning-500',
    ring: 'ring-warning-500/20',
    valueText: 'text-warning-700 dark:text-warning-500',
  },
  danger: {
    iconBg: 'bg-danger-50 dark:bg-danger-500/15',
    iconText: 'text-danger-700 dark:text-danger-500',
    ring: 'ring-danger-500/20',
    valueText: 'text-danger-700 dark:text-danger-500',
  },
  neutral: {
    iconBg: 'bg-chip',
    iconText: 'text-fg-muted',
    ring: 'ring-line',
    valueText: 'text-fg-strong',
  },
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'accent',
  suffix,
  trend,
  onClick,
}: KpiCardProps) {
  const styles = TONES[tone]
  const isClickable = typeof onClick === 'function'

  return (
    <motion.div
      whileHover={isClickable ? { y: -2 } : undefined}
      className="h-full"
    >
      <Card
        className={cn(
          'flex h-full flex-col p-5 shadow-sm transition-all duration-300',
          isClickable
            ? 'cursor-pointer hover:shadow-lift hover:border-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
            : 'hover:shadow-lift',
        )}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
            {label}
          </p>
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
              styles.iconBg,
              styles.iconText,
              styles.ring,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p
          className={cn(
            'mt-3 flex items-baseline gap-1 text-3xl font-bold tracking-tight tabular-nums',
            styles.valueText,
          )}
        >
          {value}
          {suffix && (
            <span className="text-sm font-medium text-fg-muted">{suffix}</span>
          )}
        </p>
        {hint && (
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p>
        )}
        {trend && (
          <p
            className={cn(
              'mt-2 inline-flex items-center gap-1 text-[11px] font-semibold',
              trend.positive
                ? 'text-success-700 dark:text-success-500'
                : 'text-danger-700 dark:text-danger-500',
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
        {isClickable && (
          <p className="mt-auto flex items-center justify-end gap-1 pt-3 text-[11px] font-semibold text-accent-700 dark:text-accent-300">
            View details
            <ChevronRight className="h-3 w-3" />
          </p>
        )}
      </Card>
    </motion.div>
  )
}