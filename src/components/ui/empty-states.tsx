// @ts-nocheck
"use client"

import React from 'react';
import {
  PackageX,
  AlertCircle,
  Inbox,
  SearchX,
  Database,
  FilterX,
  CheckCircle2,
  InboxOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = ''
}) => (
  <div
    className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    role="status"
    aria-live="polite"
  >
    <div className="mb-4 text-muted-foreground opacity-50" aria-hidden="true">
      {icon || <Inbox className="h-12 w-12" />}
    </div>

    <h3 className="text-lg font-semibold text-foreground mb-2">
      {title}
    </h3>

    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
      {description}
    </p>

    {action && (
      <Button
        onClick={action.onClick}
        variant="default"
        size="sm"
        aria-label={action.label}
      >
        {action.label}
      </Button>
    )}
  </div>
);

export const NoAlertsEmptyState: React.FC<{ onRefresh?: () => void }> = ({
  onRefresh
}) => (
  <EmptyState
    icon={<CheckCircle2 className="h-12 w-12" />}
    title="No Active Alerts"
    description="Great job! All alerts have been addressed. The system is running smoothly."
    action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
  />
);

export const NoActivitiesEmptyState: React.FC<{ onRefresh?: () => void }> = ({
  onRefresh
}) => (
  <EmptyState
    icon={<AlertCircle className="h-12 w-12" />}
    title="No Recent Activities"
    description="There haven't been any activities in your system recently. Check back later for updates."
    action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
  />
);

export const NoInventoryEmptyState: React.FC<{ onAdd?: () => void }> = ({
  onAdd
}) => (
  <EmptyState
    icon={<PackageX className="h-12 w-12" />}
    title="No Inventory Items"
    description="Your inventory is empty. Start by adding your first product to track stock levels."
    action={onAdd ? { label: 'Add Item', onClick: onAdd } : undefined}
  />
);

export const NoSearchResultsEmptyState: React.FC<{ onClear?: () => void }> = ({
  onClear
}) => (
  <EmptyState
    icon={<SearchX className="h-12 w-12" />}
    title="No Results Found"
    description="We couldn't find anything matching your search. Try adjusting your filters or search terms."
    action={onClear ? { label: 'Clear Filters', onClick: onClear } : undefined}
  />
);

export const NoDataEmptyState: React.FC<{ onRetry?: () => void }> = ({
  onRetry
}) => (
  <EmptyState
    icon={<Database className="h-12 w-12" />}
    title="No Data Available"
    description="There's no data to display at the moment. This might be because the data source is empty or unavailable."
    action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
  />
);

export const NoFilteredResultsEmptyState: React.FC<{ onClearFilters?: () => void }> = ({
  onClearFilters
}) => (
  <EmptyState
    icon={<FilterX className="h-12 w-12" />}
    title="No Matches"
    description="No items match your current filters. Try adjusting or clearing filters to see more results."
    action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined}
  />
);

export const CardEmptyState: React.FC<EmptyStateProps> = (props) => (
  <Card className="border-dashed">
    <CardContent className="pt-6">
      <EmptyState {...props} />
    </CardContent>
  </Card>
);

export const InlineEmptyState: React.FC<{
  icon?: React.ReactNode;
  message: string;
}> = ({ icon, message }) => (
  <div
    className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground"
    role="status"
    aria-live="polite"
  >
    <div className="opacity-50" aria-hidden="true">
      {icon || <InboxOff className="h-5 w-5" />}
    </div>
    <span>{message}</span>
  </div>
);

export const MinimalEmptyState: React.FC<{ message: string }> = ({
  message
}) => (
  <div
    className="text-center py-6 text-sm text-muted-foreground"
    role="status"
    aria-live="polite"
  >
    {message}
  </div>
);

export default EmptyState;
