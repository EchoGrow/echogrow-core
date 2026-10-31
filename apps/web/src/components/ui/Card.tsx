import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** Surface container: one border, one soft shadow, brand radius. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-card', className)}
      {...rest}
    />
  )
}
