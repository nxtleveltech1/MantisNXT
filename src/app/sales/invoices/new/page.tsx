'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewInvoicePage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sales/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Invoice</h1>
            <p className="text-muted-foreground">Create a new invoice</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Form</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Invoice creation form - Similar to quotation form. Can be created manually or converted from a proforma invoice.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

