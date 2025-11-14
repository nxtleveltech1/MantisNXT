/**
 * Flippable Widget Component
 * Container that allows switching between multiple chart views
 */

"use client";

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

export function FlippableWidget({
  views,
  defaultViewId,
  className,
}: FlippableWidgetProps) {
  const [currentViewIndex, setCurrentViewIndex] = useState(() => {
    if (defaultViewId) {
      const index = views.findIndex((v) => v.id === defaultViewId);
      return index >= 0 ? index : 0;
    }
    return 0;
  });

  const currentView = views[currentViewIndex];
  return (
    <Card className={cn('bg-card border border-border rounded-xl shadow-sm', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {currentView.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground truncate">
              {currentView.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4 flex-wrap justify-end">
            {views.map((view, index) => (
              <Button
                key={view.id}
                variant={index === currentViewIndex ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentViewIndex(index)}
                className="h-8"
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
