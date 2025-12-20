'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, RefreshCw, Store, CheckCircle2, XCircle, Clock } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChannelCard } from '@/components/sales-channels/ChannelCard';

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

export default function SalesChannelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const filterChannel = searchParams.get('channel');

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const url = filterChannel
        ? `/api/v1/sales-channels?channel_type=${filterChannel}`
        : '/api/v1/sales-channels';
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setChannels(result.data || []);
      } else {
        toast.error('Failed to fetch sales channels');
      }
    } catch (error) {
      console.error('Error fetching sales channels:', error);
      toast.error('Error loading sales channels');
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.channel_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Channels</h1>
            <p className="text-muted-foreground">Manage your sales channel integrations</p>
          </div>
          <Button onClick={() => router.push('/sales-channels/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Channel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Channels</CardTitle>
                <CardDescription>
                  {filterChannel
                    ? `Viewing ${getChannelTypeLabel(filterChannel)} channels`
                    : 'View and manage all sales channels'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search channels..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-64 pl-8"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchChannels}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Store className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No channels found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Get started by adding your first sales channel'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/sales-channels/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Channel
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChannels.map(channel => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onRefresh={fetchChannels}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

