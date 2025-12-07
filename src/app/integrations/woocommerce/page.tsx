'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  TestTube2,
  Shield,
  Lock,
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
import { useSecureAuth, useAdminAuth, useOrgValidation } from '@/hooks/useSecureAuth';
import { InputValidator, CSRFProtection } from '@/lib/utils/secure-storage';

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
  const { isAuthenticated, isAdmin, isLoading: authLoading, orgId } = useSecureAuth();
  const [orgIdValidated, setOrgIdValidated] = useState<string | null>(null);
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
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const { toast } = useToast();

  // Validate organization context with fallback
  useEffect(() => {
    if (authLoading) return;

    const loadOrgId = async () => {
      // Try from auth hook first (check UUID format directly to avoid throwing)
      if (isAuthenticated && orgId && UUID_REGEX.test(orgId)) {
        setOrgIdValidated(orgId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('orgId', orgId);
        }
        return;
      }

      // Fallback 1: localStorage
      const stored = typeof window !== 'undefined' ? localStorage.getItem('orgId') : null;
      if (stored && UUID_REGEX.test(stored)) {
        setOrgIdValidated(stored);
        return;
      }

      // Fallback 2: API /api/auth/user
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();
        if (data?.orgId && UUID_REGEX.test(data.orgId)) {
          setOrgIdValidated(data.orgId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('orgId', data.orgId);
          }
          return;
        }
      } catch (error) {
        console.warn('Failed to load org ID from auth service:', error);
      }

      // Fallback 3: API /api/v1/organizations/current
      try {
        const response = await fetch('/api/v1/organizations/current');
        const data = await response.json();
        if (data?.success && data.data?.id && UUID_REGEX.test(data.data.id)) {
          setOrgIdValidated(data.data.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('orgId', data.data.id);
          }
          return;
        }
      } catch (error) {
        console.warn('Failed to resolve organization from API:', error);
      }

      // Last resort: use orgId directly if it's a valid UUID
      if (orgId && UUID_REGEX.test(orgId)) {
        setOrgIdValidated(orgId);
      }
    };

    void loadOrgId();
  }, [authLoading, isAuthenticated, orgId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    fetchConfiguration();
  }, [authLoading, isAuthenticated]);

  const fetchConfiguration = async () => {
    if (!orgIdValidated) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/integrations/woocommerce', {
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgIdValidated,
          'x-csrf-token': await CSRFProtection.getToken(),
        },
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
      toast({
        title: 'Configuration Error',
        description: 'Failed to load WooCommerce configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    console.log('[Save Config] Starting save...', { orgIdValidated, isAuthenticated, config });
    
    if (!orgIdValidated || !isAuthenticated) {
      console.error('[Save Config] Missing requirements:', { orgIdValidated, isAuthenticated });
      toast({
        title: 'Authentication Required',
        description: `Please sign in to save configuration. ${!orgIdValidated ? 'Org ID missing.' : ''}`,
        variant: 'destructive',
      });
      return;
    }

    // Input validation
    const sanitizedUrl = InputValidator.sanitizeInput(config.store_url);
    const isValidUrl = InputValidator.validateUrl(sanitizedUrl);

    if (!sanitizedUrl || !isValidUrl) {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid WooCommerce store URL.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Only include credentials if they've been entered (not empty strings)
      // For updates, empty credentials will be preserved from existing config
      const requestBody: any = {
        ...config,
        store_url: sanitizedUrl,
      };
      
      // Remove empty credentials from request body if updating existing config
      // This signals to the backend to preserve existing credentials
      if (config.id) {
        if (!requestBody.consumer_key || requestBody.consumer_key.trim() === '') {
          delete requestBody.consumer_key;
        }
        if (!requestBody.consumer_secret || requestBody.consumer_secret.trim() === '') {
          delete requestBody.consumer_secret;
        }
      }
      
      console.log('[Save Config] Request:', { method: config.id ? 'PUT' : 'POST', orgId: orgIdValidated, body: { ...requestBody, consumer_key: requestBody.consumer_key ? '***' : '(preserved)', consumer_secret: requestBody.consumer_secret ? '***' : '(preserved)' } });
      
      const response = await fetch('/api/v1/integrations/woocommerce', {
        method: config.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgIdValidated,
          'x-csrf-token': await CSRFProtection.getToken(),
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Save Config] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Save Config] Error response:', errorData);
        throw new Error(errorData.error || `Save failed: ${response.status} ${response.statusText}`);
      }

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
      console.error('Save configuration error:', error);
      toast({
        title: 'Save Failed',
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

    // Input validation
    const sanitizedUrl = InputValidator.sanitizeInput(config.store_url);
    const isValidUrl = InputValidator.validateUrl(sanitizedUrl);
    const isValidKey = InputValidator.validateConsumerKey(config.consumer_key);
    const isValidSecret = InputValidator.validateConsumerSecret(config.consumer_secret);

    if (!sanitizedUrl || !isValidUrl) {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid WooCommerce store URL.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidKey) {
      toast({
        title: 'Invalid Consumer Key',
        description: 'Please provide a valid WooCommerce consumer key.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidSecret) {
      toast({
        title: 'Invalid Consumer Secret',
        description: 'Please provide a valid WooCommerce consumer secret.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/v1/integrations/woocommerce/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': await CSRFProtection.getToken(),
        },
        body: JSON.stringify({
          store_url: sanitizedUrl,
          consumer_key: config.consumer_key,
          consumer_secret: config.consumer_secret,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
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
        const updatedConfig = { ...config, status: 'active' as const, store_url: sanitizedUrl };
        setConfig(updatedConfig);
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

  // Debounce timer ref to prevent rapid successive calls
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const inFlightRefreshRef = useRef(false);
  const rateLimitUntilRef = useRef<number>(0);

  const refresh = useCallback(async (skipPreview = false) => {
    if (!orgIdValidated) return;
    
    const now = Date.now();

    if (rateLimitUntilRef.current && now < rateLimitUntilRef.current) {
      const secondsRemaining = Math.ceil((rateLimitUntilRef.current - now) / 1000);
      toast({
        title: 'Rate limited',
        description: `Please wait ${secondsRemaining}s before retrying.`,
        variant: 'destructive',
      });
      return;
    }

    if (inFlightRefreshRef.current) {
      return;
    }

    // Debounce: prevent calls within 500ms of each other
    if (now - lastRefreshTimeRef.current < 500) {
      // Clear any pending refresh and schedule a new one
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        refresh(skipPreview);
      }, 500 - (now - lastRefreshTimeRef.current));
      return;
    }
    
    lastRefreshTimeRef.current = now;
    inFlightRefreshRef.current = true;
    setDataLoading(true);
    try {
      // Skip preview refresh if we have bulk sync data (faster)
      if (!skipPreview) {
        const r = await fetch(`/api/v1/integrations/woocommerce/preview/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-org-id': orgIdValidated },
          body: JSON.stringify({ entities: [entity] }),
        });
        if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
      }
      
      // Always reload table data
      const res = await fetch(
        `/api/v1/integrations/woocommerce/table?entity=${entity}&orgId=${orgIdValidated}&page=1&pageSize=50`
      );
      if (!res.ok) {
        // Handle 429 specifically with a longer backoff
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '30', 10);
          rateLimitUntilRef.current = Date.now() + retryAfter * 1000;
          throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`);
        }
        throw new Error(`Table load failed: ${res.status}`);
      }
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
      inFlightRefreshRef.current = false;
    }
  }, [orgIdValidated, entity, toast]);

  useEffect(() => {
    if (orgIdValidated && config.status === 'active' && isAuthenticated) {
      // Use refresh function which handles debouncing and error handling
      // Skip preview refresh on initial load for faster response
      refresh(true).catch(() => {}); // Ignore errors for initial load
    }
    
    // Cleanup: clear any pending refresh timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [orgIdValidated, entity, config.status, isAuthenticated, refresh]);

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
    if (!orgIdValidated || !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save selection.',
        variant: 'destructive',
      });
      return;
    }

    const selectedRows = rows.filter((r: any) => selected[r.external_id]);
    if (selectedRows.length === 0) {
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
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgIdValidated,
          'x-csrf-token': await CSRFProtection.getToken(),
        },
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
  }, [rows, selected, orgIdValidated, isAuthenticated, entity, toast]);

  const startSelectedSync = useCallback(async () => {
    if (!orgIdValidated || !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to start sync.',
        variant: 'destructive',
      });
      return;
    }

    const ids = Object.entries(selected)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
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
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgIdValidated,
          'x-csrf-token': await CSRFProtection.getToken(),
        },
        body: JSON.stringify({
          org_id: orgIdValidated,
          action: 'start-selected',
          options: { selectedIds: ids.map(id => Number(id)) },
        }),
      });
      if (!res.ok) throw new Error(`Sync start failed: ${res.status}`);
      const json = await res.json();
      toast({ title: 'Sync started', description: `Queue: ${json?.data?.queueId || ''}` });
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message || 'Error', variant: 'destructive' });
    }
  }, [selected, orgIdValidated, isAuthenticated, entity, toast]);

  const scheduleFullSync = useCallback(async () => {
    if (!orgIdValidated || !isAuthenticated || !isAdmin) {
      toast({
        title: 'Insufficient Permissions',
        description: 'Admin access required for this operation.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm('Schedule full WooCommerce customer sync?');
    if (!confirmed) return;
    try {
      const res = await fetch('/api/v1/integrations/woocommerce/schedule/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgIdValidated,
          'x-admin': 'true',
          'x-csrf-token': await CSRFProtection.getToken(),
        },
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
  }, [orgIdValidated, isAuthenticated, isAdmin, toast]);

  const handleBulkSync = useCallback(async () => {
    console.log('[Bulk Sync] Starting bulk sync...', { orgIdValidated, isAuthenticated });
    
    if (!orgIdValidated || !isAuthenticated) {
      console.error('[Bulk Sync] Missing requirements:', { orgIdValidated, isAuthenticated });
      toast({
        title: 'Authentication Required',
        description: `Please sign in to start bulk sync. ${!orgIdValidated ? 'Org ID missing.' : ''}`,
        variant: 'destructive',
      });
      return;
    }

    const sanitizedUrl = InputValidator.sanitizeInput(config.store_url);
    if (!sanitizedUrl || !InputValidator.validateUrl(sanitizedUrl)) {
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
          'x-org-id': orgIdValidated,
          'x-csrf-token': await CSRFProtection.getToken(),
        },
        body: JSON.stringify({
          entities: ['products', 'orders', 'customers'],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Bulk sync failed: ${res.status} ${res.statusText}`;
        console.error('Bulk sync error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || json.message || 'Bulk sync failed');
      }

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
      if (config.status === 'active' && orgIdValidated && isAuthenticated) {
        await refresh(true); // Pass true to skip preview refresh
      }
    } catch (e: any) {
      console.error('Bulk sync error:', e);
      toast({
        title: 'Bulk Sync Failed',
        description: e?.message || 'Error initiating bulk sync',
        variant: 'destructive',
      });
    } finally {
      setBulkSyncing(false);
    }
  }, [orgIdValidated, isAuthenticated, config.store_url, config.status, refresh, toast]);

  if (authLoading) {
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

  if (!isAuthenticated) {
    return (
      <AppLayout
        title="WooCommerce"
        breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'WooCommerce' }]}
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Authentication Required</h1>
            <p className="text-gray-600">Please sign in to access the WooCommerce integration.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

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
                      placeholder={config.id ? "Leave blank to keep existing credentials" : "ck_..."}
                    />
                    <p className="text-muted-foreground text-xs">
                      Your WooCommerce REST API consumer key (found in WooCommerce → Settings →
                      Advanced → REST API). {config.id && 'Leave blank to preserve existing credentials.'}
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
                      placeholder={config.id ? "Leave blank to keep existing credentials" : "cs_..."}
                    />
                    <p className="text-muted-foreground text-xs">
                      Your WooCommerce REST API consumer secret. {config.id && 'Leave blank to preserve existing credentials.'}
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
                    <Button type="submit" disabled={saving || !orgIdValidated}>
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
                        disabled={bulkSyncing || !orgIdValidated}
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
                  <Button onClick={handleSaveConfiguration} disabled={saving || !orgIdValidated}>
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
                        if (!orgIdValidated || !isAuthenticated) return;
                        setDataLoading(true);
                        try {
                          const r = await fetch(`/api/v1/integrations/woocommerce/preview/refresh`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-org-id': orgIdValidated,
                              'x-csrf-token': await CSRFProtection.getToken(),
                            },
                            body: JSON.stringify({ entities: [tabEntity] }),
                          });
                          if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
                          const res = await fetch(
                            `/api/v1/integrations/woocommerce/table?entity=${tabEntity}&orgId=${orgIdValidated}&page=1&pageSize=50`
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
                            <TableHead className="w-12">Select</TableHead>
                            <TableHead className="w-20">Status</TableHead>
                            {tabEntity === 'products' && (
                              <>
                                <TableHead className="w-32">SKU</TableHead>
                                <TableHead className="min-w-[200px]">Name</TableHead>
                                <TableHead className="w-32">Regular Price</TableHead>
                                <TableHead className="w-32">Sale Price</TableHead>
                                <TableHead className="w-24">SOH</TableHead>
                                <TableHead className="w-24">Stock Status</TableHead>
                                <TableHead className="min-w-[150px]">Category</TableHead>
                                <TableHead className="min-w-[150px]">Tags</TableHead>
                                <TableHead className="w-32">Brand</TableHead>
                                <TableHead className="w-32">Type</TableHead>
                                <TableHead className="w-24">On Sale</TableHead>
                              </>
                            )}
                            {tabEntity === 'orders' && (
                              <>
                                <TableHead>Order</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Payment</TableHead>
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
                            <TableHead className="w-24">External ID</TableHead>
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
                              <TableCell>
                                <Badge variant={r.status === 'new' ? 'default' : r.status === 'updated' ? 'secondary' : 'outline'}>
                                  {r.status}
                                </Badge>
                              </TableCell>
                              {tabEntity === 'products' && (
                                <>
                                  <TableCell className="font-mono text-sm">{r.sku || r.display?.sku || ''}</TableCell>
                                  <TableCell className="font-medium">{r.name || r.display?.name || ''}</TableCell>
                                  <TableCell className="font-mono">
                                    {r.regular_price !== null && r.regular_price !== undefined
                                      ? `R ${r.regular_price.toFixed(2)}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="font-mono text-green-600">
                                    {r.sale_price !== null && r.sale_price !== undefined
                                      ? `R ${r.sale_price.toFixed(2)}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="font-mono text-center">
                                    {r.stock_quantity !== null && r.stock_quantity !== undefined ? r.stock_quantity : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        r.stock_status === 'instock'
                                          ? 'default'
                                          : r.stock_status === 'outofstock'
                                            ? 'destructive'
                                            : 'secondary'
                                      }
                                    >
                                      {r.stock_status || '-'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{r.category_names || '-'}</TableCell>
                                  <TableCell className="text-sm">{r.tag_names || '-'}</TableCell>
                                  <TableCell className="text-sm">{r.brand || '-'}</TableCell>
                                  <TableCell className="text-sm">{r.type || '-'}</TableCell>
                                  <TableCell className="text-center">
                                    {r.on_sale ? (
                                      <Badge variant="default" className="bg-green-600">
                                        Yes
                                      </Badge>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </>
                              )}
                              {tabEntity === 'orders' && (
                                <>
                                  <TableCell>{r.display?.order_number || r.raw?.number || ''}</TableCell>
                                  <TableCell>{r.display?.status || r.raw?.status || ''}</TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {r.raw?.currency && r.raw?.total
                                      ? `${r.raw.currency} ${parseFloat(r.raw.total).toFixed(2)}`
                                      : r.raw?.total || ''}
                                  </TableCell>
                                  <TableCell>
                                    {r.display?.customer_email ||
                                      r.raw?.billing?.email ||
                                      r.raw?.customer_email ||
                                      ''}
                                  </TableCell>
                                  <TableCell>
                                    {r.raw?.date_created
                                      ? new Date(r.raw.date_created).toLocaleString()
                                      : ''}
                                  </TableCell>
                                  <TableCell>
                                    {r.display?.payment_method ||
                                      r.raw?.payment_method_title ||
                                      r.raw?.payment_method ||
                                      ''}
                                  </TableCell>
                                </>
                              )}
                              {tabEntity === 'customers' && (
                                <>
                                  <TableCell>{r.display?.email || r.raw?.email || ''}</TableCell>
                                  <TableCell>
                                    {r.display?.name ||
                                      `${r.raw?.first_name || ''} ${r.raw?.last_name || ''}`.trim()}
                                  </TableCell>
                                </>
                              )}
                              {tabEntity === 'categories' && (
                                <>
                                  <TableCell>{r.display?.name || ''}</TableCell>
                                  <TableCell>{r.display?.slug || ''}</TableCell>
                                </>
                              )}
                              <TableCell className="font-mono text-xs">{r.external_id}</TableCell>
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
