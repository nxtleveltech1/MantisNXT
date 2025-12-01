'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatDate } from '@/lib/utils';
import type { InventoryAlert, InventoryItem } from '@/types/inventory';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Bell,
  Package,
  TrendingDown,
  Calendar,
  Mail,
  Phone,
  Settings,
  Eye,
  RefreshCw,
  Search,
  Download,
  Plus,
  Target,
  Zap,
  ShoppingCart,
  AlertCircle,
  Info,
  Warning,
  X,
} from 'lucide-react';

// Enhanced Alert Types
export interface EnhancedInventoryAlert extends InventoryAlert {
  itemSku: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  supplierName?: string;
  location: string;
  estimatedStockoutDate?: Date;
  suggestedAction: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  autoResolution?: {
    enabled: boolean;
    action: 'create_po' | 'transfer_stock' | 'adjust_reorder_point';
    threshold: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: EnhancedInventoryAlert['type'];
  isActive: boolean;
  conditions: {
    stockThreshold?: number;
    daysBeforeExpiry?: number;
    valueThreshold?: number;
    categories?: string[];
    suppliers?: string[];
    warehouses?: string[];
  };
  actions: {
    notifications: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
      recipients: string[];
    };
    autoActions: {
      createPO: boolean;
      transferStock: boolean;
      adjustReorderPoint: boolean;
    };
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack';
  name: string;
  isActive: boolean;
  configuration: Record<string, unknown>;
  testLastSent?: Date;
  testStatus?: 'success' | 'failed';
}

// Sample data
const sampleAlerts: EnhancedInventoryAlert[] = [
  {
    id: 'alert_001',
    type: 'low_stock',
    severity: 'critical',
    title: 'Critical Low Stock Alert',
    message: 'Dell XPS 13 Laptop is critically low in stock',
    itemSku: 'DELL-XPS13-001',
    itemName: 'Dell XPS 13 Laptop (i7, 16GB)',
    currentStock: 2,
    reorderPoint: 10,
    maxStock: 50,
    supplierName: 'Dell Technologies',
    location: 'Main Warehouse - Zone A',
    estimatedStockoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    suggestedAction: 'Create purchase order for 30 units',
    impactLevel: 'critical',
    isActive: true,
    acknowledgedBy: undefined,
    acknowledgedAt: undefined,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    autoResolution: {
      enabled: true,
      action: 'create_po',
      threshold: 5,
    },
  },
  {
    id: 'alert_002',
    type: 'out_of_stock',
    severity: 'critical',
    title: 'Out of Stock Alert',
    message: 'USB-C Cable 6ft is completely out of stock',
    itemSku: 'USB-C-6FT-001',
    itemName: 'USB-C Cable 6ft Premium',
    currentStock: 0,
    reorderPoint: 25,
    maxStock: 100,
    supplierName: 'Cable Solutions Inc',
    location: 'Main Warehouse - Zone B',
    estimatedStockoutDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    suggestedAction: 'Emergency order required - high demand item',
    impactLevel: 'critical',
    isActive: true,
    acknowledgedBy: undefined,
    acknowledgedAt: undefined,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
    autoResolution: {
      enabled: false,
      action: 'create_po',
      threshold: 1,
    },
  },
  {
    id: 'alert_003',
    type: 'expiry_warning',
    severity: 'warning',
    title: 'Expiry Warning',
    message: 'Toner cartridges expiring in 15 days',
    itemSku: 'TNR-HP-001',
    itemName: 'HP LaserJet Toner Cartridge',
    currentStock: 8,
    reorderPoint: 5,
    maxStock: 20,
    supplierName: 'Office Supplies Co',
    location: 'Distribution Center - Zone C',
    estimatedStockoutDate: undefined,
    suggestedAction: 'Use expiring stock first or offer discounted sale',
    impactLevel: 'medium',
    isActive: true,
    acknowledgedBy: undefined,
    acknowledgedAt: undefined,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'alert_004',
    type: 'overstock',
    severity: 'info',
    title: 'Overstock Alert',
    message: 'Wireless Mouse inventory exceeds maximum threshold',
    itemSku: 'WMS-001',
    itemName: 'Wireless Optical Mouse',
    currentStock: 85,
    reorderPoint: 15,
    maxStock: 50,
    supplierName: 'Tech Peripherals Ltd',
    location: 'Main Warehouse - Zone A',
    estimatedStockoutDate: undefined,
    suggestedAction: 'Consider promotional pricing or return excess stock',
    impactLevel: 'low',
    isActive: true,
    acknowledgedBy: undefined,
    acknowledgedAt: undefined,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
];

const sampleAlertRules: AlertRule[] = [
  {
    id: 'rule_001',
    name: 'Critical Low Stock',
    description: 'Alert when stock falls below reorder point',
    type: 'low_stock',
    isActive: true,
    conditions: {
      stockThreshold: 10,
    },
    actions: {
      notifications: {
        email: true,
        sms: false,
        inApp: true,
        recipients: ['warehouse@company.com', 'purchasing@company.com'],
      },
      autoActions: {
        createPO: true,
        transferStock: false,
        adjustReorderPoint: false,
      },
    },
    priority: 'critical',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
  },
  {
    id: 'rule_002',
    name: 'Expiry Warning',
    description: 'Alert for items expiring within specified days',
    type: 'expiry_warning',
    isActive: true,
    conditions: {
      daysBeforeExpiry: 30,
    },
    actions: {
      notifications: {
        email: true,
        sms: false,
        inApp: true,
        recipients: ['operations@company.com'],
      },
      autoActions: {
        createPO: false,
        transferStock: false,
        adjustReorderPoint: false,
      },
    },
    priority: 'medium',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-15'),
  },
];

interface StockAlertSystemProps {
  items?: InventoryItem[];
  onAlertAction?: (alertId: string, action: string) => void;
}

const StockAlertSystem: React.FC<StockAlertSystemProps> = ({ items = [], onAlertAction }) => {
  const [alerts, setAlerts] = useState<EnhancedInventoryAlert[]>(sampleAlerts);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(sampleAlertRules);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState('alerts');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoActionsEnabled, setAutoActionsEnabled] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<EnhancedInventoryAlert | null>(null);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch =
        searchQuery === '' ||
        alert.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.itemSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity = severityFilter === '' || alert.severity === severityFilter;
      const matchesType = typeFilter === '' || alert.type === typeFilter;

      return matchesSearch && matchesSeverity && matchesType && alert.isActive;
    });
  }, [alerts, searchQuery, severityFilter, typeFilter]);

  // Calculate alert metrics
  const alertMetrics = useMemo(() => {
    const activeAlerts = alerts.filter(a => a.isActive);
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;
    const infoAlerts = activeAlerts.filter(a => a.severity === 'info').length;

    const acknowledgedAlerts = activeAlerts.filter(a => a.acknowledgedBy).length;
    const unacknowledgedAlerts = activeAlerts.length - acknowledgedAlerts;

    const overdueAlerts = activeAlerts.filter(
      a => a.dueDate && new Date(a.dueDate) < new Date()
    ).length;

    return {
      total: activeAlerts.length,
      critical: criticalAlerts,
      warning: warningAlerts,
      info: infoAlerts,
      acknowledged: acknowledgedAlerts,
      unacknowledged: unacknowledgedAlerts,
      overdue: overdueAlerts,
    };
  }, [alerts]);

  // Handle alert acknowledgment
  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? {
              ...alert,
              acknowledgedBy: 'current.user@company.com',
              acknowledgedAt: new Date(),
            }
          : alert
      )
    );
  }, []);

  // Handle alert resolution
  const handleResolveAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(alert => (alert.id === alertId ? { ...alert, isActive: false } : alert))
    );
  }, []);

  // Handle auto-action execution
  const handleExecuteAutoAction = useCallback(
    (alertId: string, action: string) => {
      // Simulate action execution
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                suggestedAction: `${action} executed successfully`,
                acknowledgedBy: 'system.auto@company.com',
                acknowledgedAt: new Date(),
              }
            : alert
        )
      );

      onAlertAction?.(alertId, action);
    },
    [onAlertAction]
  );

  const getSeverityColor = (severity: string): string => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[severity as keyof typeof colors] || colors.info;
  };

  const getSeverityIcon = (severity: string) => {
    const icons = {
      critical: <AlertTriangle className="h-4 w-4" />,
      warning: <Warning className="h-4 w-4" />,
      info: <Info className="h-4 w-4" />,
    };
    return icons[severity as keyof typeof icons] || icons.info;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      low_stock: <TrendingDown className="h-4 w-4" />,
      out_of_stock: <XCircle className="h-4 w-4" />,
      overstock: <Package className="h-4 w-4" />,
      expiry_warning: <Calendar className="h-4 w-4" />,
      quality_issue: <AlertCircle className="h-4 w-4" />,
      location_discrepancy: <Target className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || icons.low_stock;
  };

  const getImpactColor = (impact: string): string => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[impact as keyof typeof colors] || colors.medium;
  };

  // Auto-refresh alerts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real app, this would fetch fresh alerts from the API
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Alert System</h1>
          <p className="text-muted-foreground">
            Real-time inventory alerts and automated stock management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Bell
              className={cn('h-4 w-4', notificationsEnabled ? 'text-green-600' : 'text-gray-400')}
            />
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            <span className="text-sm">Notifications</span>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {/* Alert Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Alerts</p>
                    <p className="text-2xl font-bold">{alertMetrics.total}</p>
                    <p className="text-muted-foreground text-xs">
                      {alertMetrics.unacknowledged} unacknowledged
                    </p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Critical Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{alertMetrics.critical}</p>
                    <p className="text-muted-foreground text-xs">Require immediate action</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Overdue Alerts</p>
                    <p className="text-2xl font-bold text-orange-600">{alertMetrics.overdue}</p>
                    <p className="text-muted-foreground text-xs">Past due date</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Auto-Actions</p>
                    <p className="text-2xl font-bold text-green-600">
                      {alerts.filter(a => a.autoResolution?.enabled).length}
                    </p>
                    <p className="text-muted-foreground text-xs">Automated responses</p>
                  </div>
                  <Zap className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                    <Input
                      placeholder="Search alerts by item, SKU, or message..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="overstock">Overstock</SelectItem>
                      <SelectItem value="expiry_warning">Expiry Warning</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Auto Action</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map(alert => (
                    <TableRow
                      key={alert.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn('rounded-lg p-2', getSeverityColor(alert.severity))}>
                            {getTypeIcon(alert.type)}
                          </div>
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-muted-foreground text-sm">
                              {alert.message.slice(0, 50)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{alert.itemName}</div>
                          <div className="text-muted-foreground text-sm">{alert.itemSku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{alert.currentStock} units</div>
                          <div className="text-muted-foreground text-xs">
                            Reorder: {alert.reorderPoint} | Max: {alert.maxStock}
                          </div>
                          <Progress
                            value={(alert.currentStock / alert.maxStock) * 100}
                            className="h-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {getSeverityIcon(alert.severity)}
                          <span className="ml-1">{alert.severity.toUpperCase()}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-medium', getImpactColor(alert.impactLevel))}>
                          {alert.impactLevel.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {alert.dueDate ? (
                          <div className="text-sm">
                            {formatDate(alert.dueDate)}
                            {new Date(alert.dueDate) < new Date() && (
                              <Badge variant="outline" className="ml-1 border-red-300 text-red-700">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No due date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {alert.autoResolution?.enabled ? (
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">
                              {alert.autoResolution.action.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!alert.acknowledgedBy && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleAcknowledgeAlert(alert.id);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {alert.autoResolution?.enabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleExecuteAutoAction(alert.id, alert.autoResolution!.action);
                              }}
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleResolveAlert(alert.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Alert Rules Configuration</h3>
              <p className="text-muted-foreground">Define when and how alerts are triggered</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {alertRules.map(rule => (
              <Card key={rule.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{rule.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          rule.priority === 'critical'
                            ? 'border-red-300 text-red-700'
                            : rule.priority === 'high'
                              ? 'border-orange-300 text-orange-700'
                              : rule.priority === 'medium'
                                ? 'border-yellow-300 text-yellow-700'
                                : 'border-gray-300 text-gray-700'
                        }
                      >
                        {rule.priority.toUpperCase()}
                      </Badge>
                      <Switch checked={rule.isActive} />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">{rule.description}</p>

                    <Separator />

                    <div>
                      <h5 className="mb-2 font-medium">Conditions</h5>
                      <div className="space-y-1 text-sm">
                        {rule.conditions.stockThreshold && (
                          <div>Stock threshold: {rule.conditions.stockThreshold} units</div>
                        )}
                        {rule.conditions.daysBeforeExpiry && (
                          <div>Days before expiry: {rule.conditions.daysBeforeExpiry} days</div>
                        )}
                        {rule.conditions.categories && (
                          <div>Categories: {rule.conditions.categories.join(', ')}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="mb-2 font-medium">Actions</h5>
                      <div className="flex flex-wrap gap-2">
                        {rule.actions.notifications.email && (
                          <Badge variant="outline">
                            <Mail className="mr-1 h-3 w-3" />
                            Email
                          </Badge>
                        )}
                        {rule.actions.notifications.sms && (
                          <Badge variant="outline">
                            <Phone className="mr-1 h-3 w-3" />
                            SMS
                          </Badge>
                        )}
                        {rule.actions.autoActions.createPO && (
                          <Badge variant="outline">
                            <ShoppingCart className="mr-1 h-3 w-3" />
                            Auto PO
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts
                  .filter(a => !a.isActive || a.acknowledgedBy)
                  .slice(0, 10)
                  .map(alert => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-lg p-2 opacity-60',
                            getSeverityColor(alert.severity)
                          )}
                        >
                          {getTypeIcon(alert.type)}
                        </div>
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-muted-foreground text-sm">
                            {alert.itemName} • {formatDate(alert.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="opacity-60">
                          {alert.acknowledgedBy ? 'Resolved' : 'Expired'}
                        </Badge>
                        {alert.acknowledgedAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {formatDate(alert.acknowledgedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alert Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['low_stock', 'out_of_stock', 'overstock', 'expiry_warning'].map(type => {
                    const count = alerts.filter(a => a.type === type && a.isActive).length;
                    const percentage =
                      alertMetrics.total > 0 ? (count / alertMetrics.total) * 100 : 0;
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                          <span>
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">2.3h</div>
                      <div className="text-muted-foreground text-sm">Avg Response Time</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">94%</div>
                      <div className="text-muted-foreground text-sm">SLA Compliance</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Critical Alerts</span>
                      <span>&lt; 1 hour</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Warning Alerts</span>
                      <span>&lt; 4 hours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Info Alerts</span>
                      <span>&lt; 24 hours</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getSeverityIcon(selectedAlert.severity)}
                {selectedAlert.title}
              </DialogTitle>
              <DialogDescription>
                Detailed information and suggested actions for this alert
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Alert Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="mb-2 font-medium">Item Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>Name: {selectedAlert.itemName}</div>
                    <div>SKU: {selectedAlert.itemSku}</div>
                    <div>Supplier: {selectedAlert.supplierName}</div>
                    <div>Location: {selectedAlert.location}</div>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 font-medium">Stock Levels</h4>
                  <div className="space-y-1 text-sm">
                    <div>Current: {selectedAlert.currentStock} units</div>
                    <div>Reorder Point: {selectedAlert.reorderPoint} units</div>
                    <div>Maximum: {selectedAlert.maxStock} units</div>
                    <div className="mt-2">
                      <Progress
                        value={(selectedAlert.currentStock / selectedAlert.maxStock) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert Details */}
              <div>
                <h4 className="mb-2 font-medium">Alert Details</h4>
                <div className="bg-muted rounded-lg p-3 text-sm">{selectedAlert.message}</div>
              </div>

              {/* Suggested Action */}
              <div>
                <h4 className="mb-2 font-medium">Suggested Action</h4>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                  {selectedAlert.suggestedAction}
                </div>
              </div>

              {/* Auto Resolution */}
              {selectedAlert.autoResolution?.enabled && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Auto-resolution is enabled for this alert. The system will automatically{' '}
                    {selectedAlert.autoResolution.action.replace('_', ' ')} when stock reaches{' '}
                    {selectedAlert.autoResolution.threshold} units.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                {!selectedAlert.acknowledgedBy && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleAcknowledgeAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Acknowledge
                  </Button>
                )}
                {selectedAlert.autoResolution?.enabled && (
                  <Button
                    onClick={() => {
                      handleExecuteAutoAction(
                        selectedAlert.id,
                        selectedAlert.autoResolution!.action
                      );
                      setSelectedAlert(null);
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Execute Auto Action
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleResolveAlert(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Resolve Alert
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StockAlertSystem;
