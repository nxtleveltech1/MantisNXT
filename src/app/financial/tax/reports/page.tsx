/**
 * Tax - Tax Reports Page
 */

'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface TaxReport {
  id: string;
  name: string;
  description: string;
  type: string;
}

const availableReports: TaxReport[] = [
  {
    id: '1',
    name: 'VAT Summary',
    description: 'Summary of VAT collected and paid',
    type: 'vat',
  },
  {
    id: '2',
    name: 'Income Tax Summary',
    description: 'Annual income tax summary',
    type: 'income',
  },
  {
    id: '3',
    name: 'PAYE Summary',
    description: 'Employee payroll tax summary',
    type: 'paye',
  },
  {
    id: '4',
    name: 'Tax Liability Report',
    description: 'Outstanding tax liabilities',
    type: 'liability',
  },
];

export default function TaxReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId);
    // Simulate report generation
    setTimeout(() => {
      setGenerating(null);
    }, 2000);
  };

  return (
    <AppLayout
      title="Tax Reports"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Tax', href: '/financial/tax/config' },
        { label: 'Reports' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Generate and download tax reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Reports</CardTitle>
            <CardDescription>Select a report to generate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {availableReports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <h3 className="font-medium">{report.name}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(report.id)}
                          disabled={generating === report.id}
                        >
                          {generating === report.id ? 'Generating...' : 'Generate'}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

