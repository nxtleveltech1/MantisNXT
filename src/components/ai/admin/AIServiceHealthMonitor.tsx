'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  XCircle,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: string;
  metrics: {
    responseTime: number;
    requestCount: number;
    errorRate: number;
    successRate: number;
  };
  errors?: Array<{
    timestamp: string;
    message: string;
    count: number;
  }>;
}

interface HealthOverview {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  lastUpdated: string;
}

interface ActivityLog {
  timestamp: string;
  service: string;
  event: string;
  details: string;
}

const SERVICE_INFO = {
  demand_forecasting: { name: 'Demand Forecasting', icon: '📊' },
  anomaly_detection: { name: 'Anomaly Detection', icon: '🔍' },
  supplier_scoring: { name: 'Supplier Scoring', icon: '⭐' },
  assistant: { name: 'AI Assistant', icon: '💬' },
};

export default function AIServiceHealthMonitor() {
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch overall health
  const {
    data: health,
    isLoading,
    refetch,
  } = useQuery<HealthOverview>({
    queryKey: ['ai-health'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/health');
      if (!response.ok) throw new Error('Failed to fetch health status');
      const data = await response.json();
      return (
        data.data || {
          overall: 'healthy',
          services: [],
          lastUpdated: new Date().toISOString(),
        }
      );
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
  });

  // Fetch individual service health on selection
  const { data: serviceDetails } = useQuery<ServiceHealth>({
    queryKey: ['ai-health-service', selectedService?.service],
    queryFn: async () => {
      if (!selectedService) throw new Error('No service selected');
      const response = await fetch(`/api/v1/ai/health/${selectedService.service}`);
      if (!response.ok) throw new Error('Failed to fetch service health');
      const data = await response.json();
      return data.data;
    },
    enabled: !!selectedService,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          badge: 'bg-green-600',
          text: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: CheckCircle2,
        };
      case 'degraded':
        return {
          badge: 'bg-yellow-600',
          text: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: AlertTriangle,
        };
      case 'unhealthy':
        return {
          badge: 'bg-red-600',
          text: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: XCircle,
        };
      default:
        return {
          badge: 'bg-gray-600',
          text: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: Activity,
        };
    }
  };

  const overallStatus = health?.overall || 'healthy';
  const overallConfig = getStatusColor(overallStatus);
  const OverallIcon = overallConfig.icon;

  // Mock performance data for chart
  const performanceData = serviceDetails
    ? [
        { time: '5m ago', responseTime: 120 },
        { time: '4m ago', responseTime: 135 },
        { time: '3m ago', responseTime: 110 },
        { time: '2m ago', responseTime: 145 },
        { time: '1m ago', responseTime: 125 },
        { time: 'now', responseTime: serviceDetails.metrics.responseTime },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Service Health Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of AI service health and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="mr-2 h-4 w-4" />
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* Overall Health Alert */}
      {overallStatus !== 'healthy' && (
        <Alert className={`border-l-4 ${overallConfig.border} ${overallConfig.bg}`}>
          <OverallIcon className={`h-4 w-4 ${overallConfig.text}`} />
          <AlertDescription className={overallConfig.text}>
            {overallStatus === 'degraded'
              ? 'Some AI services are experiencing degraded performance'
              : 'Critical: One or more AI services are unhealthy'}
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Health Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OverallIcon className={`h-5 w-5 ${overallConfig.text}`} />
            Overall System Health
          </CardTitle>
          <CardDescription>
            Aggregated health status across all AI services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={overallConfig.badge}>{overallStatus.toUpperCase()}</Badge>
              <span className="text-sm text-muted-foreground">
                {Array.isArray(health?.services)
                  ? health.services.filter((s) => s.status === 'healthy').length
                  : health?.services
                  ? Object.values(health.services).filter((s: any) => s.status === 'healthy').length
                  : 0}{' '}
                /{' '}
                {Array.isArray(health?.services)
                  ? health.services.length
                  : health?.services
                  ? Object.keys(health.services).length
                  : 0}{' '}
                services healthy
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Last check: {health?.lastUpdated ? format(new Date(health.lastUpdated), 'PPp') : '-'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {(Array.isArray(health?.services)
          ? health.services
          : health?.services
          ? Object.entries(health.services).map(([serviceName, serviceData]: [string, any]) => ({
              service: serviceName,
              status: serviceData.status,
              uptime: 0,
              lastCheck: serviceData.lastUsed || new Date().toISOString(),
              metrics: {
                responseTime: parseInt(serviceData.avgLatency) || 0,
                requestCount: serviceData.requests24h || 0,
                errorRate: serviceData.errorRate || 0,
                successRate: 1 - (serviceData.errorRate || 0),
              },
            }))
          : []
        ).map((service) => {
          const config = getStatusColor(service.status);
          const Icon = config.icon;
          const info = SERVICE_INFO[service.service as keyof typeof SERVICE_INFO];

          return (
            <Card
              key={service.service}
              className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${config.border} ${config.bg}`}
              onClick={() => setSelectedService(service)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info?.icon}</span>
                    <div>
                      <CardTitle className="text-base">{info?.name || service.service}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Icon className={`h-3 w-3 ${config.text}`} />
                        <Badge className={`${config.badge} text-xs`}>
                          {service.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Response Time</div>
                    <div className="font-semibold">
                      {service.metrics.responseTime}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Success Rate</div>
                    <div className="font-semibold">
                      {(service.metrics.successRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Requests</div>
                    <div className="font-semibold">{service.metrics.requestCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Error Rate</div>
                    <div className="font-semibold">
                      {(service.metrics.errorRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uptime: {service.uptime.toFixed(2)}%</span>
                    <span>Last check: {format(new Date(service.lastCheck), 'HH:mm:ss')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Service Details Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedService && (
                <>
                  <span className="text-2xl">
                    {SERVICE_INFO[selectedService.service as keyof typeof SERVICE_INFO]?.icon}
                  </span>
                  {SERVICE_INFO[selectedService.service as keyof typeof SERVICE_INFO]?.name}
                  {' - Health Details'}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Detailed health metrics and performance data
            </DialogDescription>
          </DialogHeader>

          {selectedService && serviceDetails && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Zap className="h-6 w-6 mx-auto text-primary mb-2" />
                      <div className="text-2xl font-bold">
                        {serviceDetails.metrics.responseTime}ms
                      </div>
                      <div className="text-xs text-muted-foreground">Response Time</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Activity className="h-6 w-6 mx-auto text-green-600 mb-2" />
                      <div className="text-2xl font-bold">
                        {serviceDetails.metrics.requestCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Requests</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-2" />
                      <div className="text-2xl font-bold">
                        {(serviceDetails.metrics.successRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
                      <div className="text-2xl font-bold">
                        {(serviceDetails.metrics.errorRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Error Rate</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trend</CardTitle>
                  <CardDescription>Response time over the last 5 minutes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="responseTime"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Activity Log */}
              {serviceDetails.errors && serviceDetails.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Errors</CardTitle>
                    <CardDescription>Error log for this service</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {serviceDetails.errors.map((error, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg bg-red-50 border border-red-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-red-900">
                                  {error.message}
                                </div>
                                <div className="text-xs text-red-600 mt-1">
                                  {format(new Date(error.timestamp), 'PPpp')}
                                </div>
                              </div>
                              <Badge variant="destructive">{error.count}x</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <div className="text-lg font-semibold">
                    {serviceDetails.uptime.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Health Check</div>
                  <div className="text-lg font-semibold">
                    {format(new Date(serviceDetails.lastCheck), 'PPp')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
