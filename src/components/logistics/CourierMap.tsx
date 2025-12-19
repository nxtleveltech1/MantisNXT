'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Truck, Package } from 'lucide-react';

export function CourierMap() {
  const [couriers, setCouriers] = useState([
    {
      id: 'COU-001',
      name: 'Mike Johnson',
      lat: -26.2041,
      lng: 28.0473,
      status: 'delivering',
      currentDelivery: 'DEL-001',
      eta: '15 min',
    },
    {
      id: 'COU-002',
      name: 'Lisa Chen',
      lat: -26.1367,
      lng: 28.0835,
      status: 'pickup',
      currentDelivery: 'DEL-002',
      eta: '8 min',
    },
    {
      id: 'COU-003',
      name: 'David Rodriguez',
      lat: -26.1076,
      lng: 28.0567,
      status: 'available',
      currentDelivery: null,
      eta: null,
    },
  ]);

  // Simulate courier movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCouriers((prev) =>
        prev.map((courier) => ({
          ...courier,
          lat: courier.lat + (Math.random() - 0.5) * 0.001,
          lng: courier.lng + (Math.random() - 0.5) * 0.001,
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivering':
        return 'bg-blue-100 text-blue-800';
      case 'pickup':
        return 'bg-orange-100 text-orange-800';
      case 'available':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivering':
        return <Package className="h-4 w-4" />;
      case 'pickup':
        return <Navigation className="h-4 w-4" />;
      case 'available':
        return <Truck className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Courier Tracking</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Real-time</span>
          </div>
        </CardTitle>
        <CardDescription>Track courier locations and delivery progress</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Map Placeholder */}
        <div className="h-96 bg-gray-100 rounded-lg relative overflow-hidden mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Interactive map would be displayed here</p>
              <p className="text-sm text-gray-500">Integration with Google Maps, Mapbox, or similar</p>
            </div>
          </div>

          {/* Simulated courier markers */}
          {couriers.map((courier, index) => (
            <div
              key={courier.id}
              className="absolute w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse"
              style={{
                left: `${20 + index * 25}%`,
                top: `${30 + index * 15}%`,
              }}
            >
              {courier.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
          ))}
        </div>

        {/* Courier List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Active Couriers</h4>
          {couriers.map((courier) => (
            <div key={courier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(courier.status)}
                <div>
                  <p className="font-medium text-sm">{courier.name}</p>
                  <p className="text-xs text-gray-600">
                    {courier.lat.toFixed(4)}, {courier.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(courier.status)} variant="outline">
                  {courier.status}
                </Badge>
                {courier.currentDelivery && (
                  <p className="text-xs text-gray-600 mt-1">
                    {courier.currentDelivery} • ETA: {courier.eta}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            Refresh Map
          </Button>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            Center View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}






