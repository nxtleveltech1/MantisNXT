'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RepairTimeline } from '@/types/repairs';
import { Clock, CheckCircle2, Wrench, AlertCircle } from 'lucide-react';

interface RepairTimelineProps {
  repairOrderId: string;
}

export function RepairTimeline({ repairOrderId }: RepairTimelineProps) {
  const [timeline, setTimeline] = useState<RepairTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [repairOrderId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      // This would fetch from an API endpoint
      // For now, we'll use the repair order detail endpoint
      const response = await fetch(`/api/repairs/orders/${repairOrderId}`);
      const result = await response.json();
      if (result.success) {
        // Timeline would come from a separate endpoint
        // Placeholder for now
        setTimeline([]);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'waiting_parts':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading timeline...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repair Timeline</CardTitle>
        <CardDescription>Status history and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline entries yet</p>
        ) : (
          <div className="space-y-4">
            {timeline.map((entry) => (
              <div key={entry.timeline_id} className="flex items-start gap-4">
                <div className="mt-1">{getStatusIcon(entry.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{entry.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.updated_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="mt-1 text-sm">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

