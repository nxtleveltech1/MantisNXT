'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Error and feedback interfaces from the error manager
interface UserFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string[];
  actions?: {
    label: string;
    action: string;
    variant?: 'primary' | 'secondary' | 'destructive';
  }[];
  dismissible?: boolean;
  persistent?: boolean;
  correlationId?: string;
}

interface ErrorStatistics {
  totalErrors: number;
  errorsBySeverity: Record<string, number>;
  errorsByCategory: Record<string, number>;
  mostCommonErrors: { code: string; count: number; message: string }[];
  affectedRows: number[];
  recoveryRate: number;
}

interface UploadProgress {
  totalRows: number;
  processedRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  skippedRows: number;
}

interface UploadFeedbackSystemProps {
  sessionId: string;
  feedback: UserFeedback[];
  statistics?: ErrorStatistics;
  progress?: UploadProgress;
  status?: string;
  onAction?: (action: string, parameters?: unknown) => void;
  onDismiss?: (feedbackId: string) => void;
  className?: string;
}

export function UploadFeedbackSystem({
  sessionId,
  feedback = [],
  statistics,
  progress,
  status,
  onAction,
  onDismiss,
  className = '',
}: UploadFeedbackSystemProps) {
  const [dismissedFeedback, setDismissedFeedback] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);

  // Filter out dismissed feedback
  const activeFeedback = feedback.filter(
    f => !f.dismissible || !dismissedFeedback.has(f.correlationId || f.title)
  );

  const handleDismiss = (feedbackItem: UserFeedback) => {
    const id = feedbackItem.correlationId || feedbackItem.title;
    setDismissedFeedback(prev => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const handleAction = (action: string, parameters?: unknown) => {
    onAction?.(action, parameters);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getFeedbackIcon = (type: UserFeedback['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertVariant = (type: UserFeedback['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  const calculateProgressPercentage = () => {
    if (!progress || progress.totalRows === 0) return 0;
    return Math.round((progress.processedRows / progress.totalRows) * 100);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
      case 'validating':
      case 'importing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Overview */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 ${status === 'processing' ? 'animate-spin' : ''}`} />
              Upload Progress
              {status && (
                <Badge variant="outline" className={getStatusColor(status)}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={calculateProgressPercentage()} className="w-full" />

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{progress.totalRows}</div>
                <div className="text-gray-600">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{progress.validRows}</div>
                <div className="text-gray-600">Valid</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{progress.errorRows}</div>
                <div className="text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-yellow-600">{progress.warningRows}</div>
                <div className="text-gray-600">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-600">{progress.skippedRows}</div>
                <div className="text-gray-600">Skipped</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Feedback Messages */}
      <div className="space-y-4">
        {activeFeedback.map((feedbackItem, index) => (
          <Alert key={index} variant={getAlertVariant(feedbackItem.type)}>
            <div className="flex items-start justify-between">
              <div className="flex flex-1 items-start gap-3">
                {getFeedbackIcon(feedbackItem.type)}
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">{feedbackItem.title}</AlertTitle>
                  <AlertDescription className="mt-2">{feedbackItem.message}</AlertDescription>

                  {/* Details Section */}
                  {feedbackItem.details && feedbackItem.details.length > 0 && (
                    <Collapsible className="mt-3">
                      <CollapsibleTrigger
                        className="flex items-center gap-2 text-sm font-medium hover:underline"
                        onClick={() => toggleSection(`details-${index}`)}
                      >
                        {expandedSections.has(`details-${index}`) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        View Details ({feedbackItem.details.length} item
                        {feedbackItem.details.length !== 1 ? 's' : ''})
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <ScrollArea className="h-32 w-full rounded border bg-gray-50 p-2">
                          <ul className="space-y-1 text-sm">
                            {feedbackItem.details
                              .slice(0, showAllErrors ? undefined : 10)
                              .map((detail, detailIndex) => (
                                <li key={detailIndex} className="text-gray-700">
                                  • {detail}
                                </li>
                              ))}
                            {!showAllErrors && feedbackItem.details.length > 10 && (
                              <li>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600"
                                  onClick={() => setShowAllErrors(true)}
                                >
                                  Show {feedbackItem.details.length - 10} more...
                                </Button>
                              </li>
                            )}
                          </ul>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Action Buttons */}
                  {feedbackItem.actions && feedbackItem.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {feedbackItem.actions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant={
                            action.variant === 'primary'
                              ? 'default'
                              : action.variant === 'destructive'
                                ? 'destructive'
                                : 'outline'
                          }
                          size="sm"
                          onClick={() => handleAction(action.action)}
                          className="text-xs"
                        >
                          {action.label}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dismiss Button */}
              {feedbackItem.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(feedbackItem)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Alert>
        ))}
      </div>

      {/* Error Statistics */}
      {statistics && statistics.totalErrors > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Analysis
            </CardTitle>
            <CardDescription>Detailed breakdown of errors and validation issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Summary */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <div className="text-lg font-semibold text-red-600">
                  {statistics.errorsBySeverity.critical || 0}
                </div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="rounded-lg bg-orange-50 p-3 text-center">
                <div className="text-lg font-semibold text-orange-600">
                  {statistics.errorsBySeverity.error || 0}
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3 text-center">
                <div className="text-lg font-semibold text-yellow-600">
                  {statistics.errorsBySeverity.warning || 0}
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {statistics.errorsBySeverity.info || 0}
                </div>
                <div className="text-sm text-gray-600">Info</div>
              </div>
            </div>

            <Separator />

            {/* Most Common Errors */}
            {statistics.mostCommonErrors.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold">Most Common Issues</h4>
                <div className="space-y-2">
                  {statistics.mostCommonErrors.slice(0, 5).map((error, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded bg-gray-50 p-2"
                    >
                      <span className="text-sm text-gray-700">{error.message}</span>
                      <Badge variant="outline">{error.count} occurrences</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Rows */}
            {statistics.affectedRows.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold">Affected Rows</h4>
                <div className="text-sm text-gray-600">
                  Rows with issues: {statistics.affectedRows.slice(0, 20).join(', ')}
                  {statistics.affectedRows.length > 20 &&
                    ` and ${statistics.affectedRows.length - 20} more...`}
                </div>
              </div>
            )}

            {/* Recovery Rate */}
            <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
              <span className="font-medium text-green-800">Recovery Rate</span>
              <span className="font-semibold text-green-600">
                {Math.round(statistics.recoveryRate * 100)}%
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('download_error_report')}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Error Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('view_error_details')}
              >
                <Eye className="mr-2 h-4 w-4" />
                View All Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {feedback.length === 0 &&
        (!progress || progress.errorRows === 0) &&
        status === 'completed' && (
          <Alert>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertTitle>Upload Completed Successfully</AlertTitle>
            <AlertDescription>
              All records were processed without errors. Your pricelist has been successfully
              imported.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}

export default UploadFeedbackSystem;
