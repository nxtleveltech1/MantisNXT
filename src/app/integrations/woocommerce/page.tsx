'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  TestTube2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Entity = 'products' | 'orders' | 'customers' | 'categories';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function WooPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [config, setConfig] = useState<WooCommerceConfig>({
    name: 'WooCommerce Store',
    store_url: '',
    consumer_key: '',
    consumer_secret: '',
    status: 'inactive',
    auto_sync_products: true,
    auto_import_orders: true,
    sync_customers: true,
    sync_frequency: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [entity, setEntity] = useState<Entity>('products');
  const [rows, setRows] = useState<Array<any>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfiguration();
    const loadOrgId = async () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('orgId') : null;
      if (stored && UUID_REGEX.test(stored)) {
        setOrgId(stored);
      }

      try {
        const response = await fetch('/api/auth/user', { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          const data = await response.json();
          if (data?.orgId && UUID_REGEX.test(data.orgId)) {
            setOrgId(data.orgId);
            if (typeof window !== 'undefined') {
              localStorage.setItem('orgId', data.orgId);
            }
            return;
          }
        }
      } catch (error) {
        // Silently fail - endpoint may not exist (404 is expected)
      }

      try {
        const response = await fetch('/api/v1/organizations/current');
        const data = await response.json();
        if (data?.success && data.data?.id && UUID_REGEX.test(data.data.id)) {
          setOrgId(data.data.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('orgId', data.data.id);
          }
          return;
        }
      } catch (error) {
        console.error('Failed to resolve organization from API:', error);
      }
    };
    void loadOrgId();

    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    setIsAdmin(role === 'admin');
  }, []);

  const fetchConfiguration = async () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('orgId') : null;
      if (!stored || !UUID_REGEX.test(stored)) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/integrations/woocommerce', {
        headers: { 'x-org-id': stored },
      });
      const data = await response.json();

      if (data.success && data.data) {
        setConfig({
          id: data.data.id,
          name: data.data.name || 'WooCommerce Store',
          store_url: data.data.store_url || '',
          consumer_key: '', // Never expose in UI
          consumer_secret: '', // Never expose in UI
          status: data.data.status || 'inactive',
          auto_sync_products: data.data.auto_sync_products ?? true,
          auto_import_orders: data.data.auto_import_orders ?? true,
          sync_customers: data.data.sync_customers ?? true,
          sync_frequency: data.data.sync_frequency || 60,
        });
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!orgId || !UUID_REGEX.test(orgId)) {
      toast({
        title: 'Organization Error',
        description: 'Could not determine your organization. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/v1/integrations/woocommerce', {
        method: config.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgId,
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(prev => ({
          ...prev,
          id: data.data.id,
          store_url: data.data.store_url,
          status: data.data.status,
          auto_sync_products: data.data.auto_sync_products,
          auto_import_orders: data.data.auto_import_orders,
          sync_customers: data.data.sync_customers,
          sync_frequency: data.data.sync_frequency,
        }));
        toast({
          title: 'Configuration Saved',
          description: 'WooCommerce integration settings have been updated successfully.',
        });
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.store_url || !config.consumer_key || !config.consumer_secret) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all connection fields before testing.',
        variant: 'destructive',
      });
      return;
    }

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

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, create error response
        const text = await response.text();
        throw new Error(
          `Connection test failed: ${response.status} ${response.statusText}${text ? ` - ${text.substring(0, 100)}` : ''}`
        );
      }

      if (data.success) {
        const versionInfo = data.data.wc_version ? ` - WooCommerce: ${data.data.wc_version}` : '';
        const wpInfo = data.data.wp_version ? ` | WordPress: ${data.data.wp_version}` : '';
        const storeInfo = data.data.store_name ? ` | Store: ${data.data.store_name}` : '';
        toast({
          title: 'Connection Successful',
          description: `Successfully connected to WooCommerce store${versionInfo}${wpInfo}${storeInfo}`,
        });

        // Update status to active BEFORE saving
        const updatedConfig = { ...config, status: 'active' as const };
        setConfig(updatedConfig);

        // Save the configuration with active status
        if (config.id && orgId) {
          setSaving(true);
          try {
            const saveResponse = await fetch('/api/v1/integrations/woocommerce', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-org-id': orgId,
              },
              body: JSON.stringify(updatedConfig),
            });

            const saveData = await saveResponse.json();
            if (saveData.success) {
              setConfig(prev => ({
                ...prev,
                status: saveData.data.status,
                store_url: saveData.data.store_url,
              }));
            }
          } catch (saveError) {
            console.error('Failed to save active status:', saveError);
          } finally {
            setSaving(false);
          }
        }
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error: unknown) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect',
        variant: 'destructive',
      });
      setConfig(prev => ({ ...prev, status: 'error' }));
    } finally {
      setTesting(false);
    }
  };

  const refresh = useCallback(async (skipPreview = false) => {
    if (!orgId) return;
    setDataLoading(true);
    try {
      // Skip preview refresh if we have bulk sync data (faster)
      if (!skipPreview) {
        const r = await fetch(`/api/v1/integrations/woocommerce/preview/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
          body: JSON.stringify({ entities: [entity] }),
        });
        if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
      }
      
      // Always reload table data
      const res = await fetch(
        `/api/v1/integrations/woocommerce/table?entity=${entity}&orgId=${orgId}&page=1&pageSize=50`
      );
      if (!res.ok) throw new Error(`Table load failed: ${res.status}`);
      const json = await res.json();
      setRows(json.data || []);
      setSelected({});
    } catch (e: any) {
      console.error('Refresh error:', e);
      toast({
        title: 'Refresh failed',
        description: e?.message || 'Error',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  }, [orgId, entity, toast]);

  useEffect(() => {
    if (orgId && config.status === 'active') {
      // Try to load table data first (fast), then refresh preview in background if needed
      const loadTableData = async () => {
        setDataLoading(true);
        try {
          const res = await fetch(
            `/api/v1/integrations/woocommerce/table?entity=${entity}&orgId=${orgId}&page=1&pageSize=50`
          );
          if (res.ok) {
            const json = await res.json();
            if (json.data && json.data.length > 0) {
              // We have data, show it immediately
              setRows(json.data || []);
              setSelected({});
              setDataLoading(false);
              // Optionally refresh preview in background (non-blocking)
              refresh(true).catch(() => {}); // Ignore errors for background refresh
              return;
            }
          }
        } catch (e) {
          console.error('Initial table load failed:', e);
        }
        // No data found, do full refresh
        setDataLoading(false);
        refresh();
      };
      loadTableData();
    }
  }, [orgId, entity, config.status, refresh]);

  const toggleSelect = useCallback(
    (id: string) => {
      setSelected(prev => ({ ...prev, [id]: !prev[id] }));
    },
    []
  );

  const selectAllNew = useCallback(() => {
    const next: Record<string, boolean> = {};
    rows.forEach((r: any) => {
      if (r.status === 'new') next[r.external_id] = true;
    });
    setSelected(next);
  }, [rows]);

  const persistSelection = useCallback(async () => {
    const selectedRows = rows.filter((r: any) => selected[r.external_id]);
    if (selectedRows.length === 0 || !orgId) {
      toast({
        title: 'No selection',
        description: 'Select at least one row',
        variant: 'destructive',
      });
      return;
    }
    try {
      const ids = selectedRows.map((r: any) => r.external_id);
      const res = await fetch(`/api/v1/integrations/woocommerce/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
        body: JSON.stringify({ entity, ids, selected: true }),
      });
      if (!res.ok) throw new Error(`Select failed: ${res.status}`);
      toast({ title: 'Selection saved', description: `${ids.length} item(s) selected` });
    } catch (e: any) {
      toast({
        title: 'Selection failed',
        description: e?.message || 'Error',
        variant: 'destructive',
      });
    }
  }, [rows, selected, orgId, entity, toast]);

  const startSelectedSync = useCallback(async () => {
    const ids = Object.entries(selected)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0 || !orgId) {
      toast({
        title: 'No selection',
        description: 'Select at least one row',
        variant: 'destructive',
      });
      return;
    }
    try {
      if (entity !== 'customers') {
        toast({
          title: 'Not supported',
          description: 'Selected sync currently supports Customers',
          variant: 'destructive',
        });
        return;
      }
      const res = await fetch('/api/v1/integrations/woocommerce/sync/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          action: 'start-selected',
          options: { selectedIds: ids.map(id => Number(id)) },
          config: { url: '', consumerKey: '', consumerSecret: '' },
        }),
      });
      if (!res.ok) throw new Error(`Sync start failed: ${res.status}`);
      const json = await res.json();
      toast({ title: 'Sync started', description: `Queue: ${json?.data?.queueId || ''}` });
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message || 'Error', variant: 'destructive' });
    }
  }, [selected, orgId, entity, toast]);

  const scheduleFullSync = useCallback(async () => {
    if (!orgId) return;
    const confirmed = window.confirm('Schedule full WooCommerce customer sync?');
    if (!confirmed) return;
    try {
      const res = await fetch('/api/v1/integrations/woocommerce/schedule/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId, 'x-admin': 'true' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Schedule failed: ${res.status}`);
      const json = await res.json();
      toast({
        title: 'Scheduled',
        description: `Queue: ${json?.data?.queueId || json?.data?.queueId}`,
      });
    } catch (e: any) {
      toast({ title: 'Schedule failed', description: e?.message || 'Error', variant: 'destructive' });
    }
  }, [orgId, toast]);

  const handleBulkSync = useCallback(async () => {
    if (!orgId || !config.store_url) {
      toast({
        title: 'Configuration Required',
        description: 'Please configure and test your WooCommerce connection first.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      'This will download ALL products, orders, and customers from WooCommerce. This may take several minutes. Continue?'
    );
    if (!confirmed) return;

    setBulkSyncing(true);
    try {
      const res = await fetch('/api/v1/integrations/woocommerce/bulk-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgId,
        },
        body: JSON.stringify({
          entities: ['products', 'orders', 'customers'],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Bulk sync failed: ${res.status}`);
      }

      const json = await res.json();
      const results = json.data?.results || {};

      const summary = Object.entries(results)
        .map(([entity, data]: [string, any]) => {
          const status = data.queueId ? `Queued (${data.queueId.substring(0, 8)}...)` : data.status;
          return `${entity}: ${data.totalItems} items - ${status}`;
        })
        .join('\n');

      toast({
        title: 'Bulk Sync Completed',
        description: `All data downloaded from WooCommerce.\n\n${summary}`,
        duration: 10000,
      });

      // Reload table data directly (skip preview refresh since bulk sync already stored it)
      if (config.status === 'active' && orgId) {
        await refresh(true); // Pass true to skip preview refresh
      }
    } catch (e: any) {
      toast({
        title: 'Bulk Sync Failed',
        description: e?.message || 'Error initiating bulk sync',
        variant: 'destructive',
      });
    } finally {
      setBulkSyncing(false);
    }
  }, [orgId, config.store_url, config.status, refresh, toast]);

  if (loading) {
    return (
      <AppLayout
        title="WooCommerce"
        breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'WooCommerce' }]}
      >
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="WooCommerce"
      breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'WooCommerce' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground">{config.store_url || 'Not configured'}</p>
            </div>
          </div>

          <Badge
            variant={
              config.status === 'active'
                ? 'default'
                : config.status === 'error'
                  ? 'destructive'
                  : 'secondary'
            }
          >
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
        <Tabs defaultValue="configuration" className="space-y-6">
          <TabsList>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger
              value="products"
              onClick={() => {
                setEntity('products');
                if (orgId && config.status === 'active') {
                  refresh();
                }
              }}
            >
              Products
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              onClick={() => {
                setEntity('orders');
                if (orgId && config.status === 'active') {
                  refresh();
                }
              }}
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              onClick={() => {
                setEntity('customers');
                if (orgId && config.status === 'active') {
                  refresh();
                }
              }}
            >
              Customers
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              onClick={() => {
                setEntity('categories');
                if (orgId && config.status === 'active') {
                  refresh();
                }
              }}
            >
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>
                  Configure your WooCommerce store connection settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSaveConfiguration();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Integration Name</Label>
                    <Input
                      id="name"
                      autoComplete="organization"
                      value={config.name}
                      onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My WooCommerce Store"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_url">Store URL</Label>
                    <Input
                      id="store_url"
                      type="url"
                      autoComplete="url"
                      value={config.store_url}
                      onChange={e => setConfig(prev => ({ ...prev, store_url: e.target.value }))}
                      placeholder="https://your-store.com"
                    />
                    <p className="text-muted-foreground text-xs">
                      Your WooCommerce store URL (without trailing slash)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumer_key">Consumer Key</Label>
                    <Input
                      id="consumer_key"
                      type="password"
                      autoComplete="new-password"
                      value={config.consumer_key}
                      onChange={e => setConfig(prev => ({ ...prev, consumer_key: e.target.value }))}
                      placeholder="ck_..."
                    />
                    <p className="text-muted-foreground text-xs">
                      Your WooCommerce REST API consumer key (found in WooCommerce → Settings →
                      Advanced → REST API)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumer_secret">Consumer Secret</Label>
                    <Input
                      id="consumer_secret"
                      type="password"
                      autoComplete="new-password"
                      value={config.consumer_secret}
                      onChange={e =>
                        setConfig(prev => ({ ...prev, consumer_secret: e.target.value }))
                      }
                      placeholder="cs_..."
                    />
                    <p className="text-muted-foreground text-xs">
                      Your WooCommerce REST API consumer secret
                    </p>
                  </div>

                  <div className="flex gap-2 border-t pt-4">
                    <Button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={
                        !config.store_url ||
                        !config.consumer_key ||
                        !config.consumer_secret ||
                        testing
                      }
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
                    <Button type="submit" disabled={saving || !orgId}>
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
                    {config.status === 'active' && (
                      <Button
                        type="button"
                        onClick={handleBulkSync}
                        disabled={bulkSyncing || !orgId}
                        variant="default"
                        className="ml-auto"
                      >
                        {bulkSyncing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Initial Bulk Sync
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Configuration</CardTitle>
                <CardDescription>
                  Configure how data syncs between MantisNXT and WooCommerce
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Sync Products</Label>
                      <p className="text-muted-foreground text-sm">
                        Automatically sync products when they are updated
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_sync_products}
                      onCheckedChange={checked =>
                        setConfig(prev => ({ ...prev, auto_sync_products: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Import Orders</Label>
                      <p className="text-muted-foreground text-sm">
                        Automatically import new orders from WooCommerce
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_import_orders}
                      onCheckedChange={checked =>
                        setConfig(prev => ({ ...prev, auto_import_orders: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Customers</Label>
                      <p className="text-muted-foreground text-sm">
                        Enable customer data synchronization
                      </p>
                    </div>
                    <Switch
                      checked={config.sync_customers}
                      onCheckedChange={checked =>
                        setConfig(prev => ({ ...prev, sync_customers: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sync Frequency</Label>
                  <Select
                    value={config.sync_frequency.toString()}
                    onValueChange={value =>
                      setConfig(prev => ({ ...prev, sync_frequency: parseInt(value) }))
                    }
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

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleSaveConfiguration} disabled={saving || !orgId}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tabs */}
          {(['products', 'orders', 'customers', 'categories'] as Entity[]).map(tabEntity => (
            <TabsContent key={tabEntity} value={tabEntity}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Woo {tabEntity}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setEntity(tabEntity);
                        if (!orgId) return;
                        setDataLoading(true);
                        try {
                          const r = await fetch(`/api/v1/integrations/woocommerce/preview/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
                            body: JSON.stringify({ entities: [tabEntity] }),
                          });
                          if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
                          const res = await fetch(
                            `/api/v1/integrations/woocommerce/table?entity=${tabEntity}&orgId=${orgId}&page=1&pageSize=50`
                          );
                          const json = await res.json();
                          setRows(json.data || []);
                          setSelected({});
                        } catch (e: any) {
                          toast({
                            title: 'Refresh failed',
                            description: e?.message || 'Error',
                            variant: 'destructive',
                          });
                        } finally {
                          setDataLoading(false);
                        }
                      }}
                      aria-busy={dataLoading}
                      aria-label="Refresh preview"
                      disabled={dataLoading || config.status !== 'active'}
                    >
                      {dataLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Refreshing...
                        </>
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={selectAllNew}
                      aria-label="Select all new"
                      disabled={dataLoading}
                    >
                      Select All New
                    </Button>
                    <Button
                      variant="outline"
                      onClick={persistSelection}
                      aria-label="Save selection"
                      disabled={dataLoading}
                    >
                      Save Selection
                    </Button>
                    <Button
                      onClick={startSelectedSync}
                      aria-label="Sync selected"
                      disabled={dataLoading || config.status !== 'active'}
                    >
                      Sync Selected
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        onClick={scheduleFullSync}
                        aria-label="Schedule full sync"
                        disabled={dataLoading || config.status !== 'active'}
                      >
                        Schedule full sync
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {config.status !== 'active' && (
                    <div className="mb-4 rounded-lg border bg-yellow-50 p-4 text-yellow-900">
                      Please configure and test your WooCommerce connection before syncing data.
                    </div>
                  )}
                  {dataLoading && entity === tabEntity ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : entity === tabEntity ? (
                    <>
                      {rows.length === 0 && config.status === 'active' && (
                        <div className="mb-4 rounded-lg border bg-yellow-50 p-4 text-yellow-900">
                          No local records found for {tabEntity}. This looks like an initial import
                          — all records will be created from WooCommerce after you run a sync.
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Select</TableHead>
                            <TableHead>Status</TableHead>
                            {tabEntity === 'products' && (
                              <>
                                <TableHead>SKU</TableHead>
                                <TableHead>Name</TableHead>
                              </>
                            )}
                            {tabEntity === 'orders' && (
                              <>
                                <TableHead>Order</TableHead>
                                <TableHead>State</TableHead>
                              </>
                            )}
                            {tabEntity === 'customers' && (
                              <>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                              </>
                            )}
                            {tabEntity === 'categories' && (
                              <>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                              </>
                            )}
                            <TableHead>External ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r: any) => (
                            <TableRow key={r.external_id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={!!selected[r.external_id]}
                                  onChange={() => toggleSelect(r.external_id)}
                                />
                              </TableCell>
                              <TableCell>{r.status}</TableCell>
                              {tabEntity === 'products' && (
                                <>
                                  <TableCell>{r.display?.sku || ''}</TableCell>
                                  <TableCell>{r.display?.name || ''}</TableCell>
                                </>
                              )}
                              {tabEntity === 'orders' && (
                                <>
                                  <TableCell>{r.display?.order_number || ''}</TableCell>
                                  <TableCell>{r.display?.status || ''}</TableCell>
                                </>
                              )}
                              {tabEntity === 'customers' && (
                                <>
                                  <TableCell>{r.display?.email || ''}</TableCell>
                                  <TableCell>{r.display?.name || ''}</TableCell>
                                </>
                              )}
                              {tabEntity === 'categories' && (
                                <>
                                  <TableCell>{r.display?.name || ''}</TableCell>
                                  <TableCell>{r.display?.slug || ''}</TableCell>
                                </>
                              )}
                              <TableCell>{r.external_id}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Click the tab to load {tabEntity} data
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
