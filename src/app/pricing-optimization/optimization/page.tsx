/**
 * Pricing Optimization Page
 *
 * Start optimization runs and review recommendations
 *
 * Author: Aster
 * Date: 2025-11-02
 */

'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Play, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import type { OptimizationRun } from '@/lib/db/pricing-schema';
import { OptimizationStatus, PricingStrategy } from '@/lib/db/pricing-schema';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils/currency-formatter';

interface OptimizationProgress {
  progress_percent: number;
  current_step: string;
  products_processed: number;
  total_products: number;
}

export default function OptimizationPage() {
  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, OptimizationProgress>>({});

  useEffect(() => {
    fetchRuns();
  }, []);

  // Poll for progress on running optimizations
  useEffect(() => {
    const runningRuns = runs.filter(
      r => r.status === OptimizationStatus.RUNNING || r.status === OptimizationStatus.PENDING
    );

    if (runningRuns.length === 0) return;

    const pollProgress = async () => {
      for (const run of runningRuns) {
        try {
          const response = await fetch(`/api/v1/pricing/optimization/${run.run_id}/progress`);
          const data = await response.json();
          if (data.success) {
            setProgress(prev => ({ ...prev, [run.run_id]: data.data }));
          }
        } catch (error) {
          console.error(`Failed to fetch progress for ${run.run_id}:`, error);
        }
      }
    };

    // Poll immediately
    pollProgress();

    // Poll every 2 seconds
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [runs]);

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/v1/pricing/optimization');
      const data = await response.json();
      if (data.success) {
        setRuns(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOptimization = async (strategy: PricingStrategy) => {
    try {
      const response = await fetch('/api/v1/pricing/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_name: `Optimization - ${new Date().toLocaleDateString()}`,
          strategy,
          config: {
            algorithms: ['cost_plus', 'market_based'],
            target_margin_percent: 30,
            constraints: {
              min_margin_percent: 15,
              max_price_change_percent: 15,
              preserve_price_endings: true,
            },
          },
          scope: {},
        }),
      });

      if (response.ok) {
        fetchRuns();
      }
    } catch (error) {
      console.error('Failed to start optimization:', error);
    }
  };

  const getStatusIcon = (status: OptimizationStatus) => {
    switch (status) {
      case OptimizationStatus.COMPLETED:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case OptimizationStatus.RUNNING:
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />;
      case OptimizationStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <AppLayout
      title="Pricing Optimization"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        { label: 'Optimization' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Run AI-powered pricing analysis and implement recommendations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => startOptimization(PricingStrategy.MAXIMIZE_PROFIT)}
            >
              <Play className="mr-2 h-4 w-4" />
              Maximize Profit
            </Button>
            <Button onClick={() => startOptimization(PricingStrategy.MAXIMIZE_REVENUE)}>
              <Play className="mr-2 h-4 w-4" />
              Maximize Revenue
            </Button>
          </div>
        </div>

        {/* Optimization Runs */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Optimization Runs</h2>

          {loading ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center">
                Loading optimization runs...
              </CardContent>
            </Card>
          ) : runs.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center">
                No optimization runs yet. Start your first optimization to get AI-powered pricing
                recommendations.
              </CardContent>
            </Card>
          ) : (
            runs.map(run => (
              <Card key={run.run_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        <CardTitle>{run.run_name}</CardTitle>
                        <Badge variant="outline">{run.strategy}</Badge>
                        <Badge
                          variant={
                            run.status === OptimizationStatus.COMPLETED ? 'default' : 'secondary'
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        Started {new Date(run.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    {run.status === OptimizationStatus.COMPLETED && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/pricing-optimization/optimization/${run.run_id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Recommendations
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {(run.status === OptimizationStatus.RUNNING ||
                  run.status === OptimizationStatus.PENDING) &&
                  progress[run.run_id] && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {progress[run.run_id].current_step}
                          </span>
                          <span className="font-medium">
                            {progress[run.run_id].progress_percent}%
                          </span>
                        </div>
                        <Progress value={progress[run.run_id].progress_percent} />
                        <div className="text-muted-foreground text-xs">
                          {progress[run.run_id].products_processed} of{' '}
                          {progress[run.run_id].total_products} products processed
                        </div>
                      </div>
                    </CardContent>
                  )}
                {run.status === OptimizationStatus.COMPLETED && (
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Products Analyzed</p>
                        <p className="text-2xl font-bold">{run.total_products_analyzed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recommendations</p>
                        <p className="text-2xl font-bold">{run.recommendations_generated}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Revenue Impact</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(run.estimated_revenue_impact || 0, run.currency || 'ZAR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profit Impact</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(run.estimated_profit_impact || 0, run.currency || 'ZAR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
