'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Package, Truck, CheckCircle, Clock, Wifi } from 'lucide-react';

interface DeliveryStatusWidgetProps {
  deliveryIds?: string[];
}

export function DeliveryStatusWidget({ deliveryIds = [] }: DeliveryStatusWidgetProps) {
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, any>>({});
  const [liveCount, setLiveCount] = useState(0);

  const { isConnected, sendMessage, simulateMessage } = useWebSocket('/api/v1/logistics/websocket', {
    onMessage: (message) => {
      if (message.type === 'STATUS_UPDATE' && message.data?.deliveryId) {
        setDeliveryStatuses((prev) => ({
          ...prev,
          [message.data.deliveryId]: {
            ...prev[message.data.deliveryId],
            status: message.data.status,
            lastUpdate: new Date().toISOString(),
          },
        }));
      }
    },
    onConnect: () => {
      // Subscribe to all delivery updates
      deliveryIds.forEach((id) => {
        sendMessage({
          type: 'SUBSCRIBE_DELIVERY',
          data: { deliveryId: id },
        });
      });
    },
  });

  useEffect(() => {
    // Count live deliveries
    const live = Object.values(deliveryStatuses).filter(
      (status: any) => status?.status === 'in_transit'
    ).length;
    setLiveCount(live);
  }, [deliveryStatuses]);

  // Demo: Simulate status changes
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (deliveryIds.length > 0 && Math.random() > 0.8) {
        const randomId = deliveryIds[Math.floor(Math.random() * deliveryIds.length)];
        const statuses = ['pending', 'in_transit', 'out_for_delivery', 'delivered'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        simulateMessage({
          type: 'STATUS_UPDATE',
          data: {
            deliveryId: randomId,
            status: randomStatus,
            message: `Status updated to ${randomStatus}`,
          },
        });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isConnected, deliveryIds, simulateMessage]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_transit':
      case 'out_for_delivery':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Live Delivery Status</span>
          <div className="flex items-center gap-2">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{liveCount}</div>
            <div className="text-xs text-gray-600">Live Tracking</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Object.keys(deliveryStatuses).length}</div>
            <div className="text-xs text-gray-600">Total Monitored</div>
          </div>
        </div>

        {Object.entries(deliveryStatuses).length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(deliveryStatuses).map(([deliveryId, status]: [string, any]) => (
              <div key={deliveryId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <span className="font-mono text-xs">{deliveryId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {status.status}
                  </Badge>
                  {status.status === 'in_transit' && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(deliveryStatuses).length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">No live deliveries to monitor</div>
        )}
      </CardContent>
    </Card>
  );
}








