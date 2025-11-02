"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, RefreshCw, Settings, AlertCircle, CheckCircle2, Package, ShoppingCart, Users, Save, TestTube2, Clock, XCircle, Loader2, Play, Square } from "lucide-react";
import SelfContainedLayout from '@/components/layout/SelfContainedLayout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WooCommerceConfig {
  id?: string;
  name: string;
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  status: 'active' | 'inactive' | 'error';
  auto_sync_products: boolean;
  auto_import_orders: boolean;
  sync_customers: boolean;
  sync_frequency: number;
}

interface SyncProgress {
  entityType: 'products' | 'orders' | 'customers';
  status: 'idle' | 'syncing' | 'completed' | 'error';
  processed: number;
  total: number;
  created: number;
  updated: number;
  failed: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

interface SyncHistoryEntry {
  id: string;
  entityType: 'products' | 'orders' | 'customers';
  status: 'success' | 'partial' | 'failed';
  timestamp: string;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  duration: number;
  error?: string;
}

const ENTITY_ICONS = {
  products: Package,
  orders: ShoppingCart,
  customers: Users,
};

const ENTITY_LABELS = {
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
};

export default function WooCommercePage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WooCommerceConfig>({
    name: 'WooCommerce Store',
    store_url: '',
    consumer_key: '',
    consumer_secret: '',
    status: 'inactive',
    auto_sync_products: true,
    auto_import_orders: true,
    sync_customers: false,
    sync_frequency: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Real-time sync state
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgress>>({
    products: { entityType: 'products', status: 'idle', processed: 0, total: 0, created: 0, updated: 0, failed: 0 },
    orders: { entityType: 'orders', status: 'idle', processed: 0, total: 0, created: 0, updated: 0, failed: 0 },
    customers: { entityType: 'customers', status: 'idle', processed: 0, total: 0, created: 0, updated: 0, failed: 0 },
  });

  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [syncAllInProgress, setSyncAllInProgress] = useState(false);

  useEffect(() => {
    fetchConfiguration();
    loadSyncHistory();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/integrations/woocommerce');
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncHistory = () => {
    // Load from localStorage for now (can be replaced with API call)
    try {
      const stored = localStorage.getItem('woo_sync_history');
      if (stored) {
        setSyncHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading sync history:', error);
    }
  };

  const saveSyncHistory = (entry: SyncHistoryEntry) => {
    const updated = [entry, ...syncHistory].slice(0, 50); // Keep last 50 entries
    setSyncHistory(updated);
    localStorage.setItem('woo_sync_history', JSON.stringify(updated));
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/integrations/woocommerce', {
        method: config.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        toast({
          title: "Configuration Saved",
          description: "WooCommerce integration settings have been updated successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/v1/integrations/woocommerce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_url: config.store_url,
          consumer_key: config.consumer_key,
          consumer_secret: config.consumer_secret,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to WooCommerce store.",
        });
        setConfig(prev => ({ ...prev, status: 'active' }));
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
      setConfig(prev => ({ ...prev, status: 'error' }));
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (entityType: 'products' | 'orders' | 'customers') => {
    try {
      // Validate configuration exists
      if (!config.id || !config.store_url || !config.consumer_key || !config.consumer_secret) {
        toast({
          title: "Configuration Missing",
          description: "Please save your WooCommerce configuration before syncing.",
          variant: "destructive",
        });
        return;
      }

      // Get organization ID
      let orgId: string;
      try {
        const orgResponse = await fetch('/api/v1/organizations/current');
        const orgData = await orgResponse.json();

        if (!orgData.success || !orgData.data?.id) {
          throw new Error('Failed to get organization ID');
        }

        orgId = orgData.data.id;
      } catch (error) {
        toast({
          title: "Organization Error",
          description: "Could not determine your organization. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Initialize sync progress
      const startTime = Date.now();
      setSyncProgress(prev => ({
        ...prev,
        [entityType]: {
          entityType,
          status: 'syncing',
          processed: 0,
          total: 0,
          created: 0,
          updated: 0,
          failed: 0,
          startTime,
        }
      }));

      // Prepare the request payload
      const payload = {
        config: {
          url: config.store_url,
          consumerKey: config.consumer_key,
          consumerSecret: config.consumer_secret,
        },
        org_id: orgId,
        options: {
          limit: 100,
        },
      };

      const response = await fetch(`/api/v1/integrations/woocommerce/sync/${entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (data.success) {
        // Update sync progress
        setSyncProgress(prev => ({
          ...prev,
          [entityType]: {
            entityType,
            status: 'completed',
            processed: data.data.customersProcessed || data.data.productsProcessed || data.data.ordersProcessed || 0,
            total: data.data.customersProcessed || data.data.productsProcessed || data.data.ordersProcessed || 0,
            created: data.data.customersCreated || data.data.productsCreated || data.data.ordersCreated || 0,
            updated: data.data.customersUpdated || data.data.productsUpdated || data.data.ordersUpdated || 0,
            failed: data.data.errors?.length || 0,
            startTime,
            endTime,
          }
        }));

        // Save to history
        const historyEntry: SyncHistoryEntry = {
          id: `${entityType}-${Date.now()}`,
          entityType,
          status: data.data.errors?.length > 0 ? 'partial' : 'success',
          timestamp: new Date().toISOString(),
          processed: data.data.customersProcessed || data.data.productsProcessed || data.data.ordersProcessed || 0,
          created: data.data.customersCreated || data.data.productsCreated || data.data.ordersCreated || 0,
          updated: data.data.customersUpdated || data.data.productsUpdated || data.data.ordersUpdated || 0,
          failed: data.data.errors?.length || 0,
          duration,
          error: data.data.errors?.length > 0 ? `${data.data.errors.length} errors occurred` : undefined,
        };
        saveSyncHistory(historyEntry);

        toast({
          title: "Sync Completed",
          description: data.message || `${entityType} sync has been completed successfully.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      const endTime = Date.now();
      const startTime = syncProgress[entityType].startTime || endTime;

      setSyncProgress(prev => ({
        ...prev,
        [entityType]: {
          ...prev[entityType],
          status: 'error',
          error: error.message,
          endTime,
        }
      }));

      // Save error to history
      const historyEntry: SyncHistoryEntry = {
        id: `${entityType}-${Date.now()}`,
        entityType,
        status: 'failed',
        timestamp: new Date().toISOString(),
        processed: 0,
        created: 0,
        updated: 0,
        failed: 0,
        duration: endTime - startTime,
        error: error.message,
      };
      saveSyncHistory(historyEntry);

      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSyncAll = async () => {
    setSyncAllInProgress(true);
    try {
      await handleSync('products');
      await handleSync('orders');
      await handleSync('customers');

      toast({
        title: "All Syncs Completed",
        description: "All entities have been synced successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: "Some syncs may have failed. Check sync history for details.",
        variant: "destructive",
      });
    } finally {
      setSyncAllInProgress(false);
    }
  };

  const calculateProgress = (progress: SyncProgress): number => {
    if (progress.total === 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  };

  const calculateEstimatedTime = (progress: SyncProgress): string => {
    if (!progress.startTime || progress.processed === 0) return 'Calculating...';

    const elapsed = Date.now() - progress.startTime;
    const avgTimePerItem = elapsed / progress.processed;
    const remaining = (progress.total - progress.processed) * avgTimePerItem;

    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <SelfContainedLayout
        title="WooCommerce Integration"
        breadcrumbs={[
          { label: "Integrations", href: "/integrations" },
          { label: "WooCommerce" },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </SelfContainedLayout>
    );
  }

  return (
    <SelfContainedLayout
      title="WooCommerce Integration"
      breadcrumbs={[
        { label: "Integrations", href: "/integrations" },
        { label: "WooCommerce" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground">
                {config.store_url || 'Not configured'}
              </p>
            </div>
          </div>

          <Badge variant={config.status === 'active' ? 'default' : config.status === 'error' ? 'destructive' : 'secondary'}>
            {config.status === 'active' ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </>
            ) : config.status === 'error' ? (
              <>
                <AlertCircle className="mr-1 h-3 w-3" />
                Error
              </>
            ) : (
              <>
                <AlertCircle className="mr-1 h-3 w-3" />
                Not Connected
              </>
            )}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sync" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sync">Sync & Operations</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">Sync History</TabsTrigger>
          </TabsList>

          {/* Sync Tab - ENHANCED */}
          <TabsContent value="sync" className="space-y-6">
            {/* Sync All Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Data Synchronization</h3>
                <p className="text-sm text-muted-foreground">Sync data between WooCommerce and MantisNXT</p>
              </div>
              <Button
                onClick={handleSyncAll}
                disabled={config.status !== 'active' || syncAllInProgress}
                size="lg"
              >
                {syncAllInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing All...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Sync All
                  </>
                )}
              </Button>
            </div>

            {/* Enhanced Sync Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {(['products', 'orders', 'customers'] as const).map((entityType) => {
                const progress = syncProgress[entityType];
                const Icon = ENTITY_ICONS[entityType];
                const label = ENTITY_LABELS[entityType];
                const percentage = calculateProgress(progress);

                return (
                  <Card key={entityType}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {progress.status === 'syncing' ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{percentage}%</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {progress.processed} / {progress.total || '...'}
                              </span>
                              <span className="text-muted-foreground">
                                ETA: {calculateEstimatedTime(progress)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">Created</div>
                              <div className="font-semibold text-green-600">{progress.created}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Updated</div>
                              <div className="font-semibold text-blue-600">{progress.updated}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Failed</div>
                              <div className="font-semibold text-red-600">{progress.failed}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Syncing...
                          </div>
                        </>
                      ) : progress.status === 'completed' ? (
                        <>
                          <div className="text-center py-2">
                            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-medium">Sync Completed</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration((progress.endTime || 0) - (progress.startTime || 0))}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs border-t pt-3">
                            <div>
                              <div className="text-muted-foreground">Created</div>
                              <div className="font-semibold text-green-600">{progress.created}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Updated</div>
                              <div className="font-semibold text-blue-600">{progress.updated}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Failed</div>
                              <div className="font-semibold text-red-600">{progress.failed}</div>
                            </div>
                          </div>
                        </>
                      ) : progress.status === 'error' ? (
                        <>
                          <div className="text-center py-2">
                            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-red-600">Sync Failed</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {progress.error}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center py-4">
                            <div className="text-2xl font-bold text-muted-foreground">-</div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Ready to sync
                            </p>
                          </div>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSync(entityType)}
                        disabled={config.status !== 'active' || progress.status === 'syncing'}
                      >
                        {progress.status === 'syncing' ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {config.status !== 'active' && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Please configure and test your connection before syncing data.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>
                  Configure your WooCommerce store connection settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My WooCommerce Store"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_url">Store URL</Label>
                  <Input
                    id="store_url"
                    value={config.store_url}
                    onChange={(e) => setConfig(prev => ({ ...prev, store_url: e.target.value }))}
                    placeholder="https://your-store.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your WooCommerce store URL (e.g., https://example.com)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumer_key">Consumer Key</Label>
                  <Input
                    id="consumer_key"
                    type="password"
                    value={config.consumer_key}
                    onChange={(e) => setConfig(prev => ({ ...prev, consumer_key: e.target.value }))}
                    placeholder="ck_********************************"
                  />
                  <p className="text-xs text-muted-foreground">
                    Generated from WooCommerce → Settings → Advanced → REST API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumer_secret">Consumer Secret</Label>
                  <Input
                    id="consumer_secret"
                    type="password"
                    value={config.consumer_secret}
                    onChange={(e) => setConfig(prev => ({ ...prev, consumer_secret: e.target.value }))}
                    placeholder="cs_********************************"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleTestConnection}
                    disabled={!config.store_url || !config.consumer_key || !config.consumer_secret || testing}
                    variant="outline"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube2 className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveConfiguration}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Configuration</CardTitle>
                <CardDescription>Configure how data syncs between MantisNXT and WooCommerce</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Sync Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync products when they are updated
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_sync_products}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_sync_products: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Import Orders</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically import new orders from WooCommerce
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_import_orders}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_import_orders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Customers</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep customer data synchronized bi-directionally
                      </p>
                    </div>
                    <Switch
                      checked={config.sync_customers}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sync_customers: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sync Frequency</Label>
                  <Select
                    value={config.sync_frequency.toString()}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, sync_frequency: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                      <SelectItem value="120">Every 2 hours</SelectItem>
                      <SelectItem value="1440">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleSaveConfiguration} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync History Tab - NEW */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>View past synchronization operations and their results</CardDescription>
              </CardHeader>
              <CardContent>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sync history available yet</p>
                    <p className="text-sm mt-2">Start a sync to see history here</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead className="text-right">Processed</TableHead>
                          <TableHead className="text-right">Created</TableHead>
                          <TableHead className="text-right">Updated</TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncHistory.map((entry) => {
                          const Icon = ENTITY_ICONS[entry.entityType];
                          return (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{ENTITY_LABELS[entry.entityType]}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(entry.status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatTimestamp(entry.timestamp)}
                              </TableCell>
                              <TableCell className="text-right font-mono">{entry.processed}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">{entry.created}</TableCell>
                              <TableCell className="text-right font-mono text-blue-600">{entry.updated}</TableCell>
                              <TableCell className="text-right font-mono text-red-600">{entry.failed}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {formatDuration(entry.duration)}
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
          </TabsContent>
        </Tabs>
      </div>
    </SelfContainedLayout>
  );
}
