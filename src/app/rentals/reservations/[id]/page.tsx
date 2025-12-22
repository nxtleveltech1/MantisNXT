'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Package, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Reservation, ReservationItem } from '@/types/rentals';

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const reservationId = params?.id as string;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reservationId) {
      fetchReservation();
    }
  }, [reservationId]);

  const fetchReservation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rentals/reservations/${reservationId}`);
      const result = await response.json();

      if (result.success) {
        setReservation(result.data);
        setItems(result.data.items || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load reservation',
          variant: 'destructive',
        });
        router.push('/rentals/reservations');
      }
    } catch (error) {
      console.error('Error fetching reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reservation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await fetch(`/api/rentals/reservations/${reservationId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_type: 'pickup',
          actual_datetime: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Equipment checked out successfully',
        });
        fetchReservation();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to checkout equipment',
        variant: 'destructive',
      });
    }
  };

  const handleCheckin = async () => {
    try {
      const response = await fetch(`/api/rentals/reservations/${reservationId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_type: 'return',
          actual_datetime: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Equipment checked in successfully',
        });
        fetchReservation();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to checkin equipment',
        variant: 'destructive',
      });
    }
  };

  if (loading || !reservation) {
    return (
      <AppLayout title="Reservation Details" breadcrumbs={[]}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const breadcrumbs = [
    { label: 'Rentals', href: '/rentals' },
    { label: 'Reservations', href: '/rentals/reservations' },
    { label: reservation.reservation_number },
  ];

  return (
    <AppLayout title={`Reservation ${reservation.reservation_number}`} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {reservation.reservation_number}
              </h1>
              <p className="text-muted-foreground">{reservation.event_name || 'No event name'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {reservation.status === 'confirmed' && (
              <Button onClick={handleCheckout}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Checkout
              </Button>
            )}
            {reservation.status === 'active' && (
              <Button onClick={handleCheckin} variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Checkin
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="text-lg">{reservation.status}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(reservation.security_deposit_amount)}
              </div>
              <p className="text-sm text-muted-foreground">
                Paid: {formatCurrency(reservation.security_deposit_paid)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Equipment Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(reservation.total_equipment_value)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="agreement">Agreement</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reservation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rental Period</p>
                    <p className="text-lg">
                      {formatDate(reservation.rental_start_date)} -{' '}
                      {formatDate(reservation.rental_end_date)}
                    </p>
                  </div>
                  {reservation.event_date_start && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Event Dates</p>
                      <p className="text-lg">
                        {formatDate(reservation.event_date_start)} -{' '}
                        {formatDate(reservation.event_date_end)}
                      </p>
                    </div>
                  )}
                  {reservation.pickup_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pickup Date</p>
                      <p className="text-lg">{formatDate(reservation.pickup_date)}</p>
                    </div>
                  )}
                  {reservation.return_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Return Date</p>
                      <p className="text-lg">{formatDate(reservation.return_date)}</p>
                    </div>
                  )}
                </div>
                {reservation.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{reservation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipment</CardTitle>
                <CardDescription>Equipment included in this reservation</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No equipment items</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.reservation_item_id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">Equipment ID: {item.equipment_id.substring(0, 8)}...</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × {formatCurrency(item.rental_rate)}/day
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.line_total)}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.rental_period_days} days
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agreement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rental Agreement</CardTitle>
                <CardDescription>Legal agreement and terms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Agreement Status</span>
                    <Badge variant="outline">Not Generated</Badge>
                  </div>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Agreement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

