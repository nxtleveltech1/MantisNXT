/**
 * Cost Accounting - Cost Centers Page
 */

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CostCentersPage() {
  return (
    <AppLayout 
      title="Cost Centers" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cost Accounting', href: '/financial/cost/centers' },
        { label: 'Cost Centers' }
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Manage cost centers</p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Cost Centers</CardTitle>
          <CardDescription>List of cost centers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Cost centers list will be displayed here.
          </div>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}

