"use client";

import React, { useState, useEffect } from "react";
import { Database, RefreshCw, Settings, History, AlertCircle, CheckCircle2, Package, ShoppingCart, Users, Save, TestTube2, FileText } from "lucide-react";
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

  useEffect(() => {
    fetchConfiguration();
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
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Odoo ERP server.",
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
                    placeholder="https://your-odoo-server.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Odoo server URL (e.g., https://example.odoo.com)
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
                    The name of your Odoo database
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleSync('products')}
                    disabled={config.status !== 'active'}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Sync Now
                  </Button>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleSync('orders')}
                    disabled={config.status !== 'active'}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Sync Now
                  </Button>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleSync('customers')}
                    disabled={config.status !== 'active'}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Sync Now
                  </Button>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleSync('invoices')}
                    disabled={config.status !== 'active'}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Sync Now
                  </Button>
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
      </div>
    </SelfContainedLayout>
  );
}
