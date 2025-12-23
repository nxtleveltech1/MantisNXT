/**
 * Fixed Assets - Disposals Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Disposal {
  id: string;
  asset_id: string;
  asset_name: string;
  disposal_date: string;
  disposal_method: string;
  proceeds: number;
  net_book_value: number;
  gain_loss: number;
  status: string;
}

export default function AssetDisposalsPage() {
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDisposals() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/assets/disposals?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setDisposals(result.data || []);
        } else {
          setDisposals([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching disposals:', err);
        setDisposals([]);
        setLoading(false);
      }
    }

    fetchDisposals();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout
      title="Asset Disposals"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Fixed Assets', href: '/financial/assets/register' },
        { label: 'Disposals' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Record and track asset disposals</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Disposal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Disposals</CardTitle>
            <CardDescription>Asset disposal history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading disposals...</div>
            ) : disposals.length === 0 ? (
              <div className="text-sm text-muted-foreground">No disposals recorded</div>
            ) : (
              <div className="space-y-2">
                {disposals.map((disposal) => (
                  <div key={disposal.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{disposal.asset_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Method: {disposal.disposal_method} | Date:{' '}
                        {new Date(disposal.disposal_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        Proceeds: {formatCurrency(disposal.proceeds)}
                      </div>
                      <div className={`font-medium ${disposal.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {disposal.gain_loss >= 0 ? 'Gain: ' : 'Loss: '}
                        {formatCurrency(Math.abs(disposal.gain_loss))}
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

