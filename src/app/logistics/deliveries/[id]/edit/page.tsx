'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Delivery } from '@/types/logistics';

interface DeliveryEditPageProps {
  params: Promise<{ id: string }>;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function DeliveryEditPage({ params }: DeliveryEditPageProps) {
  const router = useRouter();
  const [deliveryId, setDeliveryId] = useState<string>('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [costActual, setCostActual] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [actualPickupDate, setActualPickupDate] = useState('');
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');

  useEffect(() => {
    let mounted = true;
    params.then((p) => {
      if (!mounted) return;
      setDeliveryId(p.id);
      void load(p.id);
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  const breadcrumbs = useMemo(() => {
    return [
      { label: 'Courier Logistics', href: '/logistics/dashboard' },
      { label: 'Deliveries', href: '/logistics/deliveries' },
      { label: delivery?.delivery_number ?? 'Delivery', href: deliveryId ? `/logistics/deliveries/${deliveryId}` : undefined },
      { label: 'Edit' },
    ];
  }, [delivery?.delivery_number, deliveryId]);

  const load = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/logistics/deliveries/${id}`);
      const json = await res.json();
      if (!json?.success) {
        toast.error(json?.error || 'Failed to load delivery');
        router.push('/logistics/deliveries');
        return;
      }
      const d: Delivery = json.data;
      setDelivery(d);

      setTrackingNumber(d.tracking_number ?? '');
      setCostActual(d.cost_actual != null ? String(d.cost_actual) : '');
      setEstimatedDeliveryDate(toDateTimeLocal(d.estimated_delivery_date ?? null));
      setActualPickupDate(toDateTimeLocal(d.actual_pickup_date ?? null));
      setActualDeliveryDate(toDateTimeLocal(d.actual_delivery_date ?? null));
    } catch (error) {
      console.error('Error loading delivery:', error);
      toast.error('Error loading delivery');
      router.push('/logistics/deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!deliveryId) return;
    try {
      setSaving(true);

      const payload = {
        tracking_number: trackingNumber.trim() ? trackingNumber.trim() : null,
        cost_actual: costActual.trim() ? Number(costActual) : null,
        estimated_delivery_date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null,
        actual_pickup_date: actualPickupDate ? new Date(actualPickupDate).toISOString() : null,
        actual_delivery_date: actualDeliveryDate ? new Date(actualDeliveryDate).toISOString() : null,
      };

      const res = await fetch(`/api/v1/logistics/deliveries/${deliveryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success('Delivery updated');
        router.push(`/logistics/deliveries/${deliveryId}`);
      } else {
        toast.error(json?.error || 'Failed to update delivery');
      }
    } catch (error) {
      console.error('Error saving delivery:', error);
      toast.error('Error saving delivery');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Edit Delivery" breadcrumbs={breadcrumbs}>
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="py-10 text-center text-muted-foreground">Loading…</div>
          </CardContent>
        </Card>
      ) : !delivery ? (
        <Card>
          <CardContent className="pt-6">
            <div className="py-10 text-center text-muted-foreground">Delivery not found</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Edit {delivery.delivery_number}</h1>
              <p className="text-muted-foreground">
                Update tracking, costs, and dates. (Addresses/items editing is not yet supported.)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/logistics/deliveries/${deliveryId}`)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
              <CardDescription>Fields that can be updated after creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tracking_number">Tracking Number</Label>
                  <Input
                    id="tracking_number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. PN123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_actual">Actual Cost (ZAR)</Label>
                  <Input
                    id="cost_actual"
                    inputMode="decimal"
                    value={costActual}
                    onChange={(e) => setCostActual(e.target.value)}
                    placeholder="e.g. 125.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_delivery_date">Estimated Delivery Date</Label>
                  <Input
                    id="estimated_delivery_date"
                    type="datetime-local"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_pickup_date">Actual Pickup Date</Label>
                  <Input
                    id="actual_pickup_date"
                    type="datetime-local"
                    value={actualPickupDate}
                    onChange={(e) => setActualPickupDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_delivery_date">Actual Delivery Date</Label>
                  <Input
                    id="actual_delivery_date"
                    type="datetime-local"
                    value={actualDeliveryDate}
                    onChange={(e) => setActualDeliveryDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}


