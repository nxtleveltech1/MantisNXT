'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { Route, Navigation, Clock, Zap } from 'lucide-react';

interface RouteStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  type: 'pickup' | 'delivery';
  deliveryId: string;
  estimatedTime: number; // minutes
  priority: 'low' | 'medium' | 'high';
}

interface OptimizedRoute {
  courierId: string;
  courierName: string;
  stops: RouteStop[];
  totalDistance: number;
  totalTime: number;
  efficiency: number;
}

export function DeliveryRoutePlanner() {
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Mock route data with South African locations
  const mockStops: RouteStop[] = [
    {
      id: 'stop-1',
      address: '123 Commissioner St, Johannesburg CBD, 2001',
      lat: -26.2041,
      lng: 28.0473,
      type: 'pickup',
      deliveryId: 'DEL-001',
      estimatedTime: 8,
      priority: 'high',
    },
    {
      id: 'stop-2',
      address: 'Sandton City, Rivonia Rd, Sandton, 2196',
      lat: -26.1367,
      lng: 28.0835,
      type: 'delivery',
      deliveryId: 'DEL-001',
      estimatedTime: 5,
      priority: 'high',
    },
    {
      id: 'stop-3',
      address: 'V&A Waterfront, Cape Town, 8001',
      lat: -33.9022,
      lng: 18.4187,
      type: 'pickup',
      deliveryId: 'DEL-002',
      estimatedTime: 6,
      priority: 'medium',
    },
    {
      id: 'stop-4',
      address: 'Sea Point Promenade, Cape Town, 8005',
      lat: -33.9352,
      lng: 18.3758,
      type: 'delivery',
      deliveryId: 'DEL-002',
      estimatedTime: 4,
      priority: 'medium',
    },
    {
      id: 'stop-5',
      address: 'Gateway Theatre of Shopping, Durban, 4319',
      lat: -29.7674,
      lng: 31.0669,
      type: 'pickup',
      deliveryId: 'DEL-003',
      estimatedTime: 7,
      priority: 'low',
    },
    {
      id: 'stop-6',
      address: 'Durban Beachfront, Marine Parade, 4001',
      lat: -29.8579,
      lng: 31.0292,
      type: 'delivery',
      deliveryId: 'DEL-003',
      estimatedTime: 3,
      priority: 'low',
    },
  ];

  useEffect(() => {
    setRoutes([
      {
        courierId: 'COU-001',
        courierName: 'Thabo Mthembu',
        stops: [mockStops[0], mockStops[1], mockStops[4], mockStops[5]],
        totalDistance: 18.7,
        totalTime: 65,
        efficiency: 94,
      },
      {
        courierId: 'COU-002',
        courierName: 'Nomsa Dlamini',
        stops: [mockStops[2], mockStops[3]],
        totalDistance: 12.3,
        totalTime: 35,
        efficiency: 91,
      },
      {
        courierId: 'COU-004',
        courierName: 'Lerato Molefe',
        stops: [mockStops[0], mockStops[1]],
        totalDistance: 15.2,
        totalTime: 42,
        efficiency: 89,
      },
    ]);
  }, []);

  const optimizeRoutes = async () => {
    setIsOptimizing(true);

    // Simulate route optimization
    setTimeout(() => {
      setRoutes((prev) =>
        prev.map((route) => ({
          ...route,
          efficiency: Math.min(100, route.efficiency + Math.random() * 5),
          totalTime: Math.max(15, route.totalTime - Math.random() * 10),
        }))
      );
      setIsOptimizing(false);
    }, 2000);
  };

  const calculateRoute = async (map: google.maps.Map, route: OptimizedRoute) => {
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3B82F6',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });
      directionsRendererRef.current.setMap(map);
    }

    if (route.stops.length < 2) return;

    const waypoints = route.stops.slice(1, -1).map((stop) => ({
      location: { lat: stop.lat, lng: stop.lng },
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: { lat: route.stops[0].lat, lng: route.stops[0].lng },
      destination: {
        lat: route.stops[route.stops.length - 1].lat,
        lng: route.stops[route.stops.length - 1].lng,
      },
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false,
    };

    try {
      const result = await directionsServiceRef.current.route(request);
      directionsRendererRef.current.setDirections(result);
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStopIcon = (type: string) => {
    return type === 'pickup' ? '📦' : '🏠';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Route List */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Route Optimization</span>
              <Button size="sm" onClick={optimizeRoutes} disabled={isOptimizing}>
                <Zap className="h-4 w-4 mr-2" />
                {isOptimizing ? 'Optimizing...' : 'Optimize'}
              </Button>
            </CardTitle>
            <CardDescription>AI-powered route planning and optimization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {routes.map((route) => (
              <div
                key={route.courierId}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedRoute === route.courierId ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRoute(route.courierId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{route.courierName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {route.efficiency}% efficient
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Route className="h-3 w-3" />
                    <span>{route.totalDistance} km</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{route.totalTime} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {route.stops.map((stop, index) => (
                    <div key={stop.id} className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <span>{getStopIcon(stop.type)}</span>
                      <span className="flex-1 truncate">{stop.address}</span>
                      <Badge className={getPriorityColor(stop.priority)} variant="outline">
                        {stop.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Map View */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Route Visualization</CardTitle>
            <CardDescription>
              {selectedRoute
                ? `Showing route for ${routes.find((r) => r.courierId === selectedRoute)?.courierName}`
                : 'Select a route to view on map'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleMapsWrapper center={{ lat: -26.2041, lng: 28.0473 }} zoom={10} className="w-full h-96">
              {(map, isLoaded) => {
                if (map && isLoaded && selectedRoute) {
                  const route = routes.find((r) => r.courierId === selectedRoute);
                  if (route) {
                    calculateRoute(map, route);
                  }
                }
                return null;
              }}
            </GoogleMapsWrapper>

            {/* Route Details */}
            {selectedRoute && (
              <div className="mt-4">
                {(() => {
                  const route = routes.find((r) => r.courierId === selectedRoute);
                  if (!route) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Route Details</h4>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Navigation className="h-4 w-4 mr-2" />
                            Start Navigation
                          </Button>
                          <Button size="sm" variant="outline">
                            Share Route
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{route.stops.length}</div>
                          <div className="text-xs text-blue-700">Stops</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{route.totalDistance} km</div>
                          <div className="text-xs text-green-700">Distance</div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">{route.totalTime} min</div>
                          <div className="text-xs text-orange-700">Est. Time</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Stop Sequence</h5>
                        {route.stops.map((stop, index) => (
                          <div key={stop.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{stop.address}</p>
                              <p className="text-xs text-gray-600">
                                {stop.type === 'pickup' ? '📦 Pickup' : '🏠 Delivery'} •{stop.deliveryId} • ~
                                {stop.estimatedTime} min
                              </p>
                            </div>
                            <Badge className={getPriorityColor(stop.priority)} variant="outline">
                              {stop.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




