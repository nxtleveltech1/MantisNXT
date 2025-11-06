'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface FormDividerProps {
  text?: string
  className?: string
}

export function FormDivider({ text = 'OR CONTINUE WITH', className }: FormDividerProps) {
  return (
    <div className={cn('relative flex items-center py-2', className)} role="separator" aria-label={text}>
      <div className="flex-grow border-t border-border" />
      <span className="mx-4 flex-shrink text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {text}
      </span>
      <div className="flex-grow border-t border-border" />
    </div>
  )
}
