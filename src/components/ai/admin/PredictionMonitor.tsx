'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Target, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Prediction {
  id: string;
  org_id: string;
  service_type: string;
  entity_type: string;
  entity_id: string;
  prediction_data: unknown;
  confidence_score: number;
  accuracy_score?: number;
  status: 'pending' | 'validated' | 'expired' | 'rejected';
  created_at: string;
  expires_at: string;
  feedback_received: boolean;
  actual_outcome?: unknown;
  metadata?: unknown;
}

interface AccuracyStats {
  overall: {
    totalPredictions: number;
    pendingPredictions: number;
    validatedPredictions: number;
    expiredPredictions: number;
    averageConfidence: number;
    averageAccuracy: number;
  };
}

interface GeneratePredictionInput {
  entityType: 'product' | 'supplier' | 'category' | 'customer';
  entityId: string;
  predictionType: 'inventory_demand' | 'supplier_performance' | 'price_trends' | 'stock_levels' | 'custom';
  forecastDays?: number;
}

export default function PredictionMonitor() {
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch predictions with filters
  const { data: predictionsData, isLoading, refetch: refetchPredictions } = useQuery({
    queryKey: [
      'ai-predictions',
      serviceFilter,
      confidenceRange,
      entityTypeFilter,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (serviceFilter !== 'all') params.append('serviceType', serviceFilter);
      if (entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      params.append('minConfidence', (confidenceRange[0] / 100).toString());

      const response = await fetch(`/api/v1/ai/predictions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      const result = await response.json();
      return {
        predictions: result.data || [],
        total: result.pagination?.total || 0,
      };
    },
  });

  const predictions = predictionsData?.predictions || [];

  // Fetch accuracy statistics
  const { data: accuracyStats } = useQuery<AccuracyStats>({
    queryKey: ['ai-predictions-accuracy'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/predictions/accuracy');
      if (!response.ok) throw new Error('Failed to fetch accuracy stats');
      const result = await response.json();
      return result.data || {
        overall: {
          totalPredictions: 0,
          pendingPredictions: 0,
          validatedPredictions: 0,
          expiredPredictions: 0,
          averageConfidence: 0,
          averageAccuracy: 0,
        },
      };
    },
  });

  // Filter predictions by confidence range
  const filteredPredictions = predictions.filter(
    (p) =>
      p.confidence_score * 100 >= confidenceRange[0] &&
      p.confidence_score * 100 <= confidenceRange[1]
  );

  // Calculate confidence distribution
  const confidenceDistribution = [
    {
      range: '0-20%',
      count: filteredPredictions.filter((p) => p.confidence_score < 0.2).length,
    },
    {
      range: '20-40%',
      count: filteredPredictions.filter(
        (p) => p.confidence_score >= 0.2 && p.confidence_score < 0.4
      ).length,
    },
    {
      range: '40-60%',
      count: filteredPredictions.filter(
        (p) => p.confidence_score >= 0.4 && p.confidence_score < 0.6
      ).length,
    },
    {
      range: '60-80%',
      count: filteredPredictions.filter(
        (p) => p.confidence_score >= 0.6 && p.confidence_score < 0.8
      ).length,
    },
    {
      range: '80-100%',
      count: filteredPredictions.filter((p) => p.confidence_score >= 0.8).length,
    },
  ];

  // Get confidence badge color
  const getConfidenceBadge = (confidence: number) => {
    const percent = confidence * 100;
    if (percent >= 80)
      return <Badge className="bg-green-600">{percent.toFixed(1)}%</Badge>;
    if (percent >= 60)
      return <Badge className="bg-blue-600">{percent.toFixed(1)}%</Badge>;
    if (percent >= 40)
      return <Badge className="bg-yellow-600">{percent.toFixed(1)}%</Badge>;
    return <Badge variant="destructive">{percent.toFixed(1)}%</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prediction Monitor</h2>
          <p className="text-muted-foreground">
            Track and analyze AI predictions across all services
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyStats?.overall.totalPredictions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {accuracyStats?.overall.pendingPredictions || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyStats?.overall.averageConfidence
                ? (accuracyStats.overall.averageConfidence * 100).toFixed(1)
                : predictions.length > 0
                  ? (
                      (predictions.reduce((sum, p) => sum + p.confidence_score, 0) /
                        predictions.length) *
                      100
                    ).toFixed(1)
                  : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Prediction confidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyStats?.overall.averageAccuracy
                ? (accuracyStats.overall.averageAccuracy * 100).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {accuracyStats?.overall.validatedPredictions || 0} validated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="demand_forecasting">Demand Forecasting</SelectItem>
                  <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                  <SelectItem value="supplier_scoring">Supplier Scoring</SelectItem>
                  <SelectItem value="assistant">AI Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Confidence Range: {confidenceRange[0]}% - {confidenceRange[1]}%
            </Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={confidenceRange}
              onValueChange={(value) => setConfidenceRange(value as [number, number])}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Confidence Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence Distribution</CardTitle>
          <CardDescription>Breakdown of predictions by confidence level</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={confidenceDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Predictions ({filteredPredictions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPredictions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No predictions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPredictions.map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell className="font-medium">
                      {prediction.service_type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      {prediction.entity_type}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {prediction.entity_id.slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell>
                      {prediction.metadata?.prediction_type ||
                        prediction.prediction_data?.type ||
                        '-'}
                    </TableCell>
                    <TableCell>{getConfidenceBadge(prediction.confidence_score)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{prediction.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {prediction.accuracy_score ? (
                        <Badge className="bg-green-600">
                          {(prediction.accuracy_score * 100).toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(prediction.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPrediction(prediction)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedPrediction} onOpenChange={() => setSelectedPrediction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prediction Details</DialogTitle>
            <DialogDescription>
              {selectedPrediction?.service_type.replace(/_/g, ' ')} -{' '}
              {selectedPrediction?.metadata?.prediction_type ||
                selectedPrediction?.prediction_data?.type ||
                'N/A'}
            </DialogDescription>
          </DialogHeader>
          {selectedPrediction && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Confidence</Label>
                  <div className="mt-1">
                    {getConfidenceBadge(selectedPrediction.confidence_score)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{selectedPrediction.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Accuracy</Label>
                  <div className="mt-1">
                    {selectedPrediction.accuracy_score ? (
                      <Badge className="bg-green-600">
                        {(selectedPrediction.accuracy_score * 100).toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not validated</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Feedback Received</Label>
                  <div className="mt-1 text-sm">
                    {selectedPrediction.feedback_received ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Created</Label>
                  <div className="mt-1 text-sm">
                    {format(new Date(selectedPrediction.created_at), 'PPpp')}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Expires</Label>
                  <div className="mt-1 text-sm">
                    {format(new Date(selectedPrediction.expires_at), 'PPpp')}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Prediction Data</Label>
                <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-64">
                  {JSON.stringify(selectedPrediction.prediction_data, null, 2)}
                </pre>
              </div>
              {selectedPrediction.actual_outcome && (
                <div>
                  <Label className="text-sm text-muted-foreground">Actual Outcome</Label>
                  <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-64">
                    {JSON.stringify(selectedPrediction.actual_outcome, null, 2)}
                  </pre>
                </div>
              )}
              {selectedPrediction.metadata && (
                <div>
                  <Label className="text-sm text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-64">
                    {JSON.stringify(selectedPrediction.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
