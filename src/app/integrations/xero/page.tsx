'use client';

/**
 * Xero Integration Page
 * 
 * Main page for managing Xero accounting integration.
 * Includes connection management and account mappings.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
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
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function XeroIntegrationPage() {
  const [activeTab, setActiveTab] = useState('connection');
  const [connectionStatus, setConnectionStatus] = useState<XeroConnectionStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Fetch connection status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/xero/connection');
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch connection status:', error);
      }
    }
    fetchStatus();
  }, []);

  // Fetch sync logs when on activity tab
  useEffect(() => {
    if (activeTab === 'activity' && connectionStatus?.connected) {
      fetchSyncLogs();
    }
  }, [activeTab, connectionStatus?.connected]);

  // Fetch sync summary when connected
  useEffect(() => {
    if (connectionStatus?.connected) {
      fetchSyncSummary();
    }
  }, [connectionStatus?.connected]);

  async function fetchSyncSummary() {
    setLoadingSummary(true);
    try {
      const response = await fetch('/api/xero/sync-summary');
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
      const response = await fetch('/api/xero/sync-logs');
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
      const response = await fetch(`/api/xero/sync/${entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fetch' }),
      });

      const data = await response.json();

      if (response.ok && (data.success !== false)) {
        toast.success(`${entityType} sync completed`);
        fetchSyncLogs();
        fetchSyncSummary(); // Refresh sync summary after successful sync
      } else {
        const errorMessage = data.error || data.message || `Failed to sync ${entityType}`;
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

  const isConnected = connectionStatus?.connected && connectionStatus?.connection;

  const breadcrumbs = [
    { label: 'Integrations', href: '/integrations' },
    { label: 'Xero Accounting' },
  ];

  return (
    <AppLayout title="Xero Accounting" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Manage your Xero accounting integration
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/integrations/xero/settings">
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

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <XeroConnectionCard />
              
              {/* Sync Summary Cards */}
              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sync Summary</CardTitle>
                    <CardDescription>
                      Entities synced with Xero
                    </CardDescription>
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
                          <div key={summary.entityType} className="flex items-center justify-between border-b pb-2 last:border-0">
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
              
              {/* Quick Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Integration Overview</CardTitle>
                  <CardDescription>
                    What syncs between MantisNXT and Xero
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Contacts</p>
                        <p className="text-sm text-muted-foreground">
                          Sync suppliers and customers bidirectionally
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Invoices & Bills</p>
                        <p className="text-sm text-muted-foreground">
                          Create sales invoices (AR) and supplier bills (AP)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Payments</p>
                        <p className="text-sm text-muted-foreground">
                          Record and receive payment updates
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
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
          </TabsContent>

          {/* Account Mappings Tab */}
          <TabsContent value="mappings">
            <XeroAccountMappingForm />
          </TabsContent>

          {/* Sync Operations Tab */}
          <TabsContent value="sync" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
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
                    onClick={() => handleSync('contacts')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'contacts' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Sync Contacts
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
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
                    onClick={() => handleSync('invoices')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'invoices' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Fetch Invoices
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Fetch recent payments from Xero.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSync('payments')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'payments' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Fetch Payments
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
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
                    onClick={() => handleSync('items')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'items' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Sync Items
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Purchase Orders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sync purchase orders with Xero.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSync('purchase-orders')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'purchase-orders' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Sync POs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
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
                    onClick={() => handleSync('quotes')}
                    disabled={syncing !== null}
                  >
                    {syncing === 'quotes' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Fetch Quotes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sync Activity Log</CardTitle>
                    <CardDescription>
                      Recent synchronization operations
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchSyncLogs}
                    disabled={loadingLogs}
                  >
                    {loadingLogs ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
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
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
                              {log.recordsSucceeded}/{log.recordsProcessed} records •{' '}
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                            {log.errorMessage && (
                              <p className="text-sm text-destructive mt-1">
                                {log.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={log.direction === 'to_xero' ? 'default' : 'secondary'}
                        >
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
