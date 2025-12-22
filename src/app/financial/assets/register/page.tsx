/**
 * Fixed Assets - Asset Register Page
 */

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AssetRegisterPage() {
  return (
    <AppLayout 
      title="Asset Register" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Fixed Assets', href: '/financial/assets/register' },
        { label: 'Asset Register' }
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Manage fixed assets</p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Asset Register</CardTitle>
          <CardDescription>List of fixed assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Asset register will be displayed here.
          </div>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}

