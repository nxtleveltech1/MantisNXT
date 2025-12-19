'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, MapPin, Star, Package, Clock, Search } from 'lucide-react';
import { CourierProviderService } from '@/lib/services/logistics/CourierProviderService';
import { CourierProvider } from '@/types/logistics';

export default function CouriersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courierProviders, setCourierProviders] = useState<CourierProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourierProviders();
  }, []);

  const fetchCourierProviders = async () => {
    try {
      setLoading(true);
      // Note: This currently fetches courier providers (services like PostNet, FastWay)
      // In a full implementation, you might have a separate "courier drivers" table
      // For now, we'll use mock data for individual courier drivers
      const response = await fetch('/api/v1/logistics/courier-providers');
      const result = await response.json();
      if (result.success) {
        setCourierProviders(result.data);
      }
    } catch (error) {
      console.error('Error fetching courier providers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for individual courier drivers
  // TODO: In future, this should come from a separate courier_drivers table
  const couriers = [
    {
      id: 'COU-001',
      name: 'Thabo Mthembu',
      phone: '+27 82 123 4567',
      email: 'thabo.mthembu@courier.co.za',
      status: 'available',
      currentLocation: 'Johannesburg CBD',
      rating: 4.8,
      totalDeliveries: 347,
      activeDeliveries: 0,
      vehicleType: 'Motorcycle',
      licensePlate: 'GP 123 ABC',
      joinedDate: '2023-01-15',
    },
    {
      id: 'COU-002',
      name: 'Nomsa Dlamini',
      phone: '+27 83 987 6543',
      email: 'nomsa.dlamini@courier.co.za',
      status: 'busy',
      currentLocation: 'Cape Town City Centre',
      rating: 4.9,
      totalDeliveries: 412,
      activeDeliveries: 2,
      vehicleType: 'Van',
      licensePlate: 'WP 456 DEF',
      joinedDate: '2022-11-08',
    },
    {
      id: 'COU-003',
      name: 'Pieter van der Merwe',
      phone: '+27 84 765 4321',
      email: 'pieter.vandermerwe@courier.co.za',
      status: 'offline',
      currentLocation: 'Durban North',
      rating: 4.6,
      totalDeliveries: 289,
      activeDeliveries: 0,
      vehicleType: 'Bicycle',
      licensePlate: 'KZN 789 GHI',
      joinedDate: '2023-03-22',
    },
    {
      id: 'COU-004',
      name: 'Lerato Molefe',
      phone: '+27 85 654 3210',
      email: 'lerato.molefe@courier.co.za',
      status: 'available',
      currentLocation: 'Sandton Business District',
      rating: 4.7,
      totalDeliveries: 256,
      activeDeliveries: 0,
      vehicleType: 'Car',
      licensePlate: 'GP 321 JKL',
      joinedDate: '2023-05-10',
    },
    {
      id: 'COU-005',
      name: 'Ahmed Hassan',
      phone: '+27 86 543 2109',
      email: 'ahmed.hassan@courier.co.za',
      status: 'busy',
      currentLocation: 'Cape Town - Woodstock',
      rating: 4.8,
      totalDeliveries: 198,
      activeDeliveries: 1,
      vehicleType: 'Scooter',
      licensePlate: 'WP 654 MNO',
      joinedDate: '2023-07-18',
    },
    {
      id: 'COU-006',
      name: 'Sipho Ndlovu',
      phone: '+27 87 432 1098',
      email: 'sipho.ndlovu@courier.co.za',
      status: 'available',
      currentLocation: 'Pretoria Central',
      rating: 4.5,
      totalDeliveries: 167,
      activeDeliveries: 0,
      vehicleType: 'Motorcycle',
      licensePlate: 'GP 987 PQR',
      joinedDate: '2023-09-05',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'busy':
        return <Badge className="bg-blue-100 text-blue-800">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    return <Package className="h-4 w-4" />;
  };

  const filteredCouriers = couriers.filter(
    (courier) =>
      courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courier.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courier.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading couriers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Courier Management</h1>
              <p className="text-gray-600">Manage your delivery team</p>
            </div>
            <Button>Add New Courier</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search couriers by name, ID, or vehicle type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Couriers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCouriers.map((courier) => (
            <Card key={courier.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={`/placeholder.svg?height=40&width=40`} />
                      <AvatarFallback>
                        {courier.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{courier.name}</CardTitle>
                      <CardDescription>{courier.id}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(courier.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{courier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{courier.currentLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {getVehicleIcon(courier.vehicleType)}
                    <span>
                      {courier.vehicleType} - {courier.licensePlate}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-semibold">{courier.rating}</span>
                    </div>
                    <p className="text-xs text-gray-600">Rating</p>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{courier.totalDeliveries}</div>
                    <p className="text-xs text-gray-600">Total Deliveries</p>
                  </div>
                </div>

                {/* Active Deliveries */}
                {courier.activeDeliveries > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        {courier.activeDeliveries} Active Deliveries
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                    View Details
                  </Button>
                  <Button size="sm" className="flex-1">
                    Assign Delivery
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCouriers.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No couriers found matching your search.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}



