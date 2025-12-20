'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Package,
  ShoppingCart,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  created_at: string;
}

interface ChannelCardProps {
  channel: SalesChannel;
  onRefresh: () => void;
}

export function ChannelCard({ channel, onRefresh }: ChannelCardProps) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);

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

  const getStatusBadge = () => {
    if (!channel.is_active) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }

    switch (channel.sync_status) {
      case 'syncing':
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            Syncing
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await fetch(`/api/v1/sales-channels/${channel.id}/test-connection`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success && result.connected) {
        toast.success('Connection test successful');
        onRefresh();
      } else {
        toast.error(result.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{channel.name}</CardTitle>
              <CardDescription className="mt-1">
                {getChannelTypeLabel(channel.channel_type)}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/sales-channels/${channel.id}`)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/sales-channels/${channel.id}/products`)}>
                <Package className="mr-2 h-4 w-4" />
                Products
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/sales-channels/${channel.id}/orders`)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Orders
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTestConnection} disabled={testing}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Test Connection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          <Badge variant="outline">{channel.sync_method}</Badge>
        </div>

        {channel.error_message && (
          <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {channel.error_message}
          </div>
        )}

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Last Product Sync:</span>
            <span>{formatDate(channel.last_sync_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Order Sync:</span>
            <span>{formatDate(channel.last_order_sync_at)}</span>
          </div>
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={() => router.push(`/sales-channels/${channel.id}`)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

