'use client';

import React from 'react';
import {
  Plus,
  Plug,
  ShoppingBag,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function IntegrationsPage() {
  // This would fetch from API in production
  const integrations = [
    {
      id: '1',
      name: 'WooCommerce Store',
      provider: 'woocommerce',
      status: 'active',
      lastSync: '2024-11-02T10:30:00Z',
      syncFrequency: 60,
      stats: {
        productsSync: 247,
        ordersSync: 156,
        errors: 0,
      },
    },
    {
      id: '2',
      name: 'Odoo Production',
      provider: 'odoo',
      status: 'active',
      lastSync: '2024-11-02T09:15:00Z',
      syncFrequency: 30,
      stats: {
        inventorySync: 189,
        suppliersSync: 45,
        errors: 2,
      },
    },
  ];

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'woocommerce':
        return <ShoppingBag className="h-5 w-5" />;
      case 'odoo':
        return <Database className="h-5 w-5" />;
      default:
        return <Plug className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'configuring':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      error: 'destructive',
      configuring: 'secondary',
      inactive: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatLastSync = (lastSync: string) => {
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  return (
    <AppLayout title="System Integrations" breadcrumbs={[{ label: 'Integrations' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Connect and sync MantisNXT with external systems
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Integration
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="/integrations/woocommerce" className="cursor-pointer">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  WooCommerce
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/integrations/odoo" className="cursor-pointer">
                  <Database className="mr-2 h-4 w-4" />
                  Odoo ERP
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
              <Plug className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === 'active').length}
              </div>
              <p className="text-muted-foreground text-xs">of {integrations.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
              <Clock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-muted-foreground text-xs">records synced</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.8%</div>
              <p className="text-muted-foreground text-xs">across all integrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-muted-foreground text-xs">require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Integration Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {integrations.map(integration => (
            <Card key={integration.id} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      {getProviderIcon(integration.provider)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        {getStatusIcon(integration.status)}
                        <span>Last sync {formatLastSync(integration.lastSync)}</span>
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Sync Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(integration.stats).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-muted-foreground text-sm">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Sync Frequency */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Sync every </span>
                    <span className="font-medium">{integration.syncFrequency} minutes</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/integrations/${integration.provider}`}>Manage</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Integration Card */}
          {integrations.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plug className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">No integrations yet</h3>
                <p className="text-muted-foreground mb-4 text-center text-sm">
                  Connect your first external system to start syncing data
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Integration
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem asChild>
                      <a href="/integrations/woocommerce">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        WooCommerce
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/integrations/odoo">
                        <Database className="mr-2 h-4 w-4" />
                        Odoo ERP
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
            <CardDescription>
              Latest synchronization operations across all integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  entity: 'Products',
                  operation: 'Sync',
                  count: 45,
                  status: 'completed',
                  time: '2 min ago',
                  integration: 'WooCommerce Store',
                },
                {
                  entity: 'Inventory',
                  operation: 'Update',
                  count: 12,
                  status: 'completed',
                  time: '15 min ago',
                  integration: 'Odoo Production',
                },
                {
                  entity: 'Orders',
                  operation: 'Import',
                  count: 8,
                  status: 'completed',
                  time: '32 min ago',
                  integration: 'WooCommerce Store',
                },
                {
                  entity: 'Suppliers',
                  operation: 'Sync',
                  count: 3,
                  status: 'failed',
                  time: '1 hour ago',
                  integration: 'Odoo Production',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b py-2 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {activity.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {activity.operation} {activity.count} {activity.entity}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {activity.integration} • {activity.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant={activity.status === 'completed' ? 'default' : 'destructive'}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
