/**
 * Budgeting - Budget Versions Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BudgetVersionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Budget Versions</h2>
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
  );
}

