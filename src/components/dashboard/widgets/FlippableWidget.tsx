/**
 * Flippable Widget Component
 * Container that allows switching between multiple chart views
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const canGoBack = currentViewIndex > 0;
  const canGoForward = currentViewIndex < views.length - 1;

  const goToPrevious = () => {
    if (canGoBack) {
      setCurrentViewIndex((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (canGoForward) {
      setCurrentViewIndex((prev) => prev + 1);
    }
  };

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
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={!canGoBack}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {currentViewIndex + 1} / {views.length}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={!canGoForward}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* View indicators */}
        <div className="flex gap-1 mt-3">
          {views.map((view, index) => (
            <button
              key={view.id}
              onClick={() => setCurrentViewIndex(index)}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                index === currentViewIndex
                  ? 'bg-primary'
                  : 'bg-muted hover:bg-muted-foreground/20'
              )}
              aria-label={`Go to ${view.title}`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[300px]">{currentView.component}</div>
      </CardContent>
    </Card>
  );
}
