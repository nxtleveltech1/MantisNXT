'use client';

/**
 * Reconciliation — Xero sync exceptions and state drift
 */

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface ExceptionRow {
  id: string;
  entity_type: string;
  nxt_entity_id: string;
  xero_entity_id: string;
  sync_status: string;
  platform_state: string | null;
  xero_state: string | null;
  error_message: string | null;
  last_synced_at: string | null;
}

function getOrgId(): string {
  if (typeof window === 'undefined') return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  return localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}

export default function ReconciliationPage() {
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/financial/reconciliation/exceptions?org_id=${getOrgId()}&limit=100`);
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setExceptions(json.data);
      } else {
        setExceptions([]);
      }
    } catch {
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  return (
    <AppLayout
      title="Reconciliation"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Reconciliation' },
      ]}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Sync Exceptions
            </CardTitle>
            <CardDescription>
              Entity mappings with sync errors or state drift. Requires attention to reconcile with Xero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={fetchExceptions}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : exceptions.length === 0 ? (
              <div className="rounded border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                No reconciliation exceptions. All entity mappings are in sync.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Entity Type</th>
                      <th className="text-left p-2">NXT ID</th>
                      <th className="text-left p-2">Xero ID</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Platform State</th>
                      <th className="text-left p-2">Error</th>
                      <th className="text-left p-2">Last Synced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map((row) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="p-2 font-mono">{row.entity_type}</td>
                        <td className="p-2 font-mono text-muted-foreground">{row.nxt_entity_id?.slice(0, 8)}…</td>
                        <td className="p-2 font-mono text-muted-foreground">{row.xero_entity_id ?? '-'}</td>
                        <td className="p-2">
                          <Badge variant={row.sync_status === 'error' ? 'destructive' : 'secondary'}>
                            {row.sync_status}
                          </Badge>
                        </td>
                        <td className="p-2">{row.platform_state ?? '-'}</td>
                        <td className="p-2 max-w-[200px] truncate text-destructive" title={row.error_message ?? undefined}>
                          {row.error_message ?? '-'}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {row.last_synced_at ? new Date(row.last_synced_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
