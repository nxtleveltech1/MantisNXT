/**
 * RedemptionStatus - Track reward redemptions
 *
 * Features:
 * - List of redemptions
 * - Status badges
 * - Redemption code with copy
 * - Expected fulfillment date
 * - Progress stepper
 * - Filter by status
 * - Contact support link
 *
 * API: GET /api/v1/customers/[id]/loyalty/redemptions
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  Copy,
  Gift,
  Mail,
  Package,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RedemptionStatusProps {
  customerId: string;
}

interface Redemption {
  id: string;
  reward_id: string;
  reward_name: string;
  reward_type: string;
  points_spent: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  redemption_code: string;
  redeemed_at: string;
  fulfilled_at?: string;
  expected_fulfillment_date?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Package,
  },
  fulfilled: {
    label: 'Fulfilled',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Check,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: X,
  },
};

const REDEMPTION_STEPS = [
  { key: 'pending', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'fulfilled', label: 'Fulfilled' },
];

export function RedemptionStatus({ customerId }: RedemptionStatusProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-redemptions', customerId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/redemptions?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      return response.json();
    },
  });

  const redemptions = (data?.data || []) as Redemption[];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const getStepStatus = (
    redemption: Redemption,
    stepKey: string
  ): 'complete' | 'current' | 'upcoming' | 'cancelled' => {
    if (redemption.status === 'cancelled') return 'cancelled';

    const statusOrder = ['pending', 'approved', 'fulfilled'];
    const currentIndex = statusOrder.indexOf(redemption.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Redemption Status</h2>
          <p className="text-muted-foreground">Track your reward redemptions</p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Redemptions List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading redemptions...</p>
          </div>
        </div>
      ) : redemptions.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center space-y-4">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">No redemptions found</p>
              <p className="text-sm text-muted-foreground">
                Your redeemed rewards will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {redemptions.map((redemption, index) => {
            const statusConfig = STATUS_CONFIG[redemption.status];
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={redemption.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-lg">
                          {redemption.reward_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {redemption.points_spent.toLocaleString()} points
                          </span>
                          <span>•</span>
                          <span>
                            {format(
                              new Date(redemption.redeemed_at),
                              'MMM d, yyyy'
                            )}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('gap-1.5', statusConfig.color)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Progress Stepper (not for cancelled) */}
                    {redemption.status !== 'cancelled' && (
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          {REDEMPTION_STEPS.map((step, stepIndex) => {
                            const stepStatus = getStepStatus(
                              redemption,
                              step.key
                            );

                            return (
                              <div key={step.key} className="flex-1">
                                <div className="flex items-center">
                                  {/* Step Circle */}
                                  <div
                                    className={cn(
                                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                      stepStatus === 'complete' &&
                                        'bg-green-100 border-green-500',
                                      stepStatus === 'current' &&
                                        'bg-blue-100 border-blue-500',
                                      stepStatus === 'upcoming' &&
                                        'bg-muted border-muted-foreground/30'
                                    )}
                                  >
                                    {stepStatus === 'complete' ? (
                                      <Check className="h-5 w-5 text-green-600" />
                                    ) : stepStatus === 'current' ? (
                                      <Clock className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                                    )}
                                  </div>

                                  {/* Connector Line */}
                                  {stepIndex < REDEMPTION_STEPS.length - 1 && (
                                    <div
                                      className={cn(
                                        'h-0.5 flex-1 transition-colors',
                                        stepStatus === 'complete'
                                          ? 'bg-green-500'
                                          : 'bg-muted-foreground/30'
                                      )}
                                    />
                                  )}
                                </div>

                                {/* Step Label */}
                                <p
                                  className={cn(
                                    'mt-2 text-xs font-medium',
                                    stepStatus === 'complete' &&
                                      'text-green-600',
                                    stepStatus === 'current' && 'text-blue-600',
                                    stepStatus === 'upcoming' &&
                                      'text-muted-foreground'
                                  )}
                                >
                                  {step.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Redemption Code */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Redemption Code
                        </p>
                        <p className="font-mono text-lg font-semibold">
                          {redemption.redemption_code}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyCode(redemption.redemption_code)
                        }
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>

                    {/* Expected Fulfillment */}
                    {redemption.expected_fulfillment_date &&
                      redemption.status !== 'fulfilled' &&
                      redemption.status !== 'cancelled' && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900">
                              Expected Fulfillment
                            </p>
                            <p className="text-sm text-blue-700">
                              {format(
                                new Date(redemption.expected_fulfillment_date),
                                'MMMM d, yyyy'
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Fulfilled */}
                    {redemption.fulfilled_at && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-green-900">
                            Fulfilled
                          </p>
                          <p className="text-sm text-green-700">
                            {format(
                              new Date(redemption.fulfilled_at),
                              'MMMM d, yyyy h:mm a'
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cancelled */}
                    {redemption.status === 'cancelled' && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium text-red-900">
                            Cancelled
                          </p>
                          {redemption.cancellation_reason && (
                            <p className="text-sm text-red-700">
                              {redemption.cancellation_reason}
                            </p>
                          )}
                          {redemption.cancelled_at && (
                            <p className="text-xs text-red-600">
                              {format(
                                new Date(redemption.cancelled_at),
                                'MMMM d, yyyy h:mm a'
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {redemption.notes && (
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        <p className="font-medium mb-1">Notes:</p>
                        <p>{redemption.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {redemption.status !== 'fulfilled' &&
                      redemption.status !== 'cancelled' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <a href="mailto:support@example.com">
                              <Mail className="h-4 w-4" />
                              Contact Support
                            </a>
                          </Button>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Support Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="font-medium">Need Help?</p>
              <p className="text-sm text-muted-foreground">
                If you have questions about your redemption, our support team is
                here to help.
              </p>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="mailto:support@example.com">
                  <Mail className="h-4 w-4" />
                  Contact Support
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
