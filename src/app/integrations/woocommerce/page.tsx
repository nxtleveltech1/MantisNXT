"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, RefreshCw, Settings, History, AlertCircle, CheckCircle2, Package, ShoppingCart, Users, Save, TestTube2 } from "lucide-react";
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

  useEffect(() => {
    fetchConfiguration();
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

  const handleSync = async (entityType: string) => {
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

      // CRITICAL FIX: Get real organization ID from API
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

      if (data.success) {
        toast({
          title: "Sync Completed",
          description: data.message || `${entityType} sync has been completed successfully.`,
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

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
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
                    Ready to import
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleSync('orders')}
                    disabled={config.status !== 'active'}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Import Now
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
        </Tabs>
      </div>
    </SelfContainedLayout>
  );
}
