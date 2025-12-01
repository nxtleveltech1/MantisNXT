'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormDividerProps {
  text?: string;
  className?: string;
}

export function FormDivider({ text = 'OR CONTINUE WITH', className }: FormDividerProps) {
  return (
    <div
      className={cn('relative flex items-center py-2', className)}
      role="separator"
      aria-label={text}
    >
      <div className="border-border flex-grow border-t" />
      <span className="text-muted-foreground mx-4 flex-shrink text-xs font-medium tracking-wider uppercase">
        {text}
      </span>
      <div className="border-border flex-grow border-t" />
    </div>
  );
}
