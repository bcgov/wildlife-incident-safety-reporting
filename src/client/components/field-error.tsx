import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FieldError({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <p
      role="alert"
      className={cn('mt-1.5 text-xs text-destructive', className)}
    >
      {children}
    </p>
  )
}
