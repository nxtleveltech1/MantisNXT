'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/hooks/useWebSocket';
import { MapPin, Clock, Package, User, Wifi, WifiOff } from 'lucide-react';

interface LiveTrackingProps {
  deliveryId: string;
  initialData?: any;
}

interface LocationUpdate {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

interface DeliveryUpdate {
  status: string;
  location?: LocationUpdate;
  estimatedArrival?: string;
  courierName?: string;
  message?: string;
}

export function LiveTracking({ deliveryId, initialData }: LiveTrackingProps) {
  const [deliveryData, setDeliveryData] = useState(initialData);
  const [updates, setUpdates] = useState<DeliveryUpdate[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);

  const { isConnected, connectionStatus, sendMessage } = useWebSocket(
    '/api/v1/logistics/websocket',
    {
      deliveryId, // Pass deliveryId in options for SSE filtering
      onMessage: (message) => {
        handleWebSocketMessage(message);
      },
      onConnect: () => {
        // Subscribe to delivery updates
        sendMessage({
          type: 'SUBSCRIBE_DELIVERY',
          data: { deliveryId },
        });
      },
    }
  );

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'LOCATION_UPDATE':
        if (message.data.deliveryId === deliveryId) {
          setCurrentLocation(message.data.location);
          setUpdates((prev) => [
            ...prev,
            {
              status: 'location_update',
              location: message.data.location,
              courierName: message.data.courier,
              message: `Courier is at ${message.data.location.address}`,
            },
          ]);
        }
        break;

      case 'STATUS_UPDATE':
        if (message.data.deliveryId === deliveryId) {
          setDeliveryData((prev) => ({
            ...prev,
            status: message.data.status,
          }));
          setUpdates((prev) => [
            ...prev,
            {
              status: message.data.status,
              message: message.data.message,
              estimatedArrival: message.data.estimatedArrival,
            },
          ]);
        }
        break;
    }
  };

  // Demo: Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && Math.random() > 0.7) {
        // Simulate location update with SA coordinates
        simulateMessage({
          type: 'LOCATION_UPDATE',
          data: {
            deliveryId,
            location: {
              lat: -26.2041 + (Math.random() - 0.5) * 0.01,
              lng: 28.0473 + (Math.random() - 0.5) * 0.01,
              address: `${Math.floor(Math.random() * 999)} Commissioner St, Johannesburg`,
              timestamp: new Date().toISOString(),
            },
            courier: deliveryData?.courier || 'Demo Courier',
          },
        });
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isConnected, deliveryId, simulateMessage, deliveryData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">Live Tracking: {connectionStatus}</span>
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Delivery Status</span>
            <Badge className={getStatusColor(deliveryData?.status)}>
              {deliveryData?.status?.replace('_', ' ').toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>Real-time delivery tracking for {deliveryId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deliveryData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Courier: {deliveryData.courier}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Package: {deliveryData.packageType}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">ETA: {deliveryData.estimatedTime}</span>
              </div>
              {currentLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Current: {currentLocation.address}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Live Updates</CardTitle>
          <CardDescription>Real-time delivery progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {updates.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Waiting for live updates...</p>
            ) : (
              updates
                .slice()
                .reverse()
                .map((update, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {update.status === 'location_update' ? (
                        <MapPin className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {update.message || `Status updated to ${update.status}`}
                      </p>
                      {update.location && (
                        <p className="text-xs text-gray-600">Location: {update.location.address}</p>
                      )}
                      {update.estimatedArrival && (
                        <p className="text-xs text-gray-600">ETA: {update.estimatedArrival}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>Simulate real-time updates for testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                simulateMessage({
                  type: 'STATUS_UPDATE',
                  data: {
                    deliveryId,
                    status: 'out_for_delivery',
                    message: 'Package is out for delivery',
                    estimatedArrival: '2:30 PM',
                  },
                })
              }
            >
              Simulate: Out for Delivery
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                simulateMessage({
                  type: 'LOCATION_UPDATE',
                  data: {
                    deliveryId,
                    location: {
                      lat: -26.1367,
                      lng: 28.0835,
                      address: 'Sandton City, Johannesburg',
                      timestamp: new Date().toISOString(),
                    },
                    courier: 'Demo Courier',
                  },
                })
              }
            >
              Simulate: Location Update
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                simulateMessage({
                  type: 'STATUS_UPDATE',
                  data: {
                    deliveryId,
                    status: 'delivered',
                    message: 'Package delivered successfully',
                  },
                })
              }
            >
              Simulate: Delivered
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

