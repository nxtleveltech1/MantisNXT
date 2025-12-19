'use client';

import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { CourierProvider } from '@/types/logistics';
import type { LogisticsSettings } from '@/lib/services/logistics';

type PickupAddressForm = NonNullable<LogisticsSettings['pickup_address']>;

const emptyPickup: PickupAddressForm = {
  formatted: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  country: '',
};

export default function LogisticsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<CourierProvider[]>([]);

  const [pickup, setPickup] = useState<PickupAddressForm>(emptyPickup);
  const [defaultServiceTier, setDefaultServiceTier] = useState<
    'standard' | 'express' | 'urgent' | ''
  >('');
  const [defaultProviderId, setDefaultProviderId] = useState<string>('');
  const [enableLiveTracking, setEnableLiveTracking] = useState(true);

  const hasPickup = useMemo(() => {
    return Boolean(
      pickup.formatted ||
        pickup.street ||
        pickup.city ||
        pickup.province ||
        pickup.postalCode ||
        pickup.country
    );
  }, [pickup]);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [settingsRes, providersRes] = await Promise.all([
        fetch('/api/v1/logistics/settings'),
        fetch('/api/v1/logistics/courier-providers?status=active'),
      ]);

      const settingsJson = await settingsRes.json();
      const providersJson = await providersRes.json();

      if (providersJson?.success) {
        setProviders(providersJson.data ?? []);
      }

      if (!settingsJson?.success) {
        toast.error(settingsJson?.error || 'Failed to load logistics settings');
        return;
      }

      const s: LogisticsSettings = settingsJson.data ?? {};

      setPickup({
        ...emptyPickup,
        ...(s.pickup_address ?? {}),
      });
      setDefaultServiceTier(s.default_service_tier ?? '');
      setDefaultProviderId(s.default_courier_provider_id ?? '');
      setEnableLiveTracking(s.enable_live_tracking ?? true);
    } catch (error) {
      console.error('Error loading logistics settings:', error);
      toast.error('Error loading logistics settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: LogisticsSettings = {
        pickup_address: hasPickup ? pickup : undefined,
        default_service_tier: defaultServiceTier || undefined,
        default_courier_provider_id: defaultProviderId || undefined,
        enable_live_tracking: enableLiveTracking,
      };

      const res = await fetch('/api/v1/logistics/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success('Logistics settings saved');
      } else {
        toast.error(json?.error || 'Failed to save logistics settings');
      }
    } catch (error) {
      console.error('Error saving logistics settings:', error);
      toast.error('Error saving logistics settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="Courier Logistics Settings"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Settings' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Organization-level defaults for delivery creation, quoting, and tracking
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Defaults</CardTitle>
            <CardDescription>Used when creating deliveries and fetching quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Service Tier</Label>
                <Select
                  value={defaultServiceTier}
                  onValueChange={(v) => setDefaultServiceTier(v as typeof defaultServiceTier)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a default tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Courier Provider</Label>
                <Select value={defaultProviderId} onValueChange={setDefaultProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a default provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-medium">Live Tracking</div>
                <div className="text-sm text-muted-foreground">
                  Enables real-time updates in the tracking UI (SSE)
                </div>
              </div>
              <Switch checked={enableLiveTracking} onCheckedChange={setEnableLiveTracking} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Pickup Address</CardTitle>
            <CardDescription>
              Used as the pickup address when a delivery/quote doesn’t specify one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_formatted">Formatted Address</Label>
              <Input
                id="pickup_formatted"
                value={pickup.formatted ?? ''}
                onChange={(e) => setPickup((p) => ({ ...p, formatted: e.target.value }))}
                placeholder="e.g. 123 Main Rd, Sandton, Johannesburg"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup_street">Street</Label>
                <Input
                  id="pickup_street"
                  value={pickup.street ?? ''}
                  onChange={(e) => setPickup((p) => ({ ...p, street: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_city">City</Label>
                <Input
                  id="pickup_city"
                  value={pickup.city ?? ''}
                  onChange={(e) => setPickup((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_province">Province</Label>
                <Input
                  id="pickup_province"
                  value={pickup.province ?? ''}
                  onChange={(e) => setPickup((p) => ({ ...p, province: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_postal">Postal Code</Label>
                <Input
                  id="pickup_postal"
                  value={pickup.postalCode ?? ''}
                  onChange={(e) => setPickup((p) => ({ ...p, postalCode: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_country">Country</Label>
                <Input
                  id="pickup_country"
                  value={pickup.country ?? ''}
                  onChange={(e) => setPickup((p) => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. South Africa"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


