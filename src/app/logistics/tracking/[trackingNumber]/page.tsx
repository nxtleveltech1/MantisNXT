'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LiveTracking } from '@/components/logistics/LiveTracking';
import { ArrowLeft, Package, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

interface TrackingPageProps {
  params: Promise<{ trackingNumber: string }>;
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    params.then((p) => {
      if (isMounted) {
        setTrackingNumber(p.trackingNumber);
        fetchTrackingData(p.trackingNumber);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [params]);

  const fetchTrackingData = async (trackNum: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find delivery by tracking number
      const response = await fetch(`/api/v1/logistics/deliveries?tracking_number=${encodeURIComponent(trackNum)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const delivery = result.data[0];

        // Get tracking history
        try {
          const trackResponse = await fetch(`/api/v1/logistics/deliveries/${delivery.id}/track`);
          const trackResult = await trackResponse.json();

          if (trackResult.success) {
            setTrackingData({
              delivery,
              tracking_history: trackResult.data?.tracking_history || [],
            });
          } else {
            setTrackingData({ delivery, tracking_history: [] });
          }
        } catch (trackErr) {
          console.error('Error fetching tracking history:', trackErr);
          // Still show delivery info even if history fails
          setTrackingData({ delivery, tracking_history: [] });
        }
      } else {
        setError(`No tracking information found for tracking number: ${trackNum}`);
      }
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracking data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout
        title="Tracking"
        breadcrumbs={[
          { label: 'Courier Logistics', href: '/logistics/dashboard' },
          { label: 'Tracking' },
        ]}
      >
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading tracking information...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !trackingData) {
    return (
      <AppLayout
        title="Tracking"
        breadcrumbs={[
          { label: 'Courier Logistics', href: '/logistics/dashboard' },
          { label: 'Tracking' },
        ]}
      >
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tracking Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || `No tracking information found for ${trackingNumber}`}
            </p>
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

  const delivery = trackingData.delivery;
  const history = trackingData.tracking_history || [];

  return (
    <AppLayout
      title="Live Tracking"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Tracking', href: '/logistics/tracking' },
        { label: trackingNumber },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tracking Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tracking Details</CardTitle>
                <CardDescription>Package information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">Tracking Number</span>
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{delivery.tracking_number}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">Delivery Address</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {typeof delivery.delivery_address === 'object'
                      ? delivery.delivery_address.formatted || JSON.stringify(delivery.delivery_address)
                      : delivery.delivery_address}
                  </p>
                </div>

                {delivery.estimated_delivery_date && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">Estimated Delivery</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(delivery.estimated_delivery_date).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tracking History */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking History</CardTitle>
                <CardDescription>Package journey timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No tracking history yet</p>
                  ) : (
                    history.map((event: any, index: number) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{event.status}</p>
                          {event.location_address && (
                            <p className="text-xs text-gray-600">{event.location_address}</p>
                          )}
                          {event.notes && <p className="text-xs text-gray-600">{event.notes}</p>}
                          <p className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Tracking */}
          <div className="lg:col-span-2">
            <LiveTracking
              deliveryId={delivery.id}
              initialData={{
                status: delivery.status,
                courier: delivery.courier_provider_id || 'Courier Provider',
                packageType: delivery.package_type || 'Package',
                estimatedTime: delivery.estimated_delivery_date
                  ? new Date(delivery.estimated_delivery_date).toLocaleTimeString()
                  : 'TBD',
              }}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
