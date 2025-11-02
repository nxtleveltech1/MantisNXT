'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AIAlert {
  id: string;
  service_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  metadata?: any;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

interface AlertStats {
  totalActive: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  averageResolutionTime: number;
  trends: Array<{
    date: string;
    count: number;
  }>;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-600',
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-600',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-600',
  },
  low: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-600',
  },
};

export default function AIAlertManagement() {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<AIAlert | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notes, setNotes] = useState('');

  // Fetch alerts
  const { data: alerts = [], isLoading } = useQuery<AIAlert[]>({
    queryKey: ['ai-alerts', severityFilter, serviceFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (serviceFilter !== 'all') params.append('serviceType', serviceFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/v1/ai/alerts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      return data.data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch alert statistics
  const { data: stats } = useQuery<AlertStats>({
    queryKey: ['ai-alerts-stats'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/alerts/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return (
        data.data || {
          totalActive: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          averageResolutionTime: 0,
          trends: [],
        }
      );
    },
    refetchInterval: 30000,
  });

  // Acknowledge alert
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const response = await fetch(`/api/v1/ai/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts-stats'] });
      toast.success('Alert acknowledged');
      setSelectedAlert(null);
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge: ${error.message}`);
    },
  });

  // Resolve alert
  const resolveMutation = useMutation({
    mutationFn: async ({
      alertId,
      resolution,
      notes,
    }: {
      alertId: string;
      resolution: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/v1/ai/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes }),
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts-stats'] });
      toast.success('Alert resolved');
      setSelectedAlert(null);
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve: ${error.message}`);
    },
  });

  // Group alerts by severity
  const alertsBySeverity = {
    critical: alerts.filter((a) => a.severity === 'critical'),
    high: alerts.filter((a) => a.severity === 'high'),
    medium: alerts.filter((a) => a.severity === 'medium'),
    low: alerts.filter((a) => a.severity === 'low'),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'acknowledged':
        return <Badge className="bg-yellow-600">Acknowledged</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
          <h2 className="text-2xl font-bold tracking-tight">AI Alert Management</h2>
          <p className="text-muted-foreground">Monitor and manage AI-generated alerts</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActive || 0}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.bySeverity.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageResolutionTime
                ? `${Math.round(stats.averageResolutionTime / 60)}m`
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Time to resolve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter((a) => a.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service</Label>
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
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Trend Chart */}
      {stats?.trends && stats.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Trends</CardTitle>
            <CardDescription>Alert volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts by Severity */}
      <Tabs defaultValue="critical" className="space-y-4">
        <TabsList>
          <TabsTrigger value="critical" className="gap-2">
            Critical
            <Badge className="bg-red-600">{alertsBySeverity.critical.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="high" className="gap-2">
            High
            <Badge className="bg-orange-600">{alertsBySeverity.high.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="medium" className="gap-2">
            Medium
            <Badge className="bg-yellow-600">{alertsBySeverity.medium.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="low" className="gap-2">
            Low
            <Badge className="bg-blue-600">{alertsBySeverity.low.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {Object.entries(alertsBySeverity).map(([severity, severityAlerts]) => {
          const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
          const Icon = config.icon;

          return (
            <TabsContent key={severity} value={severity} className="space-y-4">
              {severityAlerts.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center p-12">
                    <p className="text-muted-foreground">No {severity} alerts</p>
                  </CardContent>
                </Card>
              ) : (
                severityAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`border-l-4 ${config.border} ${config.bg} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                          <div className="flex-1">
                            <CardTitle className="text-base">{alert.title}</CardTitle>
                            <CardDescription className="mt-1">{alert.message}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(alert.status)}
                          <Badge className={config.badge}>{severity.toUpperCase()}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{alert.service_type.replace(/_/g, ' ')}</span>
                          <span>{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</span>
                          {alert.entity_type && (
                            <span>
                              {alert.entity_type} - {alert.entity_id?.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {alert.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acknowledgeMutation.mutate({ alertId: alert.id });
                                }}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAlert(alert);
                                }}
                              >
                                Resolve
                              </Button>
                            </>
                          )}
                          {alert.status === 'acknowledged' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(alert);
                              }}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && (
                <>
                  {(() => {
                    const Icon = SEVERITY_CONFIG[selectedAlert.severity].icon;
                    return <Icon className={`h-5 w-5 ${SEVERITY_CONFIG[selectedAlert.severity].color}`} />;
                  })()}
                  {selectedAlert.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>{selectedAlert?.message}</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Service</Label>
                  <div className="mt-1 text-sm font-medium">
                    {selectedAlert.service_type.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAlert.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Created</Label>
                  <div className="mt-1 text-sm">
                    {format(new Date(selectedAlert.created_at), 'PPpp')}
                  </div>
                </div>
                {selectedAlert.acknowledged_at && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Acknowledged</Label>
                    <div className="mt-1 text-sm">
                      {format(new Date(selectedAlert.acknowledged_at), 'PPpp')}
                    </div>
                  </div>
                )}
              </div>

              {selectedAlert.metadata && (
                <div>
                  <Label className="text-sm text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-32">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAlert.status !== 'resolved' && (
                <div className="space-y-2">
                  <Label htmlFor="resolution-notes">Resolution Notes</Label>
                  <Textarea
                    id="resolution-notes"
                    placeholder="Enter resolution details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Cancel
                </Button>
                {selectedAlert.status === 'pending' && (
                  <Button
                    onClick={() =>
                      acknowledgeMutation.mutate({
                        alertId: selectedAlert.id,
                        notes,
                      })
                    }
                    disabled={acknowledgeMutation.isPending}
                  >
                    {acknowledgeMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Acknowledge
                  </Button>
                )}
                {(selectedAlert.status === 'pending' ||
                  selectedAlert.status === 'acknowledged') && (
                  <Button
                    onClick={() =>
                      resolveMutation.mutate({
                        alertId: selectedAlert.id,
                        resolution: notes || 'Resolved',
                        notes,
                      })
                    }
                    disabled={resolveMutation.isPending}
                  >
                    {resolveMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
