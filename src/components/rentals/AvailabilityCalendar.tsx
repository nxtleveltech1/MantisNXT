'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import type { Reservation } from '@/types/rentals';

interface AvailabilityCalendarProps {
  equipmentId: string;
}

export function AvailabilityCalendar({ equipmentId }: AvailabilityCalendarProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, [equipmentId]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rentals/reservations?limit=100`);
      const result = await response.json();
      if (result.success) {
        const filtered = (result.data || []).filter((r: Reservation) =>
          r.status !== 'cancelled' && r.status !== 'returned'
        );
        setReservations(filtered);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const conflicting = reservations.some(
      (r) =>
        dateStr >= r.rental_start_date &&
        dateStr <= r.rental_end_date &&
        r.status !== 'cancelled'
    );
    return conflicting ? 'unavailable' : 'available';
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading calendar...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Calendar</CardTitle>
        <CardDescription>Equipment availability over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          className="rounded-md border"
          modifiers={{
            unavailable: (date) => getDateStatus(date) === 'unavailable',
          }}
          modifiersClassNames={{
            unavailable: 'bg-red-100 text-red-800',
          }}
        />
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-100" />
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-100" />
            <span className="text-sm">Unavailable</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

