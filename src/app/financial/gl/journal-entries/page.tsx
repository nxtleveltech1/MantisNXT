/**
 * General Ledger - Journal Entries Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { type JournalEntry } from '@/lib/services/financial';
import { XeroSyncButton, XeroSyncStatus, XeroEntityLink } from '@/components/xero';

type ListSource = 'nxt' | 'xero';

export default function JournalEntriesPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch('/api/xero/sync/manual-journals');
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setEntries(result.data as JournalEntry[]);
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setEntries([]);
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/gl/journal-entries?org_id=${orgId}`);
          const result = await response.json();
          if (response.ok && result.success !== false && !result.error) {
            setEntries(result.data ?? []);
          } else {
            setError(result.error || 'Failed to fetch journal entries');
            setEntries([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journal entries');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [source]);

  return (
    <AppLayout
      title="Journal Entries"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'General Ledger', href: '/financial/gl/journal-entries' },
        { label: 'Journal Entries' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Manage general ledger journal entries</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="je-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="je-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/financial/gl/journal-entries/new">
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Link>
            </Button>
          </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>List of journal entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading journal entries...</div>
          ) : error ? (
            <div className="text-sm text-destructive">Error: {error}</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No journal entries found</div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 border rounded border-border">
                  <div>
                    <div className="font-medium">{entry.entry_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.description} | {entry.is_posted ? 'Posted' : 'Draft'}
                    </div>
                  </div>
                  {source === 'nxt' && (
                    <div className="flex items-center gap-2">
                      <XeroSyncStatus entityType="manual-journal" entityId={entry.id} />
                      <XeroSyncButton entityType="manual-journal" entityId={entry.id} size="sm" />
                      <XeroEntityLink entityType="manual-journal" entityId={entry.id} size="sm" />
                    </div>
                  )}
                  <div className="text-right">
                    <div className="font-medium">
                      Debits: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(entry.total_debits)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Credits: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(entry.total_credits)}
                    </div>
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
