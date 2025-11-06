"use client";

import React, { useState, useEffect } from "react";
import { Database, RefreshCw, Settings, History, AlertCircle, CheckCircle2, Package, ShoppingCart, Users, Save, TestTube2, FileText, Eye, X, Loader2, Clock, XCircle, Play, Square } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SyncPreview from "@/components/integrations/SyncPreview";
import ProgressTracker from "@/components/integrations/ProgressTracker";
import ActivityLog from "@/components/integrations/ActivityLog";
import { useSyncManager } from "@/hooks/useSyncManager";

interface OdooConfig {
  id?: string;
  name: string;
  server_url: string;
  database_name: string;
  username: string;
  api_key: string;
  status: 'active' | 'inactive' | 'error';
  auto_sync_products: boolean;
  auto_sync_customers: boolean;
  auto_sync_orders: boolean;
  auto_sync_invoices: boolean;
  sync_frequency: number;
}

export default function OdooPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<OdooConfig>({
    name: 'Odoo ERP',
    server_url: '',
    database_name: '',
    username: '',
    api_key: '',
    status: 'inactive',
    auto_sync_products: true,
    auto_sync_customers: true,
    auto_sync_orders: true,
    auto_sync_invoices: false,
    sync_frequency: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  // Sync preview and progress management
  const syncManager = useSyncManager();
  const [orgId, setOrgId] = useState<string>('org-default');

  useEffect(() => {
    fetchConfiguration();
    // Get org ID from user context (if available)
    const loadOrgId = async () => {
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();
        if (data?.orgId) setOrgId(data.orgId);
      } catch (error) {
        console.error('Failed to load org ID:', error);
      }
    };
    loadOrgId();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/integrations/odoo');
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

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/integrations/odoo', {
        method: config.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        toast({
          title: "Configuration Saved",
          description: "Odoo ERP integration settings have been updated successfully.",
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
      const response = await fetch('/api/v1/integrations/odoo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_url: config.server_url,
          database_name: config.database_name,
          username: config.username,
          api_key: config.api_key,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const envInfo = data.data.environment ? ` (${data.data.environment})` : '';
        const versionInfo = data.data.odoo_version ? ` - Version: ${data.data.odoo_version}` : '';
        toast({
          title: "Connection Successful",
          description: `Successfully connected to Odoo ERP server${envInfo}${versionInfo}`,
        });
        
        // Update status to active BEFORE saving
        const updatedConfig = { ...config, status: 'active' as const };
        setConfig(updatedConfig);
        
        // Save the configuration with active status
        if (config.id) {
          setSaving(true);
          try {
            const saveResponse = await fetch('/api/v1/integrations/odoo', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedConfig),
            });

            const saveData = await saveResponse.json();
            if (saveData.success) {
              setConfig(saveData.data);
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
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
      setConfig(prev => ({ ...prev, status: 'error' }));
      
      // Save error status if config exists
      if (config.id) {
        try {
          await fetch('/api/v1/integrations/odoo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...config, status: 'error' }),
          });
        } catch (saveError) {
          console.error('Failed to save error status:', saveError);
        }
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (entityType: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/odoo/sync/${entityType}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Sync Started",
          description: `${entityType} sync has been initiated.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (entityType: string) => {
    setPreviewLoading(entityType);
    try {
      // Use current form values (same as test connection) to ensure consistency
      const response = await fetch(`/api/v1/integrations/odoo/preview/${entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_url: config.server_url,
          database_name: config.database_name,
          username: config.username,
          api_key: config.api_key,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreviewData(data.data);
        toast({
          title: "Preview Loaded",
          description: `Found ${data.data.totalCount} ${entityType} records. Showing preview of ${data.data.previewCount} records.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(null);
    }
  };

  const closePreview = () => {
    setPreviewData(null);
  };

  const handlePreviewSync = (entityType: string) => {
    syncManager.openPreview('odoo', entityType);
  };

  const handleSyncConfirmed = async (config: any) => {
    syncManager.closePreview();
    // Generate job ID and start progress tracking
    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    syncManager.startProgress(jobId, 'odoo', config.entityType || 'unknown');

    // Trigger actual sync
    try {
      // Call sync API with job ID
      const response = await fetch('/api/v1/integrations/sync/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          syncType: 'odoo',
          entityType: config.entityType,
          includeNew: config.includeNew,
          includeUpdated: config.includeUpdated,
          includeDeleted: config.includeDeleted,
          selectedIds: config.selectedIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: error instanceof Error ? error.message : 'Failed to start sync',
        variant: 'destructive',
      });
      syncManager.resetSync();
    }
  };

  if (loading) {
    return (
      <SelfContainedLayout
        title="Odoo ERP Integration"
        breadcrumbs={[
          { label: "Integrations", href: "/integrations" },
          { label: "Odoo ERP" },
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
      title="Odoo ERP Integration"
      breadcrumbs={[
        { label: "Integrations", href: "/integrations" },
        { label: "Odoo ERP" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground">
                {config.server_url || 'Not configured'}
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
        <Tabs defaultValue="configuration" className="space-y-6">
          <TabsList>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="sync">Sync & Operations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>
                  Configure your Odoo ERP server connection settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Odoo ERP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server_url">Server URL</Label>
                  <Input
                    id="server_url"
                    value={config.server_url}
                    onChange={(e) => setConfig(prev => ({ ...prev, server_url: e.target.value }))}
                    placeholder="https://your-company.odoo.sh"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Odoo instance URL. For Odoo.sh: https://company-branch-id.odoo.com (NOT the project management URL) | For self-hosted: https://odoo.your-domain.com
                  </p>
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    ⚠️ For Odoo.sh: Use your instance URL from the dashboard, NOT www.odoo.sh/project/...
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database_name">Database Name</Label>
                  <Input
                    id="database_name"
                    value={config.database_name}
                    onChange={(e) => setConfig(prev => ({ ...prev, database_name: e.target.value }))}
                    placeholder="your_database_name"
                  />
                  <p className="text-xs text-muted-foreground">
                    The name of your Odoo database. For Odoo.sh, this is typically your instance name (e.g., mycompany-production)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="admin@company.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Odoo user email or username
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key / Password</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={config.api_key}
                    onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="********************************"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Odoo API key or user password
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleTestConnection}
                    disabled={!config.server_url || !config.database_name || !config.username || !config.api_key || testing}
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

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ready to sync
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview('products')}
                      disabled={config.status !== 'active' || previewLoading === 'products'}
                    >
                      {previewLoading === 'products' ? (
                        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-3 w-3" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSync('products')}
                      disabled={config.status !== 'active'}
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ready to sync
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview('orders')}
                      disabled={config.status !== 'active' || previewLoading === 'orders'}
                    >
                      {previewLoading === 'orders' ? (
                        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-3 w-3" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSync('orders')}
                      disabled={config.status !== 'active'}
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ready to sync
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview('customers')}
                      disabled={config.status !== 'active' || previewLoading === 'customers'}
                    >
                      {previewLoading === 'customers' ? (
                        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-3 w-3" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSync('customers')}
                      disabled={config.status !== 'active'}
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ready to sync
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview('invoices')}
                      disabled={config.status !== 'active' || previewLoading === 'invoices'}
                    >
                      {previewLoading === 'invoices' ? (
                        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-3 w-3" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSync('invoices')}
                      disabled={config.status !== 'active'}
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
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

            {/* Sync Preview Section */}
            {previewData && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Sync Preview - {previewData.entityType.charAt(0).toUpperCase() + previewData.entityType.slice(1)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Preview of available data before syncing to production database
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closePreview}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4">
                    <Badge variant="secondary">
                      Total Records: {previewData.totalCount}
                    </Badge>
                    <Badge variant="outline">
                      Showing: {previewData.previewCount}
                    </Badge>
                  </div>

                  {previewData.previewData && previewData.previewData.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {previewData.fields && previewData.fields.map((field: string) => (
                              <TableHead key={field} className="capitalize">
                                {field.replace(/_/g, ' ')}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.previewData.map((record: any, idx: number) => (
                            <TableRow key={idx}>
                              {previewData.fields.map((field: string) => (
                                <TableCell key={field} className="max-w-xs truncate">
                                  {(() => {
                                    const value = record[field];
                                    if (value === null || value === undefined) {
                                      return <span className="text-muted-foreground">-</span>;
                                    }
                                    // Handle Odoo tuple format [id, name] for relational fields
                                    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
                                      return <span>{value[1] || `ID: ${value[0]}`}</span>;
                                    }
                                    // Handle array of IDs
                                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
                                      return <span className="text-muted-foreground">[{value.length} items]</span>;
                                    }
                                    // Handle other arrays
                                    if (Array.isArray(value)) {
                                      return <span className="text-muted-foreground">[{value.length} items]</span>;
                                    }
                                    // Handle objects
                                    if (typeof value === 'object') {
                                      return <span className="text-muted-foreground" title={JSON.stringify(value)}>{JSON.stringify(value).substring(0, 50)}...</span>;
                                    }
                                    // Handle booleans
                                    if (typeof value === 'boolean') {
                                      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
                                    }
                                    // Handle prices/amounts
                                    if (typeof value === 'number' && (field.includes('price') || field.includes('amount') || field.includes('total'))) {
                                      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                                    }
                                    // Handle dates
                                    if (typeof value === 'string' && (field.includes('date') || field.includes('time'))) {
                                      try {
                                        const date = new Date(value);
                                        return date.toLocaleDateString();
                                      } catch {
                                        return String(value);
                                      }
                                    }
                                    return String(value);
                                  })()}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No preview data available
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={closePreview}
                    >
                      Close Preview
                    </Button>
                    <Button
                      onClick={() => {
                        closePreview();
                        handleSync(previewData.entityType);
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync to Production
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Configuration</CardTitle>
                <CardDescription>Configure how data syncs between MantisNXT and Odoo ERP</CardDescription>
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
                      <Label>Auto Sync Customers</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync customer data bi-directionally
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_sync_customers}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_sync_customers: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Sync Orders</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically import new orders from Odoo
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_sync_orders}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_sync_orders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Sync Invoices</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync invoices and payment data
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_sync_invoices}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_sync_invoices: checked }))}
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
        </Tabs>

        {/* Activity Log Tab */}
        <Tabs defaultValue="activity" className="space-y-6 mt-6">
          <TabsList>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <ActivityLog orgId={orgId} entityType="odoo" />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sync Preview Modal */}
      <SyncPreview
        isOpen={syncManager.state.isPreviewOpen}
        syncType="odoo"
        entityType={syncManager.state.currentEntityType || ''}
        onConfirm={(config) => handleSyncConfirmed({ ...config, entityType: syncManager.state.currentEntityType })}
        onCancel={() => syncManager.closePreview()}
      />

      {/* Progress Tracker */}
      {syncManager.state.jobId && (
        <ProgressTracker
          jobId={syncManager.state.jobId}
          syncType="odoo"
          entityType={syncManager.state.currentEntityType || ''}
          isVisible={syncManager.state.isProgressVisible}
          onComplete={(status) => {
            syncManager.hideProgress();
            toast({
              title: status === 'completed' ? 'Sync Completed' : 'Sync Failed',
              description: status === 'completed' ? 'All items synced successfully' : 'Check the error details above',
            });
          }}
          onCancel={() => syncManager.hideProgress()}
        />
      )}
    </SelfContainedLayout>
  );
}
