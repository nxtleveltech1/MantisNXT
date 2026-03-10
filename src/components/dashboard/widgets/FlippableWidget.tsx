/**
 * Flippable Widget Component
 * Container that allows switching between multiple chart views
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WidgetView {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

export interface FlippableWidgetProps {
  views: WidgetView[];
  defaultViewId?: string;
  className?: string;
}

export function FlippableWidget({ views, defaultViewId, className }: FlippableWidgetProps) {
  const [currentViewIndex, setCurrentViewIndex] = useState(() => {
    if (defaultViewId) {
      const index = views.findIndex(v => v.id === defaultViewId);
      return index >= 0 ? index : 0;
    }
    return 0;
  });

  const currentView = views[currentViewIndex];
  return (
    <Card className={cn('rounded-lg border border-border bg-card shadow-sm', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg font-semibold">{currentView.title}</CardTitle>
            <CardDescription className="text-muted-foreground truncate text-sm">
              {currentView.description}
            </CardDescription>
          </div>
          <div className="flex shrink-0 border-b border-border">
            {views.map((view, index) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setCurrentViewIndex(index)}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  index === currentViewIndex
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {view.title}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[300px]">{currentView.component}</div>
      </CardContent>
    </Card>
  );
}
