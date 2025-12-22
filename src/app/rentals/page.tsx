'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Plus, Package, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Reservation, Equipment } from '@/types/rentals';

export default function RentalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEquipment: 0,
    availableEquipment: 0,
    activeRentals: 0,
    pendingReservations: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch active reservations
      const reservationsRes = await fetch('/api/rentals/reservations?status=active&limit=10');
      const reservationsData = await reservationsRes.json();
      if (reservationsData.success) {
        setActiveReservations(reservationsData.data || []);
      }

      // Fetch available equipment
      const equipmentRes = await fetch('/api/rentals/equipment?availability_status=available&limit=10');
      const equipmentData = await equipmentRes.json();
      if (equipmentData.success) {
        setAvailableEquipment(equipmentData.data || []);
      }

      // Fetch stats
      const statsRes = await fetch('/api/rentals/equipment');
      const statsData = await statsRes.json();
      if (statsData.success) {
        const allEquipment = statsData.data || [];
        setStats({
          totalEquipment: allEquipment.length,
          availableEquipment: allEquipment.filter((e: Equipment) => e.availability_status === 'available').length,
          activeRentals: activeReservations.length,
          pendingReservations: 0, // TODO: fetch pending count
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [{ label: 'Rentals' }];

  return (
    <AppLayout title="AV Equipment Rentals" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">AV Equipment Rentals</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/rentals/equipment/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
            <Button onClick={() => router.push('/rentals/reservations/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Reservation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEquipment}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableEquipment}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRentals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReservations}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active Rentals</CardTitle>
                  <CardDescription>Currently rented equipment</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeReservations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active rentals</p>
                  ) : (
                    <div className="space-y-2">
                      {activeReservations.map((reservation) => (
                        <div
                          key={reservation.reservation_id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium">{reservation.reservation_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {reservation.event_name || 'No event name'}
                            </p>
                          </div>
                          <Badge>{reservation.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Equipment</CardTitle>
                  <CardDescription>Ready to rent</CardDescription>
                </CardHeader>
                <CardContent>
                  {availableEquipment.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No available equipment</p>
                  ) : (
                    <div className="space-y-2">
                      {availableEquipment.map((equipment) => (
                        <div
                          key={equipment.equipment_id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium">{equipment.name}</p>
                            <p className="text-sm text-muted-foreground">{equipment.equipment_type}</p>
                          </div>
                          <Badge variant="outline">{equipment.availability_status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Catalog</CardTitle>
                <CardDescription>Manage your AV equipment inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/rentals/equipment')}>
                  View All Equipment
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle>Reservations</CardTitle>
                <CardDescription>Manage rental reservations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/rentals/reservations')}>
                  View All Reservations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

