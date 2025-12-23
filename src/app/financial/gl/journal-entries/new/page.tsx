/**
 * General Ledger - New Journal Entry Page
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface JournalLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', account_id: '', description: '', debit: 0, credit: 0 },
    { id: '2', account_id: '', description: '', debit: 0, credit: 0 },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), account_id: '', description: '', debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(
      lines.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isBalanced) {
      setError('Journal entry must be balanced (total debits must equal total credits)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const formData = new FormData(e.currentTarget);
      const entryData = {
        org_id: orgId,
        entry_date: formData.get('entry_date'),
        description: formData.get('description'),
        reference: formData.get('reference'),
        lines: lines.map((line) => ({
          account_id: line.account_id,
          description: line.description,
          debit_amount: line.debit || 0,
          credit_amount: line.credit || 0,
        })),
      };

      const response = await fetch('/api/v1/financial/gl/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/financial/gl/journal-entries');
      } else {
        setError(result.error || 'Failed to create journal entry');
      }
    } catch (err) {
      console.error('Error creating journal entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="New Journal Entry"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'General Ledger', href: '/financial/gl/accounts' },
        { label: 'Journal Entries', href: '/financial/gl/journal-entries' },
        { label: 'New Entry' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Create a new journal entry</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/financial/gl/journal-entries">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Journal Entries
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Journal Entry Details</CardTitle>
            <CardDescription>Enter journal entry information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry_date">Entry Date *</Label>
                  <Input
                    id="entry_date"
                    name="entry_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input id="reference" name="reference" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input id="description" name="description" required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Journal Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line
                  </Button>
                </div>

                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Account</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Debit</th>
                        <th className="text-right p-2">Credit</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.id} className="border-b">
                          <td className="p-2">
                            <Input
                              value={line.account_id}
                              onChange={(e) => updateLine(line.id, 'account_id', e.target.value)}
                              placeholder="Account ID"
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                              placeholder="Line description"
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={line.debit || ''}
                              onChange={(e) =>
                                updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={line.credit || ''}
                              onChange={(e) =>
                                updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(line.id)}
                              disabled={lines.length <= 2}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-medium bg-muted/50">
                        <td colSpan={2} className="p-2 text-right">
                          Totals:
                        </td>
                        <td className="p-2 text-right">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(totalDebits)}
                        </td>
                        <td className="p-2 text-right">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(totalCredits)}
                        </td>
                        <td className="p-2">
                          {isBalanced ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {!isBalanced && (
                  <p className="text-sm text-destructive">
                    Entry is not balanced. Difference:{' '}
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency',
                      currency: 'ZAR',
                    }).format(Math.abs(totalDebits - totalCredits))}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/financial/gl/journal-entries">Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading || !isBalanced}>
                  {loading ? 'Creating...' : 'Create Entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

