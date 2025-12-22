/**
 * Cash Management - Bank Accounts Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BankAccountsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bank Accounts</h2>
        <p className="text-muted-foreground">Manage bank accounts</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>List of bank accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Bank accounts list will be displayed here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

