/**
 * Cash Management - Cash Forecast Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ForecastItem {
  date: string;
  opening_balance: number;
  inflows: number;
  outflows: number;
  closing_balance: number;
}

export default function CashForecastPage() {
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/cash/forecast?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setForecast(result.data || []);
        } else {
          setForecast([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching forecast:', err);
        setForecast([]);
        setLoading(false);
      }
    }

    fetchForecast();
  }, []);

  return (
    <AppLayout
      title="Cash Forecast"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cash Management', href: '/financial/cash/bank-accounts' },
        { label: 'Forecast' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Cash flow forecast for upcoming periods</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cash Forecast</CardTitle>
            <CardDescription>Projected cash position</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading forecast...</div>
            ) : forecast.length === 0 ? (
              <div className="text-sm text-muted-foreground">No forecast data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Opening</th>
                      <th className="text-right p-2">Inflows</th>
                      <th className="text-right p-2">Outflows</th>
                      <th className="text-right p-2">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.opening_balance)}
                        </td>
                        <td className="text-right p-2 text-green-600">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.inflows)}
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.outflows)}
                        </td>
                        <td className="text-right p-2 font-medium">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.closing_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

