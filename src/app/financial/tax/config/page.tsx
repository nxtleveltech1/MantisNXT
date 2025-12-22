/**
 * Tax Management - Tax Configuration Page
 */

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaxConfigPage() {
  return (
    <AppLayout 
      title="Tax Configuration" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Tax Management', href: '/financial/tax/config' },
        { label: 'Tax Configuration' }
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Manage tax rates and configuration</p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Tax Configuration</CardTitle>
          <CardDescription>Tax rates and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Tax configuration will be displayed here.
          </div>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}

