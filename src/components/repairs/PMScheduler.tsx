'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { PreventiveMaintenance } from '@/types/repairs';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

export function PMScheduler() {
  const { toast } = useToast();
  const [duePMs, setDuePMs] = useState<PreventiveMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDuePMs();
  }, []);

  const fetchDuePMs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/repairs/preventive-maintenance?due_days_ahead=30');
      const result = await response.json();
      if (result.success) {
        setDuePMs(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching PM schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const overduePMs = duePMs.filter(
    (pm) => new Date(pm.next_due_date) < new Date()
  );
  const upcomingPMs = duePMs.filter(
    (pm) => new Date(pm.next_due_date) >= new Date()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preventive Maintenance Schedule</CardTitle>
        <CardDescription>Upcoming and overdue maintenance</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {overduePMs.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <h3 className="font-semibold text-red-600">Overdue ({overduePMs.length})</h3>
                </div>
                <div className="space-y-2">
                  {overduePMs.map((pm) => (
                    <div
                      key={pm.pm_id}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                    >
                      <div>
                        <p className="font-medium">Equipment ID: {pm.equipment_id.substring(0, 8)}...</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(pm.next_due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="destructive">Overdue</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingPMs.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold">Upcoming ({upcomingPMs.length})</h3>
                </div>
                <div className="space-y-2">
                  {upcomingPMs.slice(0, 10).map((pm) => (
                    <div
                      key={pm.pm_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">Equipment ID: {pm.equipment_id.substring(0, 8)}...</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(pm.next_due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{pm.pm_type || 'Scheduled'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {duePMs.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No preventive maintenance scheduled
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

