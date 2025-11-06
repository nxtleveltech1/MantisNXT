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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  org_id: string;
  service_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
  metadata?: any;
  recommendations?: any[];
}

interface AIAlertWithStatus extends AIAlert {
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
}

interface AlertStats {
  total: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_status: {
    pending: number;
    acknowledged: number;
    resolved: number;
  };
  by_service: Record<string, number>;
  unresolved_count: number;
  acknowledged_count: number;
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
  const [selectedAlert, setSelectedAlert] = useState<AIAlertWithStatus | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper to convert backend alert to component format
  const addStatusToAlert = (alert: AIAlert): AIAlertWithStatus => {
    let status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
    if (alert.is_resolved) {
      status = 'resolved';
    } else if (alert.is_acknowledged) {
      status = 'acknowledged';
    } else if (alert.metadata?.status === 'dismissed') {
      status = 'dismissed';
    } else {
      status = 'pending';
    }
    return { ...alert, status };
  };

  // Fetch alerts
  const { data: alerts = [], isLoading } = useQuery<AIAlertWithStatus[]>({
    queryKey: ['ai-alerts', severityFilter, serviceFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (serviceFilter !== 'all') params.append('serviceType', serviceFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/v1/ai/alerts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      const rawAlerts = data.data || [];
      return rawAlerts.map(addStatusToAlert);
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
          total: 0,
          by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
          by_status: { pending: 0, acknowledged: 0, resolved: 0 },
          by_service: {},
          unresolved_count: 0,
          acknowledged_count: 0,
        }
      );
    },
    refetchInterval: 30000,
  });

  // Acknowledge alert
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ alertId }: { alertId: string }) => {
      const response = await fetch(`/api/v1/ai/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to acknowledge alert');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts-stats'] });
      toast.success('Alert acknowledged');
      setSelectedAlert(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge: ${error.message}`);
    },
  });

  // Resolve alert
  const resolveMutation = useMutation({
    mutationFn: async ({ alertId }: { alertId: string }) => {
      const response = await fetch(`/api/v1/ai/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to resolve alert');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts-stats'] });
      toast.success('Alert resolved');
      setSelectedAlert(null);
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
            <div className="text-2xl font-bold">{stats?.unresolved_count || 0}</div>
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
              {stats?.by_severity.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.acknowledged_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.by_status.resolved || 0}
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

      {/* Service Distribution */}
      {stats?.by_service && Object.keys(stats.by_service).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Service</CardTitle>
            <CardDescription>Distribution across AI services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.by_service).map(([service, count]) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{service.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
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
                                disabled={acknowledgeMutation.isPending}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resolveMutation.mutate({ alertId: alert.id });
                                }}
                                disabled={resolveMutation.isPending}
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
                                resolveMutation.mutate({ alertId: alert.id });
                              }}
                              disabled={resolveMutation.isPending}
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

              {selectedAlert.recommendations && selectedAlert.recommendations.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Recommendations</Label>
                  <ul className="mt-1 space-y-1 text-sm">
                    {selectedAlert.recommendations.map((rec: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-32">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
                {selectedAlert.status === 'pending' && (
                  <Button
                    onClick={() =>
                      acknowledgeMutation.mutate({
                        alertId: selectedAlert.id,
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
