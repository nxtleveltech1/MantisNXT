/**
 * Accounts Payable - Credit Notes Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';
import { XeroSyncButton, XeroSyncStatus, XeroEntityLink } from '@/components/xero';

type ListSource = 'nxt' | 'xero';

interface CreditNote {
  id: string;
  credit_note_number: string;
  vendor_id?: string;
  invoice_id?: string;
  amount: number;
  currency: string;
  credit_note_date: string;
  status: string;
  reason?: string;
}

export default function APCreditNotesPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCreditNotes() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch(buildClientXeroUrl('/api/xero/sync/credit-notes?type=ACCPAYCREDIT'), {
            headers: getClientXeroHeaders(),
          });
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setCreditNotes(
              result.data.map((cn: { CreditNoteID?: string; CreditNoteNumber?: string; Total?: number; Status?: string; Date?: string }) => ({
                id: cn.CreditNoteID ?? '',
                credit_note_number: cn.CreditNoteNumber ?? cn.CreditNoteID ?? '',
                amount: cn.Total ?? 0,
                currency: 'ZAR',
                credit_note_date: cn.Date ?? '',
                status: (cn.Status ?? '').toLowerCase(),
              }))
            );
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setCreditNotes([]);
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/ap/credit-notes?org_id=${orgId}`);
          const result = await response.json();
          if (response.ok && result.success !== false && !result.error) {
            setCreditNotes(result.data ?? []);
          } else {
            setCreditNotes([]);
          }
        }
      } catch (err) {
        setCreditNotes([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCreditNotes();
  }, [source]);

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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Manage accounts payable credit notes</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ap-cn-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="ap-cn-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Credit Note
            </Button>
          </div>
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
                    <div className="flex items-center gap-2">
                      <XeroSyncStatus entityType="credit-note" entityId={note.id} />
                      <XeroSyncButton entityType="credit-note" entityId={note.id} size="sm" />
                      <XeroEntityLink entityType="credit-note" entityId={note.id} size="sm" />
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


