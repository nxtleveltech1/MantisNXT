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
import { GLService, type JournalEntry } from '@/lib/services/financial';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/gl/journal-entries?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setEntries(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch journal entries');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching journal entries:', err);
        setError(err instanceof Error ? err.message : 'Failed to load journal entries');
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  return (
    <AppLayout 
      title="Journal Entries" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'General Ledger', href: '/financial/gl/journal-entries' },
        { label: 'Journal Entries' }
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage general ledger journal entries</p>
          </div>
          <Button asChild>
            <Link href="/financial/gl/journal-entries/new">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Link>
          </Button>
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
                <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{entry.entry_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.description} | {entry.is_posted ? 'Posted' : 'Draft'}
                    </div>
                  </div>
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
    </AppLayout>
  );
}
