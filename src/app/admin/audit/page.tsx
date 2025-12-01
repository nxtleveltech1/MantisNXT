'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  Search,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Clock,
  User,
  Shield,
  Database,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'warning' | 'error' | 'info';
  organizationId: string;
  organizationName: string;
  metadata?: Record<string, unknown>;
}

export default function AuditPage() {
  const [auditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2023-12-15T14:30:00Z',
      userId: 'user1',
      userName: 'John Smith',
      userEmail: 'john@acme.com',
      action: 'CREATE',
      resource: 'supplier',
      resourceId: 'SUP-001',
      details: 'Created new supplier: TechCorp Solutions',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { supplierName: 'TechCorp Solutions', category: 'Technology' },
    },
    {
      id: '2',
      timestamp: '2023-12-15T14:25:00Z',
      userId: 'user2',
      userName: 'Sarah Davis',
      userEmail: 'sarah@acme.com',
      action: 'UPDATE',
      resource: 'purchase_order',
      resourceId: 'PO-2023-125',
      details: 'Updated purchase order status to approved',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { oldStatus: 'pending', newStatus: 'approved', amount: 15750.0 },
    },
    {
      id: '3',
      timestamp: '2023-12-15T14:20:00Z',
      userId: 'system',
      userName: 'System',
      userEmail: 'system@mantisnxt.com',
      action: 'LOGIN_FAILED',
      resource: 'authentication',
      resourceId: 'auth-attempt-123',
      details: 'Failed login attempt from IP 203.45.67.89',
      ipAddress: '203.45.67.89',
      userAgent: 'curl/7.68.0',
      status: 'warning',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { attempts: 3, locked: false },
    },
    {
      id: '4',
      timestamp: '2023-12-15T14:15:00Z',
      userId: 'user3',
      userName: 'Mike Johnson',
      userEmail: 'mike@acme.com',
      action: 'DELETE',
      resource: 'invoice',
      resourceId: 'INV-2023-089',
      details: 'Deleted draft invoice INV-2023-089',
      ipAddress: '192.168.1.110',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { amount: 2500.0, supplier: 'Global Manufacturing' },
    },
    {
      id: '5',
      timestamp: '2023-12-15T14:10:00Z',
      userId: 'admin1',
      userName: 'System Admin',
      userEmail: 'admin@mantisnxt.com',
      action: 'CONFIG_CHANGE',
      resource: 'system_settings',
      resourceId: 'settings-backup',
      details: 'Modified backup configuration settings',
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Ubuntu; Linux x86_64) AppleWebKit/537.36',
      status: 'info',
      organizationId: 'system',
      organizationName: 'System Administration',
      metadata: { setting: 'backup_frequency', oldValue: 'daily', newValue: 'twice_daily' },
    },
    {
      id: '6',
      timestamp: '2023-12-15T14:05:00Z',
      userId: 'user1',
      userName: 'John Smith',
      userEmail: 'john@acme.com',
      action: 'EXPORT',
      resource: 'report',
      resourceId: 'RPT-SUPPLIERS-2023',
      details: 'Exported supplier report for December 2023',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { format: 'PDF', recordCount: 125 },
    },
    {
      id: '7',
      timestamp: '2023-12-15T14:00:00Z',
      userId: 'user4',
      userName: 'Lisa Brown',
      userEmail: 'lisa@acme.com',
      action: 'ACCESS_DENIED',
      resource: 'financial_reports',
      resourceId: 'finance-dashboard',
      details: 'Attempted to access financial reports without permission',
      ipAddress: '192.168.1.115',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      status: 'error',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { requiredPermission: 'finance.view', userRole: 'supplier_manager' },
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesResource = filterResource === 'all' || log.resource === filterResource;

    // Date filtering would be implemented here
    const matchesDate = true;

    return matchesSearch && matchesAction && matchesStatus && matchesResource && matchesDate;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-success h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="text-warning h-4 w-4" />;
      case 'error':
        return <XCircle className="text-destructive h-4 w-4" />;
      case 'info':
        return <Info className="text-primary h-4 w-4" />;
      default:
        return <Info className="text-muted-foreground h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success/10 text-success';
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'error':
        return 'bg-destructive/10 text-destructive';
      case 'info':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <FileText className="h-4 w-4" />;
      case 'update':
        return <Settings className="h-4 w-4" />;
      case 'delete':
        return <XCircle className="h-4 w-4" />;
      case 'login':
      case 'login_failed':
        return <User className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'access_denied':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const exportLogs = () => {
    // Export audit logs functionality
    console.log('Exporting audit logs...');
  };

  const refreshLogs = () => {
    // Refresh audit logs functionality
    console.log('Refreshing audit logs...');
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
  };

  // Get unique values for filters
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  const uniqueResources = [...new Set(auditLogs.map(log => log.resource))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor system activity and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <a href="/admin/audit/reports">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Actions</p>
                <p className="mt-2 text-3xl font-bold">{auditLogs.length}</p>
              </div>
              <div className="bg-chart-1/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <Activity className="text-chart-1 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Success Rate</p>
                <p className="text-chart-2 mt-2 text-3xl font-bold">
                  {Math.round(
                    (auditLogs.filter(log => log.status === 'success').length / auditLogs.length) *
                      100
                  )}
                  %
                </p>
              </div>
              <div className="bg-chart-2/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <CheckCircle className="text-chart-2 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Failed Actions</p>
                <p className="mt-2 text-3xl font-bold">
                  {auditLogs.filter(log => log.status === 'error').length}
                </p>
              </div>
              <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <XCircle className="text-destructive h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Unique Users</p>
                <p className="mt-2 text-3xl font-bold">
                  {new Set(auditLogs.map(log => log.userId)).size}
                </p>
              </div>
              <div className="bg-chart-3/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <User className="text-chart-3 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border-border bg-background pl-10"
              />
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger>
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map(resource => (
                  <SelectItem key={resource} value={resource}>
                    {resource.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={range =>
                    setDateRange(
                      range
                        ? { from: range.from, to: range.to }
                        : { from: undefined, to: undefined }
                    )
                  }
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Trail</span>
            <Badge variant="outline">{filteredLogs.length} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                className="hover:bg-secondary/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(log.status)}
                  {getActionIcon(log.action)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge className={getStatusColor(log.status)} variant="secondary">
                      {log.action.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {log.resource.replace('_', ' ')}
                    </Badge>
                    <span className="text-muted-foreground text-xs">#{log.resourceId}</span>
                  </div>

                  <p className="text-foreground mb-1 text-sm font-medium">{log.details}</p>

                  <div className="text-muted-foreground flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={log.userAvatar} alt={log.userName} />
                        <AvatarFallback>
                          {log.userName
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      {log.userName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.timestamp), 'PPpp')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {log.organizationName}
                    </div>
                    <div className="text-muted-foreground">{log.ipAddress}</div>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => viewLogDetails(log)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center">
              <Activity className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="text-foreground mb-2 text-lg font-medium">No audit logs found</h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                filterAction !== 'all' ||
                filterStatus !== 'all' ||
                filterResource !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Audit logs will appear here as users interact with the system'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal would go here */}
      {selectedLog && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Selected log: {selectedLog.id} - {selectedLog.details}
            <Button variant="link" className="ml-2 h-auto p-0" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
