'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, Gift, CreditCard, ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type {
  CustomerLoyalty,
  LoyaltyTransaction,
  RewardRedemption,
  TransactionType,
  RedemptionStatus,
  LoyaltyTier,
  TierBenefit,
} from '@/types/loyalty';

const adjustmentSchema = z.object({
  points_amount: z.number().min(1, 'Amount is required'),
  transaction_type: z.enum(['adjust', 'bonus']),
  description: z.string().min(1, 'Description is required'),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-blue-400',
  diamond: 'bg-purple-500',
};

const TRANSACTION_ICONS: Record<TransactionType, unknown> = {
  earn: ArrowUpCircle,
  redeem: ArrowDownCircle,
  expire: Clock,
  adjust: CreditCard,
  bonus: Gift,
};

const STATUS_COLORS: Record<RedemptionStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-blue-500',
  fulfilled: 'bg-green-500',
  cancelled: 'bg-red-500',
  expired: 'bg-gray-500',
};

interface CustomerLoyaltyProfileProps {
  customerId: string;
}

export default function CustomerLoyaltyProfile({ customerId }: CustomerLoyaltyProfileProps) {
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch customer loyalty data
  const { data: loyalty, isLoading: loyaltyLoading } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/loyalty/customers/${customerId}`);
      if (!res.ok) throw new Error('Failed to fetch customer loyalty');
      return res.json() as Promise<CustomerLoyalty & { tier_benefits: TierBenefit }>;
    },
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['loyalty-transactions', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/loyalty/customers/${customerId}/transactions`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json() as Promise<LoyaltyTransaction[]>;
    },
  });

  // Fetch redemptions
  const { data: redemptions, isLoading: redemptionsLoading } = useQuery({
    queryKey: ['customer-redemptions', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/loyalty/customers/${customerId}/redemptions`);
      if (!res.ok) throw new Error('Failed to fetch redemptions');
      return res.json() as Promise<(RewardRedemption & { reward_name?: string })[]>;
    },
  });

  // Fetch program details
  const { data: program } = useQuery({
    queryKey: ['loyalty-program', loyalty?.program_id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/loyalty/programs/${loyalty!.program_id}`);
      if (!res.ok) throw new Error('Failed to fetch program');
      return res.json();
    },
    enabled: !!loyalty?.program_id,
  });

  // Form
  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      points_amount: 0,
      transaction_type: 'adjust',
      description: '',
    },
  });

  // Adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      const res = await fetch(`/api/v1/admin/loyalty/customers/${customerId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to adjust points');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Points adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-loyalty', customerId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions', customerId] });
      setIsAdjustDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: AdjustmentFormData) => {
    adjustMutation.mutate(data);
  };

  // Calculate tier progress
  const tierProgress = React.useMemo(() => {
    if (!loyalty || !program) return { current: 0, next: 0, progress: 0, nextTier: null };

    const tiers: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tiers.indexOf(loyalty.current_tier);

    if (currentIndex === tiers.length - 1) {
      // Already at highest tier
      return {
        current: program.tier_thresholds[loyalty.current_tier],
        next: program.tier_thresholds[loyalty.current_tier],
        progress: 100,
        nextTier: null,
      };
    }

    const nextTier = tiers[currentIndex + 1];
    const currentThreshold = program.tier_thresholds[loyalty.current_tier];
    const nextThreshold = program.tier_thresholds[nextTier];
    const pointsInTier = loyalty.total_points_earned - currentThreshold;
    const tierRange = nextThreshold - currentThreshold;
    const progress = (pointsInTier / tierRange) * 100;

    return {
      current: currentThreshold,
      next: nextThreshold,
      progress: Math.min(progress, 100),
      nextTier,
    };
  }, [loyalty, program]);

  if (loyaltyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!loyalty) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center">
          No loyalty data found for this customer
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Loyalty Summary</span>
            <Button size="sm" onClick={() => setIsAdjustDialogOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Adjust Points
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tier Badge */}
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-4 ${TIER_COLORS[loyalty.current_tier]}`}>
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-2xl font-bold capitalize">{loyalty.current_tier} Tier</h3>
                <Badge variant="outline">
                  Since {format(new Date(loyalty.tier_qualified_date), 'MMM yyyy')}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {loyalty.tier_benefits?.multiplier}x points multiplier
                {loyalty.tier_benefits?.discount &&
                  ` • ${loyalty.tier_benefits.discount}% discount`}
              </p>
            </div>
          </div>

          {/* Tier Progress */}
          {tierProgress.nextTier && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to {tierProgress.nextTier}</span>
                <span className="font-medium">
                  {loyalty.total_points_earned.toLocaleString()} /{' '}
                  {tierProgress.next.toLocaleString()} pts
                </span>
              </div>
              <Progress value={tierProgress.progress} className="h-2" />
              <p className="text-muted-foreground text-xs">
                {(tierProgress.next - loyalty.total_points_earned).toLocaleString()} points to go
              </p>
            </div>
          )}

          <Separator />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Points Balance</p>
              <p className="text-2xl font-bold">{loyalty.points_balance.toLocaleString()}</p>
              {loyalty.points_pending > 0 && (
                <p className="text-muted-foreground text-xs">
                  +{loyalty.points_pending.toLocaleString()} pending
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Total Earned</p>
              <p className="text-2xl font-bold">{loyalty.total_points_earned.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Total Redeemed</p>
              <p className="text-2xl font-bold">{loyalty.total_points_redeemed.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Lifetime Value</p>
              <p className="text-2xl font-bold">${loyalty.lifetime_value.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Referrals</p>
              <p className="text-2xl font-bold">{loyalty.referral_count}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Member Since</p>
              <p className="text-lg font-semibold">
                {format(new Date(loyalty.created_at), 'MMM yyyy')}
              </p>
            </div>
          </div>

          {/* Tier Benefits */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Current Benefits</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{loyalty.tier_benefits?.multiplier}x Points</Badge>
              {loyalty.tier_benefits?.discount && (
                <Badge variant="secondary">{loyalty.tier_benefits.discount}% Discount</Badge>
              )}
              {loyalty.tier_benefits?.free_shipping && (
                <Badge variant="secondary">Free Shipping</Badge>
              )}
              {loyalty.tier_benefits?.priority_support && (
                <Badge variant="secondary">Priority Support</Badge>
              )}
              {loyalty.tier_benefits?.dedicated_rep && (
                <Badge variant="secondary">Dedicated Rep</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent points activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map(transaction => {
                  const Icon = TRANSACTION_ICONS[transaction.transaction_type];
                  const isPositive = ['earn', 'adjust', 'bonus'].includes(
                    transaction.transaction_type
                  );

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`h-4 w-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                          />
                          <span className="capitalize">{transaction.transaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-right">
                        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          {isPositive ? '+' : '-'}
                          {Math.abs(transaction.points_amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {format(new Date(transaction.created_at), 'HH:mm')}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Redemption History */}
      <Card>
        <CardHeader>
          <CardTitle>Redemption History</CardTitle>
          <CardDescription>Reward redemptions</CardDescription>
        </CardHeader>
        <CardContent>
          {redemptionsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !redemptions || redemptions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No redemptions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map(redemption => (
                  <TableRow key={redemption.id}>
                    <TableCell className="font-medium">
                      {redemption.reward_name || 'Unknown Reward'}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
                        {redemption.redemption_code}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      {redemption.points_spent.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${STATUS_COLORS[redemption.status]}`}
                        />
                        <span className="capitalize">{redemption.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(redemption.redeemed_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
            <DialogDescription>Manually adjust customer points balance</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="adjust">Manual Adjustment</SelectItem>
                        <SelectItem value="bonus">Bonus Points</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter points amount"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Use positive for adding, negative for deducting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain the reason for this adjustment..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdjustDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Points'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
