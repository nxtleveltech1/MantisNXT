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

interface Invoice {
  id: string;
  document_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  total: number;
  amount_due: number;
  currency: string;
  due_date?: string | null;
  created_at: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/sales/invoices?limit=100');
      const result = await response.json();

      if (result.success) {
        setInvoices(result.data || []);
      } else {
        toast.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage invoices</p>
          </div>
          <Button onClick={() => router.push('/sales/invoices/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>View and manage all invoices</CardDescription>
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
                <Button variant="outline" size="icon" onClick={fetchInvoices}>
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
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">No invoices found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/sales/invoices/new')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Invoice
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
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map(invoice => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/sales/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-medium">{invoice.document_number}</TableCell>
                      <TableCell>{invoice.customer_name || invoice.customer_id}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={invoice.status as any} type="invoice" />
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount_due, invoice.currency)}</TableCell>
                      <TableCell>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/sales/invoices/${invoice.id}`);
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

