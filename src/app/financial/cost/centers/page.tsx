/**
 * Cost Accounting - Cost Centers Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CostCentersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cost Centers</h2>
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
  );
}

