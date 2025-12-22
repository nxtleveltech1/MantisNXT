/**
 * Budgeting - Budget Versions Page
 */

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BudgetVersionsPage() {
  return (
    <AppLayout 
      title="Budget Versions" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Budgeting', href: '/financial/budget/versions' },
        { label: 'Budget Versions' }
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Manage budget versions</p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Budget Versions</CardTitle>
          <CardDescription>List of budget versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Budget versions list will be displayed here.
          </div>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}

