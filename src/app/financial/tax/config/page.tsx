/**
 * Tax Management - Tax Configuration Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaxConfigPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tax Configuration</h2>
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
  );
}

