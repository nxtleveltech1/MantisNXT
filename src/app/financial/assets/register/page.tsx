/**
 * Fixed Assets - Asset Register Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AssetRegisterPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Asset Register</h2>
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
  );
}

