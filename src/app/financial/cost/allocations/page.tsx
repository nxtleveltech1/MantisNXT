/**
 * Cost Management - Cost Allocations Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CostAllocation {
  id: string;
  name: string;
  source_center: string;
  target_centers: string[];
  allocation_basis: string;
  period: string;
  total_amount: number;
  status: string;
}

export default function CostAllocationsPage() {
  const [allocations, setAllocations] = useState<CostAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllocations() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/cost/allocations?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setAllocations(result.data || []);
        } else {
          setAllocations([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching allocations:', err);
        setAllocations([]);
        setLoading(false);
      }
    }

    fetchAllocations();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout
      title="Cost Allocations"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cost Management', href: '/financial/cost/centers' },
        { label: 'Allocations' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage cost allocations between cost centers</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Allocation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allocations</CardTitle>
            <CardDescription>Cost allocation rules and history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading allocations...</div>
            ) : allocations.length === 0 ? (
              <div className="text-sm text-muted-foreground">No allocations configured</div>
            ) : (
              <div className="space-y-2">
                {allocations.map((alloc) => (
                  <div key={alloc.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alloc.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(alloc.status)}`}>
                          {alloc.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        From: {alloc.source_center} → To: {alloc.target_centers.join(', ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Basis: {alloc.allocation_basis} | Period: {alloc.period}
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(alloc.total_amount)}
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

