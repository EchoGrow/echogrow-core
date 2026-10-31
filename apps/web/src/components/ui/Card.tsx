import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface-card shadow-card',
        'transition-all duration-300 hover:shadow-lift hover:border-line-strong',
        className,
      )}
      {...rest}
    />
  )
}