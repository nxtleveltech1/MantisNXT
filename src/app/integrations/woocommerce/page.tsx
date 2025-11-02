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
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-900 dark:to-blue-900 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <ShoppingBag className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">WooCommerce Store</h2>
                <p className="text-white/90 text-sm mt-1">
                  {config.store_url || 'Not configured'}
                </p>
              </div>
            </div>

            <Badge
              variant={config.status === 'active' ? 'default' : config.status === 'error' ? 'destructive' : 'secondary'}
              className={`text-sm px-4 py-2 ${
                config.status === 'active'
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                  : config.status === 'error'
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md'
              }`}
            >
              {config.status === 'active' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Connected
                </>
              ) : config.status === 'error' ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Connection Error
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Data Synchronization</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sync data between WooCommerce and MantisNXT in real-time</p>
              </div>
              <Button
                onClick={handleSyncAll}
                disabled={config.status !== 'active' || syncAllInProgress}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {syncAllInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing All...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Sync All Entities
                  </>
                )}
              </Button>
            </div>

            {/* Enhanced Sync Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {(['products', 'orders', 'customers'] as const).map((entityType) => {
                const progress = syncProgress[entityType];
                const Icon = ENTITY_ICONS[entityType];
                const label = ENTITY_LABELS[entityType];
                const percentage = calculateProgress(progress);

                return (
                  <Card key={entityType} className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
                      <CardTitle className="text-base font-bold">{label}</CardTitle>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      {progress.status === 'syncing' ? (
                        <>
                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-blue-600 dark:text-blue-400">Syncing...</span>
                              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
                            </div>
                            <Progress value={percentage} className="h-3 bg-blue-100 dark:bg-blue-900" />
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {progress.processed.toLocaleString()} / {progress.total > 0 ? progress.total.toLocaleString() : '...'}
                              </span>
                              <span className="font-medium text-gray-600 dark:text-gray-400">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {calculateEstimatedTime(progress)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 pt-2">
                            <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <div className="text-xs text-green-700 dark:text-green-400 font-medium">Created</div>
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">{progress.created}</div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <div className="text-xs text-blue-700 dark:text-blue-400 font-medium">Updated</div>
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{progress.updated}</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                              <div className="text-xs text-red-700 dark:text-red-400 font-medium">Failed</div>
                              <div className="text-lg font-bold text-red-600 dark:text-red-400">{progress.failed}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 py-2 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing {label.toLowerCase()}...
                          </div>
                        </>
                      ) : progress.status === 'completed' ? (
                        <>
                          <div className="text-center py-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2 animate-pulse" />
                            <p className="text-base font-bold text-green-700 dark:text-green-400">Sync Completed</p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-1 font-medium">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDuration((progress.endTime || 0) - (progress.startTime || 0))}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="text-xs text-green-700 dark:text-green-400 font-medium">Created</div>
                              <div className="text-xl font-bold text-green-600 dark:text-green-400">{progress.created}</div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="text-xs text-blue-700 dark:text-blue-400 font-medium">Updated</div>
                              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{progress.updated}</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                              <div className="text-xs text-red-700 dark:text-red-400 font-medium">Failed</div>
                              <div className="text-xl font-bold text-red-600 dark:text-red-400">{progress.failed}</div>
                            </div>
                          </div>
                        </>
                      ) : progress.status === 'error' ? (
                        <>
                          <div className="text-center py-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                            <p className="text-base font-bold text-red-700 dark:text-red-400">Sync Failed</p>
                            <p className="text-xs text-red-600 dark:text-red-500 mt-2 px-2 leading-relaxed">
                              {progress.error}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center py-6">
                            <div className="relative mx-auto w-20 h-20 mb-3">
                              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                                <Icon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ready to Sync</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Click below to start synchronization
                            </p>
                          </div>
                        </>
                      )}

                      <Button
                        size="sm"
                        className={`w-full font-semibold transition-all duration-200 ${
                          progress.status === 'syncing'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : progress.status === 'completed'
                            ? 'bg-green-600 hover:bg-green-700'
                            : progress.status === 'error'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                        onClick={() => handleSync(entityType)}
                        disabled={config.status !== 'active' || progress.status === 'syncing'}
                      >
                        {progress.status === 'syncing' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : progress.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Sync Again
                          </>
                        ) : progress.status === 'error' ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry Sync
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start Sync
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {config.status !== 'active' && (
              <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Connection Required</p>
                      <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                        Please configure and test your WooCommerce connection in the Configuration tab before syncing data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Connection Details
                </CardTitle>
                <CardDescription className="mt-1">
                  Configure your WooCommerce store connection settings and credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
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

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-2">
                  <Button
                    onClick={handleTestConnection}
                    disabled={!config.store_url || !config.consumer_key || !config.consumer_secret || testing}
                    variant="outline"
                    className="flex-1 h-11 font-semibold border-2"
                    size="lg"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <TestTube2 className="mr-2 h-5 w-5" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveConfiguration}
                    disabled={saving}
                    className="flex-1 h-11 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
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

          {/* Sync History Tab - ENHANCED */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Sync History</CardTitle>
                    <CardDescription className="mt-1">Complete log of all synchronization operations</CardDescription>
                  </div>
                  {syncHistory.length > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      {syncHistory.length} {syncHistory.length === 1 ? 'entry' : 'entries'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {syncHistory.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <div className="relative mx-auto w-24 h-24 mb-4">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <Clock className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No Sync History Yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                      Your synchronization history will appear here once you perform your first sync operation.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                          <TableHead className="font-bold">Entity</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                          <TableHead className="font-bold">Timestamp</TableHead>
                          <TableHead className="text-right font-bold">Processed</TableHead>
                          <TableHead className="text-right font-bold">Created</TableHead>
                          <TableHead className="text-right font-bold">Updated</TableHead>
                          <TableHead className="text-right font-bold">Failed</TableHead>
                          <TableHead className="text-right font-bold">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncHistory.map((entry) => {
                          const Icon = ENTITY_ICONS[entry.entityType];
                          return (
                            <TableRow key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Icon className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-semibold">{ENTITY_LABELS[entry.entityType]}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(entry.status)}</TableCell>
                              <TableCell className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {formatTimestamp(entry.timestamp)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                                {entry.processed.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                                {entry.created.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {entry.updated.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-red-600 dark:text-red-400">
                                {entry.failed.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                                <Clock className="h-3 w-3 inline mr-1" />
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
