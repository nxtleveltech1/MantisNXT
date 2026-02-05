'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  Activity,
  Gauge,
  BarChart3,
  RefreshCw,
  Download,
  ChevronRight,
  Lightbulb,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

// AI Analytics Types
interface AIPrediction {
  id: string;
  type: 'demand_forecast' | 'cost_prediction' | 'risk_assessment' | 'performance_forecast';
  title: string;
  description: string;
  confidence: number;
  timeHorizon: '1_month' | '3_months' | '6_months' | '1_year';
  predictions: Array<{
    period: string;
    value: number;
    confidence_interval: [number, number];
    factors: string[];
  }>;
  accuracy: number;
  lastUpdated: Date;
  actionable: boolean;
  recommendations: string[];
}

interface AIAnomaly {
  id: string;
  type: 'cost_spike' | 'performance_drop' | 'demand_anomaly' | 'supplier_risk';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  detectedAt: Date;
  affectedEntities: string[];
  rootCause?: string;
  suggestedActions: string[];
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  impactMetrics: {
    cost?: number;
    performance?: number;
    timeline?: string;
  };
}

interface AIInsight {
  id: string;
  category: 'optimization' | 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  evidence: string[];
  recommendations: string[];
  potentialValue?: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  priority: number;
  createdAt: Date;
}

