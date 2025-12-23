/**
 * Budget - Forecasts Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Forecast {
  id: string;
  name: string;
  period: string;
  status: string;
  created_at: string;
  total_revenue: number;
  total_expenses: number;
}

export default function BudgetForecastsPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecasts() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/budget/forecasts?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setForecasts(result.data || []);
        } else {
          setForecasts([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching forecasts:', err);
        setForecasts([]);
        setLoading(false);
      }
    }

    fetchForecasts();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout
      title="Budget Forecasts"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Budget', href: '/financial/budget/versions' },
        { label: 'Forecasts' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Create and manage budget forecasts</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Forecast
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forecasts</CardTitle>
            <CardDescription>Budget forecast scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading forecasts...</div>
            ) : forecasts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No forecasts found</div>
            ) : (
              <div className="space-y-2">
                {forecasts.map((forecast) => (
                  <div key={forecast.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{forecast.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Period: {forecast.period} | Status: {forecast.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        Revenue: <span className="text-green-600">{formatCurrency(forecast.total_revenue)}</span>
                      </div>
                      <div className="text-sm">
                        Expenses: <span className="text-red-600">{formatCurrency(forecast.total_expenses)}</span>
                      </div>
                    </div>
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

