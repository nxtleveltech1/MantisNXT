'use client';

/**
 * Xero Account Mapping Form
 * 
 * UI for configuring NXT account type to Xero account code mappings.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface XeroAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  class: string;
}

interface AccountMapping {
  mappingKey: string;
  displayName: string;
  description: string | null;
  xeroAccountId: string | null;
  xeroAccountCode: string | null;
  xeroAccountName: string | null;
  isRequired: boolean;
}

export function XeroAccountMappingForm() {
  const [accounts, setAccounts] = useState<XeroAccount[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, { id: string; code: string; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch accounts and mappings in parallel
      const [accountsRes, mappingsRes] = await Promise.all([
        fetch('/api/xero/accounts'),
        fetch('/api/xero/mappings'),
      ]);

      const accountsData = await accountsRes.json();
      const mappingsData = await mappingsRes.json();

      if (!accountsRes.ok) {
        const errorMessage = accountsData.error || accountsData.message || 'Failed to fetch accounts';
        throw new Error(errorMessage);
      }

      if (!mappingsRes.ok) {
        const errorMessage = mappingsData.error || mappingsData.message || 'Failed to fetch mappings';
        throw new Error(errorMessage);
      }

      setAccounts(accountsData.accounts || []);
      setMappings(mappingsData.mappings || []);

      // Initialize selected mappings from current config
      const initial: Record<string, { id: string; code: string; name: string }> = {};
      for (const mapping of mappingsData.mappings || []) {
        if (mapping.xeroAccountId && mapping.xeroAccountCode) {
          initial[mapping.mappingKey] = {
            id: mapping.xeroAccountId,
            code: mapping.xeroAccountCode,
            name: mapping.xeroAccountName || '',
          };
        }
      }
      setSelectedMappings(initial);

    } catch (err) {
      console.error('Failed to fetch Xero data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccountSelect = (mappingKey: string, accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setSelectedMappings(prev => ({
        ...prev,
        [mappingKey]: {
          id: account.id,
          code: account.code,
          name: account.name,
        },
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Build mappings array
      const mappingsToSave = Object.entries(selectedMappings).map(([key, value]) => ({
        mappingKey: key,
        xeroAccountId: value.id,
        xeroAccountCode: value.code,
        xeroAccountName: value.name,
      }));

      const response = await fetch('/api/xero/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingsToSave }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to save mappings';
        throw new Error(errorMessage);
      }

      toast.success('Account mappings saved successfully');
      // Refresh mappings to show updated state
      await fetchData();
    } catch (err) {
      console.error('Failed to save mappings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save mappings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Filter accounts by appropriate type for each mapping
  const getFilteredAccounts = (mappingKey: string): XeroAccount[] => {
    switch (mappingKey) {
      case 'sales_revenue':
      case 'service_revenue':
      case 'rental_revenue':
      case 'shipping_revenue':
        return accounts.filter(a => a.type === 'REVENUE' || a.class === 'REVENUE');
      
      case 'cost_of_goods_sold':
        return accounts.filter(a => a.type === 'DIRECTCOSTS' || a.class === 'EXPENSE');
      
      case 'shipping_expense':
        return accounts.filter(a => a.type === 'EXPENSE' || a.type === 'OVERHEADS' || a.class === 'EXPENSE');
      
      case 'inventory_asset':
        return accounts.filter(a => a.type === 'INVENTORY' || a.type === 'CURRENT' || a.class === 'ASSET');
      
      case 'accounts_receivable':
        return accounts.filter(a => a.type === 'CURRENT' || a.class === 'ASSET');
      
      case 'accounts_payable':
      case 'deposits_received':
        return accounts.filter(a => a.type === 'CURRLIAB' || a.class === 'LIABILITY');
      
      case 'bank_account':
        return accounts.filter(a => a.type === 'BANK');
      
      default:
        return accounts;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Mappings</CardTitle>
          <CardDescription>Loading Xero accounts...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Mappings</CardTitle>
          <CardDescription>Configure which Xero accounts to use</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasUnsavedChanges = mappings.some(m => {
    const current = selectedMappings[m.mappingKey];
    const saved = m.xeroAccountId;
    return current?.id !== saved;
  });

  const missingRequired = mappings
    .filter(m => m.isRequired && !selectedMappings[m.mappingKey])
    .map(m => m.displayName);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xero Account Mappings</CardTitle>
        <CardDescription>
          Map NXT transaction types to your Xero chart of accounts
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {missingRequired.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Required mappings missing: {missingRequired.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {mappings.map((mapping) => {
            const filteredAccounts = getFilteredAccounts(mapping.mappingKey);
            const selected = selectedMappings[mapping.mappingKey];
            
            return (
              <div key={mapping.mappingKey} className="grid gap-2">
                <Label htmlFor={mapping.mappingKey} className="flex items-center gap-2">
                  {mapping.displayName}
                  {mapping.isRequired && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                {mapping.description && (
                  <p className="text-xs text-muted-foreground">{mapping.description}</p>
                )}
                <Select
                  value={selected?.id || ''}
                  onValueChange={(value) => handleAccountSelect(mapping.mappingKey, value)}
                >
                  <SelectTrigger id={mapping.mappingKey}>
                    <SelectValue placeholder="Select an account...">
                      {selected ? `${selected.code} - ${selected.name}` : 'Select an account...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" onClick={fetchData} disabled={saving}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Accounts
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || missingRequired.length > 0}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Mappings
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
