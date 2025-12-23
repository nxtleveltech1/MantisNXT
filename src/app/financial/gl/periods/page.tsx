/**
 * General Ledger - Fiscal Periods Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface FiscalPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  fiscal_year: number;
}

export default function FiscalPeriodsPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeriods() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/gl/periods?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setPeriods(result.data || []);
        } else {
          setPeriods([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching periods:', err);
        setPeriods([]);
        setLoading(false);
      }
    }

    fetchPeriods();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout
      title="Fiscal Periods"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'General Ledger', href: '/financial/gl/accounts' },
        { label: 'Fiscal Periods' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage fiscal periods and year-end closings</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Period
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fiscal Periods</CardTitle>
            <CardDescription>List of accounting periods</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading periods...</div>
            ) : periods.length === 0 ? (
              <div className="text-sm text-muted-foreground">No fiscal periods configured</div>
            ) : (
              <div className="space-y-2">
                {periods.map((period) => (
                  <div key={period.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{period.name}</div>
                      <div className="text-sm text-muted-foreground">
                        FY {period.fiscal_year} | {new Date(period.start_date).toLocaleDateString()} -{' '}
                        {new Date(period.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(period.status)}`}>
                      {period.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

