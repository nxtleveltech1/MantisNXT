'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { useWebSocket } from '@/hooks/useWebSocket';
import { MapPin, Package, Route, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface Courier {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'delivering' | 'pickup' | 'available' | 'offline';
  currentDelivery?: string;
  eta?: string;
  route?: { lat: number; lng: number }[];
  speed?: number;
  heading?: number;
}

interface Delivery {
  id: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  status: string;
  courierId?: string;
}

export function CourierMapAdvanced() {
  const [couriers, setCouriers] = useState<Courier[]>([
    {
      id: 'COU-001',
      name: 'Thabo Mthembu',
      lat: -26.2041,
      lng: 28.0473, // Johannesburg CBD
      status: 'delivering',
      currentDelivery: 'DEL-001',
      eta: '25 min',
      speed: 35,
      heading: 45,
      route: [
        { lat: -26.2041, lng: 28.0473 }, // Johannesburg CBD
        { lat: -26.1367, lng: 28.0835 }, // Sandton
        { lat: -26.1076, lng: 28.0567 }, // Rosebank
      ],
    },
    {
      id: 'COU-002',
      name: 'Nomsa Dlamini',
      lat: -33.9249,
      lng: 18.4241, // Cape Town City Centre
      status: 'pickup',
      currentDelivery: 'DEL-002',
      eta: '15 min',
      speed: 28,
      heading: 180,
    },
    {
      id: 'COU-003',
      name: 'Pieter van der Merwe',
      lat: -29.8587,
      lng: 31.0218, // Durban
      status: 'available',
      speed: 0,
      heading: 0,
    },
    {
      id: 'COU-004',
      name: 'Lerato Molefe',
      lat: -26.1367,
      lng: 28.0835, // Sandton
      status: 'delivering',
      currentDelivery: 'DEL-003',
      eta: '18 min',
      speed: 42,
      heading: 90,
    },
    {
      id: 'COU-005',
      name: 'Ahmed Hassan',
      lat: -33.9588,
      lng: 18.4695, // Cape Town - Woodstock
      status: 'pickup',
      currentDelivery: 'DEL-004',
      eta: '12 min',
      speed: 25,
      heading: 270,
    },
    {
      id: 'COU-006',
      name: 'Sipho Ndlovu',
      lat: -25.7479,
      lng: 28.2293, // Pretoria
      status: 'available',
      speed: 0,
      heading: 0,
    },
  ]);

  const [deliveries] = useState<Delivery[]>([
    {
      id: 'DEL-001',
      pickupLat: -26.2041,
      pickupLng: 28.0473, // Johannesburg CBD
      deliveryLat: -26.1367,
      deliveryLng: 28.0835, // Sandton
      status: 'in_transit',
      courierId: 'COU-001',
    },
    {
      id: 'DEL-002',
      pickupLat: -33.9249,
      pickupLng: 18.4241, // Cape Town City Centre
      deliveryLat: -33.9588,
      deliveryLng: 18.4695, // Woodstock
      status: 'pickup',
      courierId: 'COU-002',
    },
    {
      id: 'DEL-003',
      pickupLat: -26.1076,
      pickupLng: 28.0567, // Rosebank
      deliveryLat: -26.1445,
      deliveryLng: 28.0181, // Melville
      status: 'in_transit',
      courierId: 'COU-004',
    },
    {
      id: 'DEL-004',
      pickupLat: -33.9588,
      pickupLng: 18.4695, // Woodstock
      deliveryLat: -33.9352,
      deliveryLng: 18.3758, // Sea Point
      status: 'pickup',
      courierId: 'COU-005',
    },
  ]);

  const [selectedCourier, setSelectedCourier] = useState<string>('all');
  const [showRoutes, setShowRoutes] = useState(true);
  const [showDeliveries, setShowDeliveries] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: -26.2041, lng: 28.0473 });

  const markersRef = useRef<google.maps.Marker[]>([]);
  const routesRef = useRef<google.maps.Polyline[]>([]);
  const deliveryMarkersRef = useRef<google.maps.Marker[]>([]);

  const { isConnected, simulateMessage } = useWebSocket('/api/v1/logistics/websocket', {
    onMessage: (message) => {
      if (message.type === 'LOCATION_UPDATE') {
        updateCourierLocation(message.data);
      }
    },
  });

  // Simulate real-time location updates
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      couriers.forEach((courier) => {
        if (courier.status !== 'offline') {
          // Simulate movement along route or random movement
          const newLat = courier.lat + (Math.random() - 0.5) * 0.002;
          const newLng = courier.lng + (Math.random() - 0.5) * 0.002;

          simulateMessage({
            type: 'LOCATION_UPDATE',
            data: {
              courierId: courier.id,
              lat: newLat,
              lng: newLng,
              speed: courier.speed! + (Math.random() - 0.5) * 5,
              heading: courier.heading! + (Math.random() - 0.5) * 20,
              timestamp: new Date().toISOString(),
            },
          });
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected, couriers, simulateMessage]);

  const updateCourierLocation = (data: any) => {
    setCouriers((prev) =>
      prev.map((courier) =>
        courier.id === data.courierId
          ? {
              ...courier,
              lat: data.lat,
              lng: data.lng,
              speed: data.speed,
              heading: data.heading,
            }
          : courier
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivering':
        return '#3B82F6'; // blue
      case 'pickup':
        return '#F59E0B'; // orange
      case 'available':
        return '#10B981'; // green
      case 'offline':
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivering':
        return '🚚';
      case 'pickup':
        return '📦';
      case 'available':
        return '✅';
      case 'offline':
        return '⭕';
      default:
        return '📍';
    }
  };

  const createCourierMarkers = (map: google.maps.Map) => {
    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const filteredCouriers =
      selectedCourier === 'all' ? couriers : couriers.filter((c) => c.id === selectedCourier);

    filteredCouriers.forEach((courier) => {
      const marker = new google.maps.Marker({
        position: { lat: courier.lat, lng: courier.lng },
        map: map,
        title: courier.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: getStatusColor(courier.status),
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        zIndex: 1000,
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold">${courier.name}</h3>
            <p class="text-sm text-gray-600">Status: ${courier.status}</p>
            ${courier.currentDelivery ? `<p class="text-sm">Delivery: ${courier.currentDelivery}</p>` : ''}
            ${courier.eta ? `<p class="text-sm">ETA: ${courier.eta}</p>` : ''}
            ${courier.speed ? `<p class="text-sm">Speed: ${courier.speed} km/h</p>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  };

  const createRoutes = (map: google.maps.Map) => {
    if (!showRoutes) return;

    // Clear existing routes
    routesRef.current.forEach((route) => route.setMap(null));
    routesRef.current = [];

    const filteredCouriers =
      selectedCourier === 'all' ? couriers : couriers.filter((c) => c.id === selectedCourier);

    filteredCouriers.forEach((courier) => {
      if (courier.route && courier.route.length > 1) {
        const polyline = new google.maps.Polyline({
          path: courier.route,
          geodesic: true,
          strokeColor: getStatusColor(courier.status),
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: map,
        });

        routesRef.current.push(polyline);
      }
    });
  };

  const createDeliveryMarkers = (map: google.maps.Map) => {
    if (!showDeliveries) return;

    // Clear existing delivery markers
    deliveryMarkersRef.current.forEach((marker) => marker.setMap(null));
    deliveryMarkersRef.current = [];

    deliveries.forEach((delivery) => {
      // Pickup marker
      const pickupMarker = new google.maps.Marker({
        position: { lat: delivery.pickupLat, lng: delivery.pickupLng },
        map: map,
        title: `Pickup - ${delivery.id}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      // Delivery marker
      const deliveryMarker = new google.maps.Marker({
        position: { lat: delivery.deliveryLat, lng: delivery.deliveryLng },
        map: map,
        title: `Delivery - ${delivery.id}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      deliveryMarkersRef.current.push(pickupMarker, deliveryMarker);
    });
  };

  const centerOnCourier = (courierId: string) => {
    const courier = couriers.find((c) => c.id === courierId);
    if (courier) {
      setMapCenter({ lat: courier.lat, lng: courier.lng });
    }
  };

  const fitMapToBounds = (map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds();

    couriers.forEach((courier) => {
      bounds.extend({ lat: courier.lat, lng: courier.lng });
    });

    deliveries.forEach((delivery) => {
      bounds.extend({ lat: delivery.pickupLat, lng: delivery.pickupLng });
      bounds.extend({ lat: delivery.deliveryLat, lng: delivery.deliveryLng });
    });

    map.fitBounds(bounds);
  };

  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (map) {
      createCourierMarkers(map);
      createRoutes(map);
      createDeliveryMarkers(map);
    }
  }, [map, couriers, selectedCourier, showRoutes, showDeliveries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Courier Tracking</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Live GPS' : 'Offline'}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>Real-time Google Maps integration with live courier tracking</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Map Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={selectedCourier} onValueChange={setSelectedCourier}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select courier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Couriers</SelectItem>
              {couriers.map((courier) => (
                <SelectItem key={courier.id} value={courier.id}>
                  {courier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRoutes(!showRoutes)}
            className={showRoutes ? 'bg-blue-50' : ''}
          >
            <Route className="h-4 w-4 mr-2" />
            {showRoutes ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Routes
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeliveries(!showDeliveries)}
            className={showDeliveries ? 'bg-green-50' : ''}
          >
            <Package className="h-4 w-4 mr-2" />
            {showDeliveries ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Deliveries
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Google Maps */}
        <GoogleMapsWrapper center={mapCenter} zoom={13} className="w-full h-96 mb-4" onLoad={setMap} />

        {/* Map Legend */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Delivering</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Offline</span>
          </div>
        </div>

        {/* Courier List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Active Couriers</h4>
            <span className="text-xs text-gray-600">
              {couriers.filter((c) => c.status !== 'offline').length} of {couriers.length} online
            </span>
          </div>

          {couriers.map((courier) => (
            <div key={courier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: getStatusColor(courier.status) }}
                >
                  {getStatusIcon(courier.status)}
                </div>
                <div>
                  <p className="font-medium text-sm">{courier.name}</p>
                  <p className="text-xs text-gray-600">
                    {courier.lat.toFixed(4)}, {courier.lng.toFixed(4)}
                  </p>
                  {courier.speed && (
                    <p className="text-xs text-gray-500">Speed: {courier.speed.toFixed(0)} km/h</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: `${getStatusColor(courier.status)}20`,
                    borderColor: getStatusColor(courier.status),
                  }}
                >
                  {courier.status}
                </Badge>
                {courier.currentDelivery && (
                  <p className="text-xs text-gray-600 mt-1">
                    {courier.currentDelivery} • ETA: {courier.eta}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-6 px-2 text-xs"
                  onClick={() => centerOnCourier(courier.id)}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Center
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Map Actions */}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            <span onClick={() => map && fitMapToBounds(map)}>Fit All</span>
          </Button>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            Export Data
          </Button>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            Full Screen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}



