'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, TestTube, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const channelConfigSchema = z.object({
  channel_type: z.enum(['woocommerce', 'whatsapp', 'facebook', 'instagram', 'tiktok']),
  name: z.string().min(1, 'Name is required').max(200),
  is_active: z.boolean().default(true),
  sync_method: z.enum(['webhook', 'polling', 'both']).default('polling'),
  sync_interval_minutes: z.number().int().positive().default(15),
  webhook_url: z.string().url().optional().nullable(),
  webhook_secret: z.string().optional().nullable(),
  stock_allocation_type: z.enum(['reserved', 'virtual', 'both']).default('virtual'),
  auto_sync_products: z.boolean().default(false),
  auto_sync_orders: z.boolean().default(true),
  // Channel-specific API config
  api_url: z.string().url().optional(),
  consumer_key: z.string().optional(),
  consumer_secret: z.string().optional(),
  access_token: z.string().optional(),
  phone_number_id: z.string().optional(),
  business_account_id: z.string().optional(),
  page_id: z.string().optional(),
  instagram_business_account_id: z.string().optional(),
  app_key: z.string().optional(),
  app_secret: z.string().optional(),
  shop_id: z.string().optional(),
});

type ChannelConfigFormValues = z.infer<typeof channelConfigSchema>;

interface ChannelConfigFormProps {
  channelId?: string;
  onSuccess?: () => void;
}

