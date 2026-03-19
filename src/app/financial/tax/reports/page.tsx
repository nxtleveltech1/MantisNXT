/**
 * Tax - Tax Reports Page
 */

'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaxReport {
  id: string;
  name: string;
  description: string;
  type: string;
}

const availableReports: TaxReport[] = [
  { id: '1', name: 'VAT Summary', description: 'Summary of VAT collected and paid', type: 'vat' },
  { id: '2', name: 'Income Tax Summary', description: 'Annual income tax summary', type: 'income' },
  { id: '3', name: 'PAYE Summary', description: 'Employee payroll tax summary', type: 'paye' },
  { id: '4', name: 'Tax Liability Report', description: 'Outstanding tax liabilities', type: 'liability' },
];

function getOrgId(): string {
  if (typeof window === 'undefined') return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  return localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}

export default function TaxReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (report: TaxReport) => {
    setDownloading(report.id);
    try {
      const res = await fetch(
        `/api/v1/financial/tax/reports/${report.type}/pdf?org_id=${getOrgId()}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax-report-${report.type}-${new Date().toISOString().slice(0, 7)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${report.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
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
                          onClick={() => handleDownload(report)}
                          disabled={downloading === report.id}
                        >
                          {downloading === report.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-1 h-4 w-4" />
                          )}
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

