/**
 * Accounts Payable - Credit Notes Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CreditNote {
  id: string;
  credit_note_number: string;
  vendor_id: string;
  invoice_id?: string;
  amount: number;
  currency: string;
  credit_note_date: string;
  status: string;
  reason?: string;
}

export default function APCreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCreditNotes() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        // Note: This endpoint may not exist yet, but we'll create a placeholder
        const response = await fetch(`/api/v1/financial/ap/credit-notes?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setCreditNotes(result.data || []);
        } else {
          // If endpoint doesn't exist, just show empty state
          setCreditNotes([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching credit notes:', err);
        // Don't show error if endpoint doesn't exist
        setCreditNotes([]);
        setLoading(false);
      }
    }

    fetchCreditNotes();
  }, []);

  return (
    <AppLayout
      title="Credit Notes"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Payable', href: '/financial/ap/invoices' },
        { label: 'Credit Notes' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage accounts payable credit notes</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Credit Note
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credit Notes</CardTitle>
            <CardDescription>List of vendor credit notes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading credit notes...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : creditNotes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No credit notes found</div>
            ) : (
              <div className="space-y-2">
                {creditNotes.map((note) => (
                  <div key={note.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{note.credit_note_number}</div>
                      <div className="text-sm text-muted-foreground">
                        Vendor: {note.vendor_id} | Status: {note.status}
                        {note.reason && ` | Reason: ${note.reason}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: note.currency || 'ZAR',
                        }).format(note.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(note.credit_note_date).toLocaleDateString()}
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