export function ChannelConfigForm({ channelId, onSuccess }: ChannelConfigFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [channel, setChannel] = useState<any>(null);

  const form = useForm<ChannelConfigFormValues>({
    resolver: zodResolver(channelConfigSchema),
    defaultValues: {
      channel_type: 'woocommerce',
      name: '',
      is_active: true,
      sync_method: 'polling',
      sync_interval_minutes: 15,
      webhook_url: null,
      webhook_secret: null,
      stock_allocation_type: 'virtual',
      auto_sync_products: false,
      auto_sync_orders: true,
    },
  });

  const channelType = form.watch('channel_type');

  useEffect(() => {
    if (channelId) {
      fetchChannel();
    }
  }, [channelId]);

  const fetchChannel = async () => {
    try {
      const response = await fetch(`/api/v1/sales-channels/${channelId}`);
      const result = await response.json();

      if (result.success) {
        const channelData = result.data;
        setChannel(channelData);
        const apiConfig = channelData.api_config || {};

        form.reset({
          channel_type: channelData.channel_type,
          name: channelData.name,
          is_active: channelData.is_active,
          sync_method: channelData.sync_method,
          sync_interval_minutes: channelData.sync_interval_minutes,
          webhook_url: channelData.webhook_url,
          webhook_secret: channelData.webhook_secret,
          stock_allocation_type: channelData.stock_allocation_type,
          auto_sync_products: channelData.auto_sync_products,
          auto_sync_orders: channelData.auto_sync_orders,
          ...apiConfig,
        });
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
      toast.error('Failed to load channel configuration');
    }
  };

  const onSubmit = async (data: ChannelConfigFormValues) => {
    try {
      setLoading(true);

      // Build API config based on channel type
      const apiConfig: Record<string, unknown> = {};
      
      if (data.channel_type === 'woocommerce') {
        apiConfig.api_url = data.api_url;
        apiConfig.consumer_key = data.consumer_key;
        apiConfig.consumer_secret = data.consumer_secret;
      } else if (data.channel_type === 'whatsapp') {
        apiConfig.access_token = data.access_token;
        apiConfig.phone_number_id = data.phone_number_id;
        apiConfig.business_account_id = data.business_account_id;
      } else if (data.channel_type === 'facebook') {
        apiConfig.access_token = data.access_token;
        apiConfig.page_id = data.page_id;
      } else if (data.channel_type === 'instagram') {
        apiConfig.access_token = data.access_token;
        apiConfig.instagram_business_account_id = data.instagram_business_account_id;
        apiConfig.page_id = data.page_id;
      } else if (data.channel_type === 'tiktok') {
        apiConfig.access_token = data.access_token;
        apiConfig.app_key = data.app_key;
        apiConfig.app_secret = data.app_secret;
        apiConfig.shop_id = data.shop_id;
      }

      const payload = {
        channel_type: data.channel_type,
        name: data.name,
        is_active: data.is_active,
        sync_method: data.sync_method,
        sync_interval_minutes: data.sync_interval_minutes,
        webhook_url: data.webhook_url || null,
        webhook_secret: data.webhook_secret || null,
        api_config: apiConfig,
        stock_allocation_type: data.stock_allocation_type,
        auto_sync_products: data.auto_sync_products,
        auto_sync_orders: data.auto_sync_orders,
      };

      const url = channelId
        ? `/api/v1/sales-channels/${channelId}`
        : '/api/v1/sales-channels';
      const method = channelId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(channelId ? 'Channel updated successfully' : 'Channel created successfully');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/sales-channels/${result.data.id}`);
        }
      } else {
        toast.error(result.error || 'Failed to save channel');
      }
    } catch (error) {
      console.error('Error saving channel:', error);
      toast.error('Failed to save channel configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!channelId) {
      toast.error('Please save the channel first before testing');
      return;
    }

    try {
      setTesting(true);
      const response = await fetch(`/api/v1/sales-channels/${channelId}/test-connection`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success && result.connected) {
        toast.success('Connection test successful');
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

  const renderChannelSpecificFields = () => {
    switch (channelType) {
      case 'woocommerce':
        return (
          <>
            <FormField
              control={form.control}
              name="api_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/wp-json/wc/v3"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Your WooCommerce store REST API URL</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consumer_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumer Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="ck_..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consumer_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumer Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="cs_..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'whatsapp':
        return (
          <>
            <FormField
              control={form.control}
              name="access_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="EAA..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="business_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Account ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'facebook':
        return (
          <>
            <FormField
              control={form.control}
              name="access_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="EAA..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="page_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'instagram':
        return (
          <>
            <FormField
              control={form.control}
              name="access_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="EAA..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagram_business_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram Business Account ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="page_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'tiktok':
        return (
          <>
            <FormField
              control={form.control}
              name="access_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="app_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Key</FormLabel>
                  <FormControl>
                    <Input placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="app_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shop_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop ID</FormLabel>
                  <FormControl>
                    <Input placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {channelId ? 'Edit Channel' : 'New Sales Channel'}
            </h2>
            <p className="text-muted-foreground">
              Configure your sales channel integration
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {channelId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
              >
                <TestTube className="mr-2 h-4 w-4" />
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sync">Sync Settings</TabsTrigger>
            <TabsTrigger value="api">API Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Channel identification and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="channel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!channelId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select channel type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="woocommerce">WooCommerce</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My WooCommerce Store" {...field} />
                      </FormControl>
                      <FormDescription>A friendly name for this channel</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable or disable this channel
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock_allocation_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Allocation Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="virtual">Virtual (Soft Allocation)</SelectItem>
                          <SelectItem value="reserved">Reserved (Dedicated Stock)</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How stock should be allocated to this channel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sync Configuration</CardTitle>
                <CardDescription>Configure how orders and products are synchronized</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="sync_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="polling">Polling</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How to receive order updates from this channel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sync_interval_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Interval (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormDescription>
                        How often to poll for new orders (polling method only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="webhook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://your-domain.com/api/v1/sales-channels/{id}/webhook"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        URL for receiving webhook notifications (webhook method only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="webhook_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Secret</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Secret key" {...field} />
                      </FormControl>
                      <FormDescription>
                        Secret key for validating webhook requests
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="auto_sync_products"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto Sync Products</FormLabel>
                        <FormDescription>
                          Automatically sync product changes to this channel
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="auto_sync_orders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto Sync Orders</FormLabel>
                        <FormDescription>
                          Automatically fetch and process orders from this channel
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Channel-specific API credentials and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderChannelSpecificFields()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : channelId ? 'Update Channel' : 'Create Channel'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

