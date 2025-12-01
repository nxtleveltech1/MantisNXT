/**
 * Error states and empty states for SPP components
 * Friendly, actionable error messages with retry functionality
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  AlertTriangle,
  Database,
  FileX,
  RefreshCw,
  WifiOff,
  ShieldAlert,
  PackageX,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ConnectionError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn('border-red-200', className)}>
      <WifiOff className="h-4 w-4" />
      <AlertTitle>Connection Failed</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Unable to connect to the database. Please check your connection and try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ValidationError({ message, onRetry, className }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={cn('border-amber-200 bg-amber-50', className)}>
      <AlertTriangle className="h-4 w-4 text-amber-700" />
      <AlertTitle className="text-amber-900">Validation Error</AlertTitle>
      <AlertDescription className="mt-2 text-amber-800">
        <p className="mb-3">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function PermissionError({ className }: { className?: string }) {
  return (
    <Alert variant="destructive" className={cn('border-red-200', className)}>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Permission Denied</AlertTitle>
      <AlertDescription className="mt-2">
        <p>
          You don&apos;t have permission to perform this action. Please contact your administrator.
        </p>
      </AlertDescription>
    </Alert>
  );
}

export function DatabaseError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn('border-red-200', className)}>
      <Database className="h-4 w-4" />
      <AlertTitle>Database Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          A database error occurred. This has been logged and our team has been notified.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({
  icon: Icon = PackageX,
  title,
  message,
  action,
  actionLabel,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}
    >
      <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md text-sm">{message}</p>
      {action && actionLabel && (
        <Button onClick={action} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function NoUploadsState({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      icon={Upload}
      title="No Uploads Yet"
      message="Start by uploading your first supplier pricelist. Upload Excel or CSV files to build your product catalog."
      action={onUpload}
      actionLabel="Upload Pricelist"
    />
  );
}

export function NoSelectionState({ onCreateSelection }: { onCreateSelection: () => void }) {
  return (
    <EmptyState
      icon={CheckCircle2}
      title="No Active Selection"
      message="Create an inventory selection to choose which products to stock. This determines what appears in stock reports."
      action={onCreateSelection}
      actionLabel="Create Selection"
    />
  );
}

export function NoProductsState() {
  return (
    <EmptyState
      icon={PackageX}
      title="No Products Found"
      message="No products match your current filters. Try adjusting your search criteria or uploading new pricelists."
    />
  );
}

export function NoStockDataState() {
  return (
    <EmptyState
      icon={PackageX}
      title="No Stock Data"
      message="Stock on Hand data is only available for products in the active selection. Make sure you have activated a selection and added stock levels."
    />
  );
}

export function UploadFailedState({
  error,
  onRetry,
  onCancel,
}: {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <FileX className="h-5 w-5" />
          Upload Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">{error}</p>
        <div className="flex items-center gap-2">
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MergeFailedState({
  errors,
  onRetry,
  onCancel,
}: {
  errors: string[];
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Merge Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground mb-2 text-sm">
          The following errors occurred during merge:
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {errors.map((error, i) => (
            <li key={i} className="text-destructive">
              {error}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Merge
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GenericError({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('border-destructive', className)}>
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {title || 'Error'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm" className="flex-shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
