/**
 * Cash Management - Bank Accounts Page
 */

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BankAccountsPage() {
  return (
    <AppLayout 
      title="Bank Accounts" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cash Management', href: '/financial/cash/bank-accounts' },
        { label: 'Bank Accounts' }
      ]}
    >
      <div className="space-y-4">
        <div>
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
    </AppLayout>
  );
}

