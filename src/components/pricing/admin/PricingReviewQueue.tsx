'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface PricingRecommendation {
  recommendation_id: string;
  supplier_product_id: string;
  supplier_sku: string;
  product_name: string;
  supplier_name: string;
  unit_cost: number;
  current_selling_price: number;
  rule_based_price: number;
  ai_recommended_price: number;
  price_difference: number;
  recommended_margin: number;
  confidence_score: number;
  impact_on_revenue: number | null;
  impact_on_margin: number | null;
  impact_on_volume: number | null;
  reasoning: string;
  risk_factors: string[];
  review_status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  auto_applied: boolean;
  recommendation_created_at: string;
  priority: 'high' | 'medium' | 'low';
  eligible_for_auto_apply: boolean;
}

interface ReviewQueueResponse {
  recommendations: PricingRecommendation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function PricingReviewQueue() {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(''); // TODO: Get from auth context
  const [userId, setUserId] = useState(''); // TODO: Get from auth context
  const [priority, setPriority] = useState<string>('all');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PricingRecommendation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  // Fetch review queue
  const { data, isLoading, refetch } = useQuery<ReviewQueueResponse>({
    queryKey: ['pricing-review-queue', orgId, priority, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        org_id: orgId,
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (priority !== 'all') params.append('priority', priority);

      const response = await fetch(`/api/v1/pricing/review-queue?${params}`);
      if (!response.ok) throw new Error('Failed to fetch review queue');
      const result = await response.json();
      return result.data;
    },
    enabled: !!orgId,
  });

  // Review action mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      recommendation_id,
      action,
      notes,
    }: {
      recommendation_id: string;
      action: 'approve' | 'reject';
      notes?: string;
    }) => {
      const response = await fetch('/api/v1/pricing/review-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id,
          action,
          reviewed_by: userId,
          review_notes: notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to process review');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-review-queue'] });
      toast.success(
        variables.action === 'approve'
          ? 'Pricing recommendation approved and applied'
          : 'Pricing recommendation rejected'
      );
      setSelectedRecommendation(null);
      setReviewNotes('');
      setReviewAction(null);
    },
    onError: (error) => {
      toast.error(`Failed to process review: ${error.message}`);
    },
  });

  const handleReview = () => {
    if (!selectedRecommendation || !reviewAction) return;
    reviewMutation.mutate({
      recommendation_id: selectedRecommendation.recommendation_id,
      action: reviewAction,
      notes: reviewNotes,
    });
  };

  const openReviewDialog = (recommendation: PricingRecommendation, action: 'approve' | 'reject') => {
    setSelectedRecommendation(recommendation);
    setReviewAction(action);
    setReviewNotes('');
  };

  const closeReviewDialog = () => {
    setSelectedRecommendation(null);
    setReviewAction(null);
    setReviewNotes('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pricing Review Queue</h2>
          <p className="text-muted-foreground">
            Review and approve AI-generated pricing recommendations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.pagination.total}</div>
              <p className="text-xs text-muted-foreground">
                {data.pagination.hasMore ? 'Showing first' : 'Total'} {data.recommendations.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.recommendations.length > 0
                  ? (
                      data.recommendations.reduce(
                        (sum, r) => sum + r.confidence_score,
                        0
                      ) / data.recommendations.length
                    ).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">AI recommendation confidence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Eligible</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.recommendations.filter((r) => r.eligible_for_auto_apply).length}
              </div>
              <p className="text-xs text-muted-foreground">
                High confidence recommendations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations Requiring Review</CardTitle>
          <CardDescription>
            AI-generated pricing recommendations awaiting manual approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">All Caught Up!</h3>
              <p className="text-sm text-muted-foreground">
                No pricing recommendations pending review
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Rule-Based</TableHead>
                    <TableHead className="text-right">AI Recommended</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recommendations.map((rec) => (
                    <TableRow key={rec.recommendation_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{rec.product_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {rec.supplier_sku}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{rec.supplier_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.rule_based_price)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(rec.ai_recommended_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {rec.price_difference > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span
                            className={
                              rec.price_difference > 0 ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {rec.price_difference > 0 ? '+' : ''}
                            {rec.price_difference.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getConfidenceColor(rec.confidence_score)}>
                          {rec.confidence_score.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReviewDialog(rec, 'approve')}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReviewDialog(rec, 'reject')}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.total > limit && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1} to {Math.min(offset + limit, data.pagination.total)} of{' '}
                {data.pagination.total} recommendations
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={!data.pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRecommendation} onOpenChange={(open) => !open && closeReviewDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Pricing Recommendation
            </DialogTitle>
            <DialogDescription>
              Review the AI recommendation details before {reviewAction === 'approve' ? 'approving' : 'rejecting'}
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">{selectedRecommendation.product_name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">SKU:</span>{' '}
                    {selectedRecommendation.supplier_sku}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supplier:</span>{' '}
                    {selectedRecommendation.supplier_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit Cost:</span>{' '}
                    {formatCurrency(selectedRecommendation.unit_cost)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>{' '}
                    <span className={getConfidenceColor(selectedRecommendation.confidence_score)}>
                      {selectedRecommendation.confidence_score.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Comparison */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Rule-Based Price</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(selectedRecommendation.rule_based_price)}
                  </p>
                </div>
                <div className="rounded-lg border border-primary p-4 bg-primary/5">
                  <p className="text-xs text-muted-foreground">AI Recommended</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(selectedRecommendation.ai_recommended_price)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Change</p>
                  <p className={`text-xl font-semibold ${selectedRecommendation.price_difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedRecommendation.price_difference > 0 ? '+' : ''}
                    {selectedRecommendation.price_difference.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="rounded-lg border p-4">
                <h5 className="mb-2 flex items-center gap-2 font-semibold">
                  <Info className="h-4 w-4" />
                  AI Reasoning
                </h5>
                <p className="text-sm text-muted-foreground">{selectedRecommendation.reasoning}</p>
              </div>

              {/* Impact Analysis */}
              {(selectedRecommendation.impact_on_revenue !== null ||
                selectedRecommendation.impact_on_margin !== null ||
                selectedRecommendation.impact_on_volume !== null) && (
                <div className="rounded-lg border p-4">
                  <h5 className="mb-2 font-semibold">Projected Impact</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {selectedRecommendation.impact_on_revenue !== null && (
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>{' '}
                        <span className={selectedRecommendation.impact_on_revenue > 0 ? 'text-green-600' : 'text-red-600'}>
                          {selectedRecommendation.impact_on_revenue > 0 ? '+' : ''}
                          {selectedRecommendation.impact_on_revenue.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {selectedRecommendation.impact_on_margin !== null && (
                      <div>
                        <span className="text-muted-foreground">Margin:</span>{' '}
                        <span className={selectedRecommendation.impact_on_margin > 0 ? 'text-green-600' : 'text-red-600'}>
                          {selectedRecommendation.impact_on_margin > 0 ? '+' : ''}
                          {selectedRecommendation.impact_on_margin.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {selectedRecommendation.impact_on_volume !== null && (
                      <div>
                        <span className="text-muted-foreground">Volume:</span>{' '}
                        <span className={selectedRecommendation.impact_on_volume > 0 ? 'text-green-600' : 'text-red-600'}>
                          {selectedRecommendation.impact_on_volume > 0 ? '+' : ''}
                          {selectedRecommendation.impact_on_volume.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {selectedRecommendation.risk_factors.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <h5 className="mb-2 flex items-center gap-2 font-semibold text-yellow-900">
                    <AlertCircle className="h-4 w-4" />
                    Risk Factors
                  </h5>
                  <ul className="list-inside list-disc space-y-1 text-sm text-yellow-800">
                    {selectedRecommendation.risk_factors.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Review Notes */}
              <div className="space-y-2">
                <Label htmlFor="review-notes">
                  Review Notes {reviewAction === 'reject' && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="review-notes"
                  placeholder={`Add notes about your decision to ${reviewAction}...`}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeReviewDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending || (reviewAction === 'reject' && !reviewNotes)}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Approve & Apply' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
