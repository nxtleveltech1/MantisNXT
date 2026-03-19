'use client';

/**
 * Xero Integration Page
 *
 * Main page for managing Xero accounting integration.
 * Includes connection management and account mappings.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { setStoredOrg } from '@/lib/org/current-org';
import { XeroConnectionCard, XeroAccountMappingForm } from '@/components/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  RefreshCw,
  FileText,
  Users,
  CreditCard,
  Package,
  ArrowRightLeft,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SyncLog {
  id: string;
  entityType: string;
  action: string;
  direction: string;
  status: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  createdAt: string;
  errorMessage: string | null;
}

interface XeroConnectionStatus {
  configured: boolean;
  connected: boolean;
  message?: string;
  connection?: {
    tenantId: string;
    tenantName: string;
    connectedAt: string;
    lastSyncAt: string | null;
    scopes: string[];
    tokenStatus: {
      isExpired: boolean;
      expiresInMinutes: number;
      expiresAt: string;
    };
  };
}

interface SyncSummary {
  entityType: string;
  totalSynced: number;
  lastSyncedAt: string | null;
}

function getFriendlyXeroErrorMessage(errorCode: string | null, fallback?: string | null) {
  switch (errorCode) {
    case 'org_context_mismatch':
      return 'The selected organization does not match your active authenticated organization. Switch to the same organization and try again.';
    case 'org_context_changed':
      return 'The selected organization changed during the Xero connection flow. Switch back to the same organization and try again.';
    case 'missing_org':
      return 'No organization selected. Choose an organization in the header and try again.';
    default:
      return fallback || errorCode || 'Xero authorization failed';
  }
}

export default function XeroIntegrationPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('connection');
  const [connectionStatus, setConnectionStatus] = useState<XeroConnectionStatus | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [pushAllSyncing, setPushAllSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getOrgId = useCallback(() => {
    const storedOrgId = typeof window !== 'undefined' ? localStorage.getItem('org_id') : null;
    const urlOrgId = searchParams?.get('org_id') ?? null;
    const orgId = storedOrgId || urlOrgId || null;

    if (urlOrgId && !storedOrgId) {
      setStoredOrg(urlOrgId, 'From URL');
    }

    return orgId;
  }, [searchParams]);

  const buildApiUrl = useCallback(
    (path: string) => {
      const orgId = getOrgId();
      if (!orgId) return path;

      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}org_id=${encodeURIComponent(orgId)}`;
    },
    [getOrgId]
  );

  const getOrgHeaders = useCallback((): HeadersInit => {
    const orgId = getOrgId();
    return orgId ? { 'X-Org-Id': orgId } : {};
  }, [getOrgId]);

  const getCleanPath = useCallback(() => {
    const orgId = getOrgId();
    return orgId ? `/integrations/xero?org_id=${encodeURIComponent(orgId)}` : '/integrations/xero';
  }, [getOrgId]);

  const getSettingsHref = useCallback(() => {
    const orgId = getOrgId();
    return orgId
      ? `/integrations/xero/settings?org_id=${encodeURIComponent(orgId)}`
      : '/integrations/xero/settings';
  }, [getOrgId]);

  const fetchStatus = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);
    const orgId = getOrgId();

    try {
      const response = await fetch(buildApiUrl('/api/xero/connection'), {
        headers: getOrgHeaders(),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : null;

      if (response.ok && data) {
        retryCountRef.current = 0;
        setConnectionStatus(data);
        return;
      }

      const errorCode = typeof data?.error === 'string' ? data.error : null;
      const fallbackMessage = typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : 'Failed to load connection status';
      const errorMessage = getFriendlyXeroErrorMessage(errorCode, fallbackMessage);
      const isNoOrg = response.status === 400 && errorCode === 'missing_org';

      if (isNoOrg && !orgId && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          void fetchStatus();
        }, 400);
        return;
      }

      setConnectionError(errorMessage);
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to load connection status');
    } finally {
      setConnectionLoading(false);
    }
  }, [buildApiUrl, getOrgHeaders, getOrgId]);

  async function fetchSyncSummary() {
    setLoadingSummary(true);
    try {
      const response = await fetch(buildApiUrl('/api/xero/sync-summary'), {
        headers: getOrgHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSyncSummary(data.summary || []);
      }
    } catch (error) {
      console.error('Failed to fetch sync summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function fetchSyncLogs() {
    setLoadingLogs(true);
    try {
      const response = await fetch(buildApiUrl('/api/xero/sync-logs'), {
        headers: getOrgHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.logs || []);
      } else {
        console.error('Failed to fetch sync logs:', response.statusText);
        setSyncLogs([]);
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
      setSyncLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSync(entityType: string) {
    setSyncing(entityType);
    try {
      const response = await fetch(buildApiUrl(`/api/xero/sync/${entityType}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrgHeaders(),
        },
        body: JSON.stringify({ type: 'fetch' }),
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        toast.success(`${entityType} sync completed`);
        await fetchSyncLogs();
        await fetchSyncSummary();
      } else {
        const errorMessage = getFriendlyXeroErrorMessage(
          typeof data?.error === 'string' ? data.error : null,
          data?.message || data?.error || `Failed to sync ${entityType}`
        );
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(`Failed to sync ${entityType}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to sync ${entityType}`;
      toast.error(errorMessage);
    } finally {
      setSyncing(null);
    }
  }

  async function handlePushAll() {
    setPushAllSyncing(true);
    try {
      const response = await fetch(buildApiUrl('/api/xero/sync/push-all'), {
        method: 'POST',
        headers: getOrgHeaders(),
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        const s = data.summary ?? {};
        toast.success(
          `Push complete: ${s.contacts ?? '—'}, ${s.items ?? '—'}, ${s.arInvoices ?? '—'}, ${s.apInvoices ?? '—'}`
        );
        await fetchSyncLogs();
        await fetchSyncSummary();
      } else {
        toast.error(data?.error ?? 'Push to Xero failed');
      }
    } catch (error) {
      console.error('Push to Xero failed:', error);
      toast.error(error instanceof Error ? error.message : 'Push to Xero failed');
    } finally {
      setPushAllSyncing(false);
    }
  }

  useEffect(() => {
    const error = searchParams?.get('xero_error') ?? null;
    const errorDesc = searchParams?.get('xero_error_description') ?? null;
    const connected = searchParams?.get('xero_connected') ?? null;
    const tenant = searchParams?.get('xero_tenant') ?? null;
    const cleanPath = getCleanPath();

    if (error || errorDesc) {
      toast.error(getFriendlyXeroErrorMessage(error, errorDesc));
      window.history.replaceState({}, '', cleanPath);
      return;
    }

    if (connected === 'true') {
      toast.success(tenant ? `Connected to Xero: ${tenant}` : 'Connected to Xero');
      window.history.replaceState({}, '', cleanPath);
      void fetchStatus();
    }
  }, [fetchStatus, getCleanPath, searchParams]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      void fetchStatus();
    };

    window.addEventListener('org-changed', handler);
    return () => window.removeEventListener('org-changed', handler);
  }, [fetchStatus]);

  useEffect(() => {
    if (activeTab === 'activity' && connectionStatus?.connected) {
      void fetchSyncLogs();
    }
  }, [activeTab, connectionStatus?.connected]);

  useEffect(() => {
    if (connectionStatus?.connected) {
      void fetchSyncSummary();
    }
  }, [connectionStatus?.connected]);

  const isConnected = connectionStatus?.connected && connectionStatus?.connection;

  const breadcrumbs = [
    { label: 'Integrations', href: '/integrations' },
    { label: 'Xero Accounting' },
  ];

  return (
    <AppLayout title="Xero Accounting" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage your Xero accounting integration</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={getSettingsHref()}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="mappings" disabled={!isConnected}>
              Account Mappings
            </TabsTrigger>
            <TabsTrigger value="sync" disabled={!isConnected}>
              Sync Operations
            </TabsTrigger>
            <TabsTrigger value="activity" disabled={!isConnected}>
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            {connectionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{connectionError}</AlertDescription>
              </Alert>
            )}
            {connectionLoading && !connectionStatus ? (
              <Card>
                <CardContent className="flex items-center gap-2 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading connection status...</span>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <XeroConnectionCard />

                {isConnected && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Sync Summary</CardTitle>
                      <CardDescription>Entities synced with Xero</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingSummary ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : syncSummary.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sync data available</p>
                      ) : (
                        <div className="grid gap-3">
                          {syncSummary.map((summary) => (
                            <div
                              key={summary.entityType}
                              className="flex items-center justify-between border-b pb-2 last:border-0"
                            >
                              <span className="text-sm font-medium capitalize">{summary.entityType}</span>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{summary.totalSynced}</div>
                                {summary.lastSyncedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(summary.lastSyncedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Integration Overview</CardTitle>
                    <CardDescription>What syncs between MantisNXT and Xero</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Contacts</p>
                          <p className="text-sm text-muted-foreground">
                            Sync suppliers and customers bidirectionally
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Invoices & Bills</p>
                          <p className="text-sm text-muted-foreground">
                            Create sales invoices (AR) and supplier bills (AP)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CreditCard className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Payments</p>
                          <p className="text-sm text-muted-foreground">
                            Record and receive payment updates
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Package className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Products/Items</p>
                          <p className="text-sm text-muted-foreground">
                            Sync inventory items and pricing
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mappings">
            <XeroAccountMappingForm />
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4" />
                  Push NXT to Xero
                </CardTitle>
                <CardDescription>
                  Sync all contacts, items, and invoices from this org to Xero in one go.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => void handlePushAll()}
                  disabled={pushAllSyncing || syncing !== null}
                >
                  {pushAllSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Push NXT to Xero
                </Button>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sync suppliers and customers with Xero contacts.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleSync('contacts')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'contacts' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                    )}
                    Sync Contacts
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Fetch latest invoices and update statuses.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleSync('invoices')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'invoices' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Fetch Invoices
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Fetch recent payments from Xero.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleSync('payments')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'payments' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Fetch Payments
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
                    Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sync products with Xero inventory items.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleSync('items')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'items' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                    )}
                    Sync Items
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Purchase Orders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Sync purchase orders with Xero.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleSync('purchase-orders')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'purchase-orders' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                    )}
                    Sync POs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Quotes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Fetch quotations from Xero and sync status updates.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleSync('quotes')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'quotes' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Fetch Quotes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sync Activity Log</CardTitle>
                    <CardDescription>Recent synchronization operations</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void fetchSyncLogs()} disabled={loadingLogs}>
                    {loadingLogs ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : syncLogs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No sync activity yet</p>
                    <p className="text-sm">Activity will appear here after sync operations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium capitalize">
                              {log.action} {log.entityType}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {log.recordsSucceeded}/{log.recordsProcessed} records - {new Date(log.createdAt).toLocaleString()}
                            </p>
                            {log.errorMessage && (
                              <p className="mt-1 text-sm text-destructive">{log.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={log.direction === 'to_xero' ? 'default' : 'secondary'}>
                          {log.direction === 'to_xero' ? 'To Xero' : 'From Xero'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
