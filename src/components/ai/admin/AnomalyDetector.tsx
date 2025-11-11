'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  Shield,
  Database,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Anomaly {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entity_type: string;
  entity_id: string;
  detected_at: string;
  resolved_at: string | null;
  status: 'active' | 'investigating' | 'resolved' | 'ignored';
  confidence: number;
  impact_score: number;
  affected_metrics: string[];
  suggested_actions: string[];
  investigation_notes?: string;
  assigned_to?: string;
}

interface AnomalyStats {
  total: number;
  active: number;
  investigating: number;
  resolved: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  trend_data: Array<{ date: string; count: number; severity: string }>;
}

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500'
};

const severityIcons = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info
};

const entityTypeIcons: Record<string, React.ElementType> = {
  user: Users,
  product: Package,
  order: ShoppingCart,
  payment: DollarSign,
  inventory: Database,
  analytics: BarChart3,
  system: Settings
};

const chartColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6'
};

export default function AnomalyDetector() {
  const queryClient = useQueryClient();
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch anomalies
  const { data: anomaliesData, isLoading, refetch } = useQuery({
    queryKey: ['anomalies', severityFilter, entityTypeFilter, statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (entityTypeFilter !== 'all') params.append('entity_type', entityTypeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('date_range', dateRange);

      const response = await fetch(`/api/v1/ai/anomalies?${params}`);
      if (!response.ok) throw new Error('Failed to fetch anomalies');
      return response.json();
    }
  });

  // Update anomaly status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/v1/ai/anomalies/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, investigation_notes: notes })
      });
      if (!response.ok) throw new Error('Failed to update anomaly status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      toast({
        title: 'Success',
        description: 'Anomaly status updated successfully'
      });
      setShowDetailModal(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update anomaly status',
        variant: 'destructive'
      });
    }
  });

  // Dismiss anomaly
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/ai/anomalies/${id}/dismiss`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to dismiss anomaly');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      toast({
        title: 'Success',
        description: 'Anomaly dismissed'
      });
    }
  });

  // Filter anomalies based on search
  const filteredAnomalies = useMemo(() => {
    if (!anomaliesData?.anomalies) return [];

    return anomaliesData.anomalies.filter((anomaly: Anomaly) => {
      const matchesSearch = searchTerm === '' ||
        anomaly.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anomaly.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anomaly.entity_id.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [anomaliesData, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!anomaliesData?.anomalies) return null;

    const anomalies = anomaliesData.anomalies;
    const active = anomalies.filter((a: Anomaly) => a.status === 'active').length;
    const investigating = anomalies.filter((a: Anomaly) => a.status === 'investigating').length;
    const resolved = anomalies.filter((a: Anomaly) => a.status === 'resolved').length;

    const bySeverity = anomalies.reduce((acc: Record<string, number>, a: Anomaly) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {});

    const byType = anomalies.reduce((acc: Record<string, number>, a: Anomaly) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    // Generate trend data for last 7 days
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayAnomalies = anomalies.filter((a: Anomaly) => {
        const detectedDate = new Date(a.detected_at);
        return detectedDate >= startOfDay(date) && detectedDate <= endOfDay(date);
      });

      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        trendData.push({
          date: format(date, 'MMM dd'),
          count: dayAnomalies.filter((a: Anomaly) => a.severity === severity).length,
          severity
        });
      });
    }

    return {
      total: anomalies.length,
      active,
      investigating,
      resolved,
      by_severity: bySeverity,
      by_type: byType,
      trend_data: trendData
    };
  }, [anomaliesData]);

  const handleInvestigate = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    setInvestigationNotes(anomaly.investigation_notes || '');
    setShowDetailModal(true);
  };

  const handleStatusUpdate = (status: string) => {
    if (selectedAnomaly) {
      updateStatusMutation.mutate({
        id: selectedAnomaly.id,
        status,
        notes: investigationNotes
      });
    }
  };

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const Icon = severityIcons[severity as keyof typeof severityIcons] || Info;
    return (
      <Badge variant="outline" className={cn('gap-1', severityColors[severity as keyof typeof severityColors])}>
        <Icon className="h-3 w-3" />
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles = {
      active: 'bg-red-500',
      investigating: 'bg-yellow-500',
      resolved: 'bg-green-500',
      ignored: 'bg-gray-500'
    };

    return (
      <Badge variant="outline" className={cn('capitalize', statusStyles[status as keyof typeof statusStyles])}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search anomalies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="order">Order</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.active || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Requires attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Investigating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.investigating || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              In progress
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Timeline</CardTitle>
            <CardDescription>Anomalies detected over time by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.trend_data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {['critical', 'high', 'medium', 'low'].map(severity => (
                  <Area
                    key={severity}
                    type="monotone"
                    dataKey="count"
                    data={stats?.trend_data?.filter(d => d.severity === severity) || []}
                    stackId="1"
                    stroke={chartColors[severity as keyof typeof chartColors]}
                    fill={chartColors[severity as keyof typeof chartColors]}
                    name={severity}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Breakdown by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(stats?.by_severity || {}).map(([severity, count]) => ({
                    name: severity.toUpperCase(),
                    value: count,
                    fill: chartColors[severity as keyof typeof chartColors]
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(stats?.by_severity || {}).map(([severity], index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[severity as keyof typeof chartColors]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Anomalies</CardTitle>
          <CardDescription>
            {filteredAnomalies.length} anomalies found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnomalies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No anomalies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnomalies.map((anomaly: Anomaly) => {
                  const EntityIcon = entityTypeIcons[anomaly.entity_type] || Database;
                  return (
                    <TableRow key={anomaly.id}>
                      <TableCell>
                        <SeverityBadge severity={anomaly.severity} />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="font-medium truncate">{anomaly.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {anomaly.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EntityIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{anomaly.entity_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{anomaly.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(anomaly.detected_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={anomaly.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="text-sm font-medium">
                            {(anomaly.confidence * 100).toFixed(0)}%
                          </div>
                          {anomaly.confidence > 0.8 && (
                            <Shield className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInvestigate(anomaly)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {anomaly.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissMutation.mutate(anomaly.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Anomaly Investigation
              {selectedAnomaly && <SeverityBadge severity={selectedAnomaly.severity} />}
            </DialogTitle>
            <DialogDescription>
              Review anomaly details and update investigation status
            </DialogDescription>
          </DialogHeader>

          {selectedAnomaly && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <div className="font-medium">{selectedAnomaly.title}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <StatusBadge status={selectedAnomaly.status} />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedAnomaly.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const Icon = entityTypeIcons[selectedAnomaly.entity_type] || Database;
                      return <Icon className="h-4 w-4" />;
                    })()}
                    <span>{selectedAnomaly.entity_type}</span>
                  </div>
                </div>
                <div>
                  <Label>Entity ID</Label>
                  <div className="font-mono text-sm">{selectedAnomaly.entity_id}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Confidence</Label>
                  <div className="font-medium">
                    {(selectedAnomaly.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <Label>Impact Score</Label>
                  <div className="font-medium">
                    {selectedAnomaly.impact_score.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>Detected</Label>
                  <div className="text-sm">
                    {format(new Date(selectedAnomaly.detected_at), 'PPpp')}
                  </div>
                </div>
              </div>

              {selectedAnomaly.affected_metrics.length > 0 && (
                <div>
                  <Label>Affected Metrics</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAnomaly.affected_metrics.map((metric, idx) => (
                      <Badge key={idx} variant="secondary">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedAnomaly.suggested_actions.length > 0 && (
                <div>
                  <Label>Suggested Actions</Label>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    {selectedAnomaly.suggested_actions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              <div>
                <Label htmlFor="notes">Investigation Notes</Label>
                <Textarea
                  id="notes"
                  value={investigationNotes}
                  onChange={(e) => setInvestigationNotes(e.target.value)}
                  placeholder="Add investigation notes..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Cancel
            </Button>
            {selectedAnomaly?.status === 'active' && (
              <Button
                variant="default"
                onClick={() => handleStatusUpdate('investigating')}
              >
                Start Investigation
              </Button>
            )}
            {selectedAnomaly?.status === 'investigating' && (
              <Button
                variant="default"
                onClick={() => handleStatusUpdate('resolved')}
              >
                Mark Resolved
              </Button>
            )}
            {selectedAnomaly?.status !== 'ignored' && (
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate('ignored')}
              >
                Ignore
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}