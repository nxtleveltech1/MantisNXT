'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ReportsData = {
  totals: { total: number; delivered: number; active: number; cancelled: number };
  byStatus: Array<{ status: string; count: number }>;
  byProvider: Array<{ provider_name: string; count: number }>;
};

export default function LogisticsReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/logistics/reports');
      const json = await res.json();
      if (json?.success) {
        setData(json.data);
      } else {
        toast.error(json?.error || 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppLayout
      title="Courier Logistics Reports"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Reports' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Real delivery totals grouped by status and provider</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="py-10 text-center text-muted-foreground">Loading reports…</div>
            </CardContent>
          </Card>
        ) : !data ? (
          <Card>
            <CardContent className="pt-6">
              <div className="py-10 text-center text-muted-foreground">No report data available</div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totals.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totals.active}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totals.delivered}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totals.cancelled}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>By Status</CardTitle>
                  <CardDescription>Counts grouped by delivery status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.byStatus.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No deliveries found</div>
                  ) : (
                    data.byStatus.map((row) => (
                      <div key={row.status} className="flex items-center justify-between">
                        <Badge variant="outline">{row.status}</Badge>
                        <div className="font-mono text-sm">{row.count}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>By Provider</CardTitle>
                  <CardDescription>Counts grouped by courier provider</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.byProvider.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No deliveries found</div>
                  ) : (
                    data.byProvider.map((row) => (
                      <div key={row.provider_name} className="flex items-center justify-between">
                        <div className="truncate text-sm">{row.provider_name}</div>
                        <div className="font-mono text-sm">{row.count}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}


