/**
 * Optimization Run Details Page
 *
 * View recommendations for a specific optimization run
 *
 * Author: Aster
 * Date: 2025-01-27
 */

'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { OptimizationRun, OptimizationRecommendation } from '@/lib/db/pricing-schema';
import { RecommendationStatus } from '@/lib/db/pricing-schema';
import { formatCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function OptimizationRunDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<OptimizationRun | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    params.then(p => setRunId(p.id));
  }, [params]);

  useEffect(() => {
    if (runId) {
      fetchRunDetails();
      fetchRecommendations();
    }
  }, [runId, filterStatus, minConfidence]);

  const fetchRunDetails = async () => {
    if (!runId) return;
    try {
      const response = await fetch(`/api/v1/pricing/optimization/${runId}`);
      const data = await response.json();
      if (data.success) {
        setRun(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch run details:', error);
      toast.error('Failed to load optimization run details');
    }
  };

  const fetchRecommendations = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (minConfidence > 0) {
        params.append('min_confidence', minConfidence.toString());
      }
      params.append('recommendations', 'true');

      const response = await fetch(`/api/v1/pricing/optimization/${runId}?${params}`);
      const data = await response.json();
      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = async (recommendationId: string) => {
    try {
      setApplying(prev => [...prev, recommendationId]);
      const response = await fetch(`/api/v1/pricing/optimization/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_ids: [recommendationId],
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Recommendation applied successfully');
        fetchRecommendations();
        fetchRunDetails();
      } else {
        toast.error(data.error || 'Failed to apply recommendation');
      }
    } catch (error) {
      toast.error('Failed to apply recommendation');
    } finally {
      setApplying(prev => prev.filter(id => id !== recommendationId));
    }
  };

  const applyMultipleRecommendations = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select recommendations to apply');
      return;
    }

    try {
      setApplying(Array.from(selectedIds));
      const response = await fetch(`/api/v1/pricing/optimization/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Applied ${data.data.succeeded} recommendations successfully`);
        setSelectedIds(new Set());
        fetchRecommendations();
        fetchRunDetails();
      } else {
        toast.error(data.error || 'Failed to apply recommendations');
      }
    } catch (error) {
      toast.error('Failed to apply recommendations');
    } finally {
      setApplying([]);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const pendingRecs = recommendations.filter(
      r => r.status === RecommendationStatus.PENDING
    );
    if (selectedIds.size === pendingRecs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRecs.map(r => r.recommendation_id)));
    }
  };

  const getStatusBadge = (status: RecommendationStatus) => {
    switch (status) {
      case RecommendationStatus.APPLIED:
        return <Badge className="bg-green-500">Applied</Badge>;
      case RecommendationStatus.REJECTED:
        return <Badge variant="destructive">Rejected</Badge>;
      case RecommendationStatus.EXPIRED:
        return <Badge variant="secondary">Expired</Badge>;
      case RecommendationStatus.APPROVED:
        return <Badge className="bg-blue-500">Approved</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const pendingRecommendations = recommendations.filter(
    r => r.status === RecommendationStatus.PENDING
  );

  return (
    <AppLayout
      title="Optimization Run Details"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        { label: 'Optimization', href: '/pricing-optimization/optimization' },
        { label: run?.run_name || 'Details' },
      ]}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/pricing-optimization/optimization">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Optimization Runs
          </Button>
        </Link>

        {/* Run Summary */}
        {run && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{run.run_name}</CardTitle>
                  <CardDescription>
                    Started {new Date(run.created_at).toLocaleString()}
                    {run.completed_at && ` • Completed ${new Date(run.completed_at).toLocaleString()}`}
                  </CardDescription>
                </div>
                <Badge variant="outline">{run.strategy}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Products Analyzed</p>
                  <p className="text-2xl font-bold">{run.total_products_analyzed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommendations</p>
                  <p className="text-2xl font-bold">{run.recommendations_generated}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(run.estimated_revenue_impact || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profit Impact</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(run.estimated_profit_impact || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Bulk Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recommendations</CardTitle>
              {pendingRecommendations.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    disabled={applying.length > 0}
                  >
                    {selectedIds.size === pendingRecommendations.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                  <Button
                    onClick={applyMultipleRecommendations}
                    disabled={selectedIds.size === 0 || applying.length > 0}
                  >
                    {applying.length > 0 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Apply Selected ({selectedIds.size})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min confidence"
                  value={minConfidence}
                  onChange={e => setMinConfidence(parseFloat(e.target.value) || 0)}
                  className="w-[150px]"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recommendations found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            pendingRecommendations.length > 0 &&
                            selectedIds.size === pendingRecommendations.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Recommended</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recommendations.map(rec => {
                      const isSelected = selectedIds.has(rec.recommendation_id);
                      const isApplying = applying.includes(rec.recommendation_id);
                      const canSelect =
                        rec.status === RecommendationStatus.PENDING && !isApplying;

                      return (
                        <TableRow key={rec.recommendation_id}>
                          <TableCell>
                            {canSelect && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelection(rec.recommendation_id)}
                                className="rounded"
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {rec.product_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{formatCurrency(rec.current_price)}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(rec.recommended_price)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {rec.price_change_percent > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              <span
                                className={
                                  rec.price_change_percent > 0 ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {rec.price_change_percent > 0 ? '+' : ''}
                                {rec.price_change_percent.toFixed(2)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{rec.confidence_score.toFixed(0)}%</Badge>
                          </TableCell>
                          <TableCell>
                            {rec.projected_revenue_impact && (
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(rec.projected_revenue_impact)}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(rec.status)}</TableCell>
                          <TableCell>
                            {rec.status === RecommendationStatus.PENDING && (
                              <Button
                                size="sm"
                                onClick={() => applyRecommendation(rec.recommendation_id)}
                                disabled={isApplying}
                              >
                                {isApplying ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Apply'
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}