interface AIAnalyticsState {
  predictions: AIPrediction[];
  anomalies: AIAnomaly[];
  insights: AIInsight[];
  isLoading: boolean;
  lastUpdated: Date | null;
  selectedTimeframe: string;
  autoRefresh: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AIPredictiveAnalyticsDashboard() {
  const [state, setState] = useState<AIAnalyticsState>({
    predictions: [],
    anomalies: [],
    insights: [],
    isLoading: true,
    lastUpdated: null,
    selectedTimeframe: '3_months',
    autoRefresh: false,
  });

  const [activeTab, setActiveTab] = useState('predictions');
  const [selectedPrediction, setSelectedPrediction] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load AI analytics data
  const loadAnalyticsData = useCallback(
    async (timeframe?: string) => {
      setIsRefreshing(true);
      try {
        const response = await fetch('/api/ai/analytics/predictive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeframe: timeframe || state.selectedTimeframe,
            includeAnomalyDetection: true,
            includeInsights: true,
            includePredictions: true,
          }),
        });

        if (!response.ok) throw new Error('Failed to load analytics');

        const data = await response.json();

        setState(prev => ({
          ...prev,
          predictions: data.predictions || [],
          anomalies: data.anomalies || [],
          insights: data.insights || [],
          isLoading: false,
          lastUpdated: new Date(),
        }));
      } catch (error) {
        console.error('Error loading AI analytics:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      } finally {
        setIsRefreshing(false);
      }
    },
    [state.selectedTimeframe]
  );

  // Initial load and auto-refresh
  useEffect(() => {
    loadAnalyticsData();

    let intervalId: NodeJS.Timeout;
    if (state.autoRefresh) {
      intervalId = setInterval(() => {
        loadAnalyticsData();
      }, 300000); // 5 minutes
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loadAnalyticsData, state.autoRefresh]);

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-orange-600 bg-orange-50 border-orange-200',
      high: 'text-red-600 bg-red-50 border-red-200',
      critical: 'text-red-800 bg-red-100 border-red-300',
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'text-blue-600',
      medium: 'text-orange-600',
      high: 'text-red-600',
    };
    return colors[impact as keyof typeof colors] || 'text-gray-600';
  };

  const getPredictionTypeIcon = (type: string) => {
    const icons = {
      demand_forecast: Activity,
      cost_prediction: TrendingUp,
      risk_assessment: AlertTriangle,
      performance_forecast: Target,
    };
    return icons[type as keyof typeof icons] || Activity;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (state.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Loading AI analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Predictive Analytics
          </h2>
          <p className="text-muted-foreground">
            Advanced AI-powered insights and predictions for your supply chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={state.selectedTimeframe}
            onValueChange={value => {
              setState(prev => ({ ...prev, selectedTimeframe: value }));
              loadAnalyticsData(value);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_month">1 Month</SelectItem>
              <SelectItem value="3_months">3 Months</SelectItem>
              <SelectItem value="6_months">6 Months</SelectItem>
              <SelectItem value="1_year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalyticsData()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Active Predictions</p>
                <p className="text-2xl font-bold">{state.predictions.length}</p>
                <p className="text-xs text-green-600">
                  {state.predictions.length > 0
                    ? `Avg ${Math.round(state.predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / state.predictions.length)}% accuracy`
                    : 'No data'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Anomalies Detected</p>
                <p className="text-2xl font-bold text-orange-600">
                  {state.anomalies.filter(a => a.status === 'new').length}
                </p>
                <p className="text-muted-foreground text-xs">
                  {state.anomalies.filter(a => a.severity === 'critical').length} critical
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">AI Insights</p>
                <p className="text-2xl font-bold">{state.insights.length}</p>
                <p className="text-xs text-purple-600">
                  {state.insights.filter(i => i.impact === 'high').length} high impact
                </p>
              </div>
              <Lightbulb className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Potential Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    state.insights
                      .filter(i => i.potentialValue)
                      .reduce((sum, i) => sum + (i.potentialValue || 0), 0)
                  )}
                </p>
                <p className="text-muted-foreground text-xs">Identified by AI</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions">
            <BarChart3 className="mr-2 h-4 w-4" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <Gauge className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Prediction List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {state.predictions.map(prediction => {
                      const Icon = getPredictionTypeIcon(prediction.type);
                      return (
                        <div
                          key={prediction.id}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            selectedPrediction === prediction.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedPrediction(prediction.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Icon className="mt-0.5 h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="font-medium">{prediction.title}</h4>
                                <p className="text-muted-foreground text-sm">
                                  {prediction.description}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {prediction.confidence}% confidence
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {prediction.timeHorizon.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="text-muted-foreground h-4 w-4" />
                          </div>
                          <div className="mt-2">
                            <Progress value={prediction.accuracy} className="h-1" />
                            <p className="text-muted-foreground mt-1 text-xs">
                              {prediction.accuracy}% historical accuracy
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Prediction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Prediction Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPrediction ? (
                  (() => {
                    const prediction = state.predictions.find(p => p.id === selectedPrediction);
                    if (!prediction) return <div>Prediction not found</div>;

                    return (
                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2 font-medium">{prediction.title}</h4>
                          <p className="text-muted-foreground mb-4 text-sm">
                            {prediction.description}
                          </p>
                        </div>

                        {/* Prediction Chart */}
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={prediction.predictions}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip
                                formatter={(value, name) => [
                                  typeof value === 'number' ? formatCurrency(value) : value,
                                  name,
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="confidence_interval"
                                fill="#3b82f6"
                                fillOpacity={0.1}
                                stroke="none"
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Recommendations */}
                        {prediction.actionable && prediction.recommendations.length > 0 && (
                          <div>
                            <h5 className="mb-2 font-medium">AI Recommendations</h5>
                            <div className="space-y-2">
                              {prediction.recommendations.map((rec, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                  <Zap className="mt-0.5 h-4 w-4 text-yellow-500" />
                                  <span>{rec}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Select a prediction to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {state.anomalies.map(anomaly => (
              <Card
                key={anomaly.id}
                className={`border-l-4 ${
                  anomaly.severity === 'critical'
                    ? 'border-l-red-500'
                    : anomaly.severity === 'high'
                      ? 'border-l-orange-500'
                      : anomaly.severity === 'medium'
                        ? 'border-l-yellow-500'
                        : 'border-l-green-500'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{anomaly.title}</CardTitle>
                    <Badge className={getSeverityColor(anomaly.severity)}>
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">{anomaly.description}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confidence:</span>
                      <span className="font-medium">{anomaly.confidence}%</span>
                    </div>
                    <Progress value={anomaly.confidence} className="h-2" />
                  </div>

                  {anomaly.impactMetrics.cost && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Cost Impact: </span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(anomaly.impactMetrics.cost)}
                      </span>
                    </div>
                  )}

                  {anomaly.rootCause && (
                    <div>
                      <div className="mb-1 text-sm font-medium">Root Cause Analysis</div>
                      <p className="text-muted-foreground bg-muted/50 rounded p-2 text-xs">
                        {anomaly.rootCause}
                      </p>
                    </div>
                  )}

                  {anomaly.suggestedActions.length > 0 && (
                    <div>
                      <div className="mb-2 text-sm font-medium">Suggested Actions</div>
                      <div className="space-y-1">
                        {anomaly.suggestedActions.slice(0, 2).map((action, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start text-xs"
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-muted-foreground text-xs">
                    Detected: {format(new Date(anomaly.detectedAt), 'MMM dd, HH:mm')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {state.insights
              .sort((a, b) => b.priority - a.priority)
              .map(insight => (
                <Card key={insight.id} className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <div className="text-right">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <div className="text-muted-foreground mt-1 text-sm">
                          {insight.confidence}% confidence
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{insight.description}</p>

                    {insight.potentialValue && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Potential Value: {formatCurrency(insight.potentialValue)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-2 text-sm font-medium">Supporting Evidence</div>
                      <div className="space-y-1">
                        {insight.evidence.map((evidence, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="mt-1 h-3 w-3 text-green-500" />
                            <span className="text-muted-foreground">{evidence}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium">Recommendations</div>
                      <div className="space-y-2">
                        {insight.recommendations.map((rec, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Zap className="mr-2 h-3 w-3 text-yellow-500" />
                            {rec}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span>Complexity: {insight.implementationComplexity}</span>
                      <span>Priority: {insight.priority}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* AI Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>AI Model Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">—</div>
                      <div className="text-muted-foreground text-sm">Prediction Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">—</div>
                      <div className="text-muted-foreground text-sm">Anomaly Detection</div>
                    </div>
                  </div>

                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis domain={[80, 100]} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="accuracy"
                          stackId="1"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="detection"
                          stackId="2"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time AI Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {state.anomalies
                      .filter(a => a.status === 'new')
                      .slice(0, 5)
                      .map(alert => (
                        <Alert
                          key={alert.id}
                          className={
                            alert.severity === 'critical' ? 'border-red-500' : 'border-orange-500'
                          }
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{alert.title}</span>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm">{alert.description}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      {state.lastUpdated && (
        <div className="text-muted-foreground text-center text-sm">
          Last updated: {format(state.lastUpdated, 'MMM dd, yyyy HH:mm:ss')}
        </div>
      )}
    </div>
  );
}
