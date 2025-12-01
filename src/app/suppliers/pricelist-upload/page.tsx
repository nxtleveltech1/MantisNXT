'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import SupplierPricelistUpload from '@/components/suppliers/SupplierPricelistUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function PricelistUploadPage() {
  const breadcrumbs = [{ label: 'Suppliers', href: '/suppliers' }, { label: 'Pricelist Upload' }];

  return (
    <AppLayout title="Supplier Pricelist Upload" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Pricelist Upload:</strong> Upload supplier pricelists in Excel or CSV format.
            The system will automatically validate and process the data.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Upload Supplier Pricelist</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierPricelistUpload
              supplierId={undefined}
              onUploadComplete={pricelist => {
                console.log('Pricelist uploaded:', pricelist);
                alert('Pricelist uploaded successfully!');
              }}
              onCancel={() => {
                console.log('Upload cancelled');
                window.history.back();
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
