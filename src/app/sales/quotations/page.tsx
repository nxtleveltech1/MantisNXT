'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentStatusBadge } from '@/components/sales/DocumentStatusBadge';
import { toast } from 'sonner';

interface Quotation {
  id: string;
  document_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  valid_until?: string | null;
}

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/sales/quotations?limit=100');
      const result = await response.json();

      if (result.success) {
        setQuotations(result.data || []);
      } else {
        toast.error('Failed to fetch quotations');
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Error loading quotations');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotations = quotations.filter(q =>
    q.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.customer_name && q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quotations</h1>
            <p className="text-muted-foreground">Manage customer quotations</p>
          </div>
          <Button onClick={() => router.push('/sales/quotations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Quotations</CardTitle>
                <CardDescription>View and manage all quotations</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-64 pl-8"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchQuotations}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">No quotations found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/sales/quotations/new')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Quotation
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map(quotation => (
                    <TableRow
                      key={quotation.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/sales/quotations/${quotation.id}`)}
                    >
                      <TableCell className="font-medium">{quotation.document_number}</TableCell>
                      <TableCell>{quotation.customer_name || quotation.customer_id}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={quotation.status as any} type="quotation" />
                      </TableCell>
                      <TableCell>{formatCurrency(quotation.total, quotation.currency)}</TableCell>
                      <TableCell>
                        {quotation.valid_until
                          ? new Date(quotation.valid_until).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(quotation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/sales/quotations/${quotation.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

