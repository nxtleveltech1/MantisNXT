'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Truck,
  DollarSign,
  ArrowLeft,
  Edit,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Delivery } from '@/types/logistics';

interface DeliveryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DeliveryDetailPage({ params }: DeliveryDetailPageProps) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryId, setDeliveryId] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    params.then((p) => {
      if (isMounted) {
        setDeliveryId(p.id);
        fetchDelivery(p.id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [params]);

  const fetchDelivery = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/logistics/deliveries/${id}`);
      const result = await response.json();

      if (result.success) {
        setDelivery(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch delivery');
        router.push('/logistics/deliveries');
      }
    } catch (error) {
      console.error('Error fetching delivery:', error);
      toast.error('Error loading delivery');
      router.push('/logistics/deliveries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: Delivery['status']) => {
    if (!deliveryId) return;
    try {
      setStatusUpdating(true);
      const response = await fetch(`/api/v1/logistics/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Status updated');
        fetchDelivery(deliveryId);
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const cancelDelivery = async () => {
    if (!delivery) return;
    const ok = window.confirm(`Cancel delivery ${delivery.delivery_number}?`);
    if (!ok) return;
    await updateStatus('cancelled');
  };

  const deleteDelivery = async () => {
    if (!delivery) return;
    const ok = window.confirm(`Delete delivery ${delivery.delivery_number}? This cannot be undone.`);
    if (!ok) return;
    try {
      const response = await fetch(`/api/v1/logistics/deliveries/${deliveryId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Delivery deleted');
        router.push('/logistics/deliveries');
      } else {
        toast.error(result.error || 'Failed to delete delivery');
      }
    } catch (error) {
      console.error('Error deleting delivery:', error);
      toast.error('Error deleting delivery');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-100 text-blue-800">In Transit</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-yellow-100 text-yellow-800">Confirmed</Badge>;
      case 'picked_up':
        return <Badge className="bg-orange-100 text-orange-800">Picked Up</Badge>;
      case 'out_for_delivery':
        return <Badge className="bg-purple-100 text-purple-800">Out for Delivery</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      case 'returned':
        return <Badge className="bg-red-100 text-red-800">Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AppLayout
        title="Delivery Details"
        breadcrumbs={[
          { label: 'Courier Logistics', href: '/logistics/dashboard' },
          { label: 'Deliveries', href: '/logistics/deliveries' },
          { label: 'Details' },
        ]}
      >
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading delivery details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!delivery) {
    return (
      <AppLayout
        title="Delivery Not Found"
        breadcrumbs={[
          { label: 'Courier Logistics', href: '/logistics/dashboard' },
          { label: 'Deliveries', href: '/logistics/deliveries' },
        ]}
      >
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Delivery Not Found</h2>
            <p className="text-gray-600 mb-4">The delivery you're looking for doesn't exist.</p>
            <Link href="/logistics/deliveries">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Deliveries
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const formatAddress = (address: unknown) => {
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address !== null) {
      const maybeFormatted = (address as { formatted?: unknown }).formatted;
      if (typeof maybeFormatted === 'string' && maybeFormatted.trim()) return maybeFormatted;
      try {
        return JSON.stringify(address);
      } catch {
        return 'Address';
      }
    }
    return 'N/A';
  };

  return (
    <AppLayout
      title={`Delivery ${delivery.delivery_number}`}
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Deliveries', href: '/logistics/deliveries' },
        { label: delivery.delivery_number },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/logistics/deliveries">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Delivery {delivery.delivery_number}</h1>
                {getStatusBadge(delivery.status)}
              </div>
              {delivery.tracking_number && (
                <p className="text-muted-foreground mt-1 font-mono text-sm">
                  Tracking: {delivery.tracking_number}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="min-w-[220px]">
              <Select
                value={delivery.status}
                onValueChange={(v) => void updateStatus(v as Delivery['status'])}
                disabled={statusUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="confirmed">confirmed</SelectItem>
                  <SelectItem value="picked_up">picked_up</SelectItem>
                  <SelectItem value="in_transit">in_transit</SelectItem>
                  <SelectItem value="out_for_delivery">out_for_delivery</SelectItem>
                  <SelectItem value="delivered">delivered</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                  <SelectItem value="cancelled">cancelled</SelectItem>
                  <SelectItem value="returned">returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {delivery.tracking_number && (
              <Link href={`/logistics/tracking/${delivery.tracking_number}`}>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Track
                </Button>
              </Link>
            )}
            <Link href={`/logistics/deliveries/${deliveryId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            {delivery.status !== 'cancelled' && delivery.status !== 'delivered' ? (
              <Button variant="outline" onClick={() => void cancelDelivery()} disabled={statusUpdating}>
                Cancel Delivery
              </Button>
            ) : null}
            <Button variant="destructive" onClick={() => void deleteDelivery()}>
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {delivery.customer_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-base">{delivery.customer_name}</p>
                  </div>
                )}
                {delivery.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-base">{delivery.customer_phone}</p>
                  </div>
                )}
                {delivery.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-base">{delivery.customer_email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    Pickup Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{formatAddress(delivery.pickup_address)}</p>
                  {delivery.pickup_contact_name && (
                    <p className="text-sm text-gray-600 mt-2">
                      Contact: {delivery.pickup_contact_name}
                      {delivery.pickup_contact_phone && ` • ${delivery.pickup_contact_phone}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-green-600" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{formatAddress(delivery.delivery_address)}</p>
                  {delivery.delivery_contact_name && (
                    <p className="text-sm text-gray-600 mt-2">
                      Contact: {delivery.delivery_contact_name}
                      {delivery.delivery_contact_phone && ` • ${delivery.delivery_contact_phone}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Package Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Package Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {delivery.package_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="text-base">{delivery.package_type}</p>
                    </div>
                  )}
                  {delivery.weight_kg && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Weight</p>
                      <p className="text-base">{delivery.weight_kg} kg</p>
                    </div>
                  )}
                  {delivery.dimensions_length_cm && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Dimensions</p>
                      <p className="text-base">
                        {delivery.dimensions_length_cm} × {delivery.dimensions_width_cm || '?'} ×{' '}
                        {delivery.dimensions_height_cm || '?'} cm
                      </p>
                    </div>
                  )}
                  {delivery.declared_value && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Declared Value</p>
                      <p className="text-base">
                        {delivery.currency || 'ZAR'} {delivery.declared_value.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {delivery.requires_signature && (
                    <Badge variant="outline">Requires Signature</Badge>
                  )}
                  {delivery.is_fragile && <Badge variant="outline">Fragile</Badge>}
                  {delivery.is_insured && <Badge variant="outline">Insured</Badge>}
                  {delivery.is_dropshipping && <Badge variant="outline">Dropshipping</Badge>}
                </div>
                {delivery.special_instructions && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Special Instructions</p>
                    <p className="text-sm">{delivery.special_instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Status</p>
                  <div className="mt-1">{getStatusBadge(delivery.status)}</div>
                </div>
                {delivery.requested_pickup_date && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-500">Requested Pickup</p>
                    </div>
                    <p className="text-sm">
                      {new Date(delivery.requested_pickup_date).toLocaleString()}
                    </p>
                  </div>
                )}
                {delivery.estimated_delivery_date && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-500">Estimated Delivery</p>
                    </div>
                    <p className="text-sm">
                      {new Date(delivery.estimated_delivery_date).toLocaleString()}
                    </p>
                  </div>
                )}
                {delivery.requested_delivery_date && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-500">Requested Delivery</p>
                    </div>
                    <p className="text-sm">
                      {new Date(delivery.requested_delivery_date).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Courier Provider */}
            {delivery.courier_provider_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Courier Provider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Provider ID: {delivery.courier_provider_id}</p>
                  {delivery.tracking_number && (
                    <p className="text-sm text-gray-600 mt-2">
                      Tracking: {delivery.tracking_number}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cost Information */}
            {(delivery.cost_quoted || delivery.cost_actual) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {delivery.cost_quoted && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Quoted Cost</p>
                      <p className="text-base">
                        {delivery.currency || 'ZAR'} {delivery.cost_quoted.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {delivery.cost_actual && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Actual Cost</p>
                      <p className="text-base">
                        {delivery.currency || 'ZAR'} {delivery.cost_actual.toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Links */}
            {(delivery.quotation_id || delivery.sales_order_id) && (
              <Card>
                <CardHeader>
                  <CardTitle>Related Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {delivery.quotation_id && (
                    <Link href={`/sales/quotations/${delivery.quotation_id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Quotation
                      </Button>
                    </Link>
                  )}
                  {delivery.sales_order_id && (
                    <Link href={`/sales/sales-orders/${delivery.sales_order_id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Sales Order
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}


