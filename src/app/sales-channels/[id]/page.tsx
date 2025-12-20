'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, Package, ShoppingCart, Boxes, ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChannelConfigForm } from '@/components/sales-channels/ChannelConfigForm';
import { ProductMappingTable } from '@/components/sales-channels/ProductMappingTable';
import { StockAllocationManager } from '@/components/sales-channels/StockAllocationManager';
import { ChannelOrdersList } from '@/components/sales-channels/ChannelOrdersList';
import { toast } from 'sonner';

interface SalesChannel {
  id: string;
  channel_type: 'woocommerce' | 'whatsapp' | 'facebook' | 'instagram' | 'tiktok';
  name: string;
  is_active: boolean;
  sync_method: 'webhook' | 'polling' | 'both';
  sync_status: 'idle' | 'syncing' | 'error';
  last_sync_at?: string | null;
  last_order_sync_at?: string | null;
  error_message?: string | null;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.id as string;
  const [channel, setChannel] = useState<SalesChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (channelId) {
      fetchChannel();
    }
  }, [channelId]);

  const fetchChannel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales-channels/${channelId}`);
      const result = await response.json();

      if (result.success) {
        setChannel(result.data);
      } else {
        toast.error('Failed to fetch channel');
        router.push('/sales-channels');
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
      toast.error('Error loading channel');
      router.push('/sales-channels');
    } finally {
      setLoading(false);
    }
  };

  const getChannelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      woocommerce: 'WooCommerce',
      whatsapp: 'WhatsApp',
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!channel) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{channel.name}</h1>
              <p className="text-muted-foreground">
                {getChannelTypeLabel(channel.channel_type)} Sales Channel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={channel.is_active ? 'default' : 'secondary'}>
              {channel.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={channel.sync_status === 'error' ? 'destructive' : 'outline'}>
              {channel.sync_status}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Settings className="mr-2 h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Boxes className="mr-2 h-4 w-4" />
              Stock Allocation
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ChannelConfigForm channelId={channelId} onSuccess={fetchChannel} />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductMappingTable channelId={channelId} />
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <StockAllocationManager channelId={channelId} />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <ChannelOrdersList channelId={channelId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

