/**
 * Financial Reports - Custom Reports Page
 */

'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';

interface CustomReport {
  id: string;
  name: string;
  description: string;
  type: string;
  created_at: string;
  last_run?: string;
}

export default function CustomReportsPage() {
  const [reports] = useState<CustomReport[]>([]);
  const [loading] = useState(false);

  return (
    <AppLayout
      title="Custom Reports"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Reports', href: '/financial/reports/balance-sheet' },
        { label: 'Custom Reports' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Create and manage custom financial reports</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Custom Reports</CardTitle>
            <CardDescription>Your saved report templates</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No custom reports yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first custom report to analyze financial data your way
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{report.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.description} | Type: {report.type}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Run
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

