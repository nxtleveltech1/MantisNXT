'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Filter, MapPin, Clock, User } from 'lucide-react';
import Link from 'next/link';
import type { Delivery } from '@/types/logistics';

export default function DeliveriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/v1/logistics/deliveries?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setDeliveries(result.data);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
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
      case 'pickup':
      case 'picked_up':
        return <Badge className="bg-orange-100 text-orange-800">Pickup</Badge>;
      case 'out_for_delivery':
        return <Badge className="bg-purple-100 text-purple-800">Out for Delivery</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      searchTerm === '' ||
      delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
              <p className="text-gray-600">Manage and track all deliveries</p>
            </div>
            <Link href="/logistics/deliveries/new">
              <Button>
                <Package className="h-4 w-4 mr-2" />
                New Delivery
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by delivery number, customer, or tracking number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries List */}
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">Loading deliveries...</div>
            </CardContent>
          </Card>
        ) : filteredDeliveries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">No deliveries found</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDeliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{delivery.delivery_number}</span>
                            {getStatusBadge(delivery.status)}
                            {delivery.tracking_number && (
                              <Badge variant="outline" className="text-xs">
                                {delivery.tracking_number}
                              </Badge>
                            )}
                          </div>
                          {delivery.customer_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <User className="h-3 w-3" />
                              <span>{delivery.customer_name}</span>
                              {delivery.customer_phone && <span>• {delivery.customer_phone}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Pickup</div>
                            <div className="text-gray-600">
                              {typeof delivery.pickup_address === 'object'
                                ? delivery.pickup_address.formatted || JSON.stringify(delivery.pickup_address)
                                : delivery.pickup_address}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Delivery</div>
                            <div className="text-gray-600">
                              {typeof delivery.delivery_address === 'object'
                                ? delivery.delivery_address.formatted || JSON.stringify(delivery.delivery_address)
                                : delivery.delivery_address}
                            </div>
                          </div>
                        </div>
                      </div>

                      {delivery.estimated_delivery_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                          <Clock className="h-3 w-3" />
                          <span>ETA: {new Date(delivery.estimated_delivery_date).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/logistics/deliveries/${delivery.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      {delivery.tracking_number && (
                        <Link href={`/logistics/tracking/${delivery.tracking_number}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Track
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

