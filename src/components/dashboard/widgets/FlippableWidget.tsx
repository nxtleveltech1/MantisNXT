/**
 * Flippable Widget Component
 * Container that allows switching between multiple chart views
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <Card className={cn('bg-card border-border rounded-xl border shadow-sm', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg font-semibold">{currentView.title}</CardTitle>
            <CardDescription className="text-muted-foreground truncate text-sm">
              {currentView.description}
            </CardDescription>
          </div>
          <div className="ml-4 flex shrink-0 flex-wrap items-center justify-end gap-2">
            {views.map((view, index) => (
              <Button
                key={view.id}
                variant={index === currentViewIndex ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentViewIndex(index)}
                className={`h-8 ${index === currentViewIndex ? 'bg-[#06B6D4] hover:bg-[#0891B2] text-white' : ''}`}
              >
                {view.title}
              </Button>
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
