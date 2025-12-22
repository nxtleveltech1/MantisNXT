'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Reservation } from '@/types/rentals';

export default function ReservationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchReservations();
  }, [statusFilter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/rentals/reservations?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setReservations(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load reservations',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reservations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(
    (reservation) =>
      reservation.reservation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.event_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const breadcrumbs = [{ label: 'Rentals', href: '/rentals' }, { label: 'Reservations' }];

  return (
    <AppLayout title="Reservations" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <Button onClick={() => router.push('/rentals/reservations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Reservation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reservation List</CardTitle>
            <CardDescription>Manage rental reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reservations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="picked_up">Picked Up</option>
                <option value="active">Active</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reservation #</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rental Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No reservations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservations.map((reservation) => (
                      <TableRow key={reservation.reservation_id}>
                        <TableCell className="font-medium">
                          {reservation.reservation_number}
                        </TableCell>
                        <TableCell>{reservation.event_name || '-'}</TableCell>
                        <TableCell>{reservation.customer_id.substring(0, 8)}...</TableCell>
                        <TableCell>
                          {formatDate(reservation.rental_start_date)} -{' '}
                          {formatDate(reservation.rental_end_date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              reservation.status === 'active'
                                ? 'default'
                                : reservation.status === 'returned'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {reservation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/rentals/reservations/${reservation.reservation_id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

