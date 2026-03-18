'use client';

/**
 * Xero Account Mapping Form
 *
 * UI for configuring NXT account type to Xero account code mappings.
 */

import { useState, useEffect, useCallback } from 'react';
import { setStoredOrg } from '@/lib/org/current-org';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RefreshCw, AlertCircle } from 'lucide-react';
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

function getFriendlyXeroErrorMessage(errorCode: string | null, fallback?: string | null) {
  switch (errorCode) {
    case 'org_context_mismatch':
      return 'The selected organization does not match your active authenticated organization. Switch to the same organization and try again.';
    case 'missing_org':
      return 'No organization selected. Choose an organization in the header and try again.';
    default:
      return fallback || errorCode || 'Failed to load Xero data';
  }
}

export function XeroAccountMappingForm() {
  const [accounts, setAccounts] = useState<XeroAccount[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, { id: string; code: string; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOrgId = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const storedOrgId = localStorage.getItem('org_id');
    const urlOrgId = new URLSearchParams(window.location.search).get('org_id');
    const orgId = storedOrgId || urlOrgId || null;

    if (urlOrgId && !storedOrgId) {
      setStoredOrg(urlOrgId, 'From URL');
    }

    return orgId;
  }, []);

  const buildApiUrl = useCallback(
    (path: string) => {
      const orgId = getOrgId();
      if (!orgId) return path;

      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}org_id=${encodeURIComponent(orgId)}`;
    },
    [getOrgId]
  );

  const getOrgHeaders = useCallback((): HeadersInit => {
    const orgId = getOrgId();
    return orgId ? { 'X-Org-Id': orgId } : {};
  }, [getOrgId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [accountsRes, mappingsRes] = await Promise.all([
        fetch(buildApiUrl('/api/xero/accounts'), { headers: getOrgHeaders() }),
        fetch(buildApiUrl('/api/xero/mappings'), { headers: getOrgHeaders() }),
      ]);

      const accountsData = await accountsRes.json();
      const mappingsData = await mappingsRes.json();

      if (!accountsRes.ok) {
        const msg = getFriendlyXeroErrorMessage(
          typeof accountsData?.error === 'string' ? accountsData.error : null,
          accountsData?.error || accountsData?.message || 'Failed to fetch accounts'
        );
        const friendly = msg.toLowerCase().includes('not connected')
          ? 'Connect to Xero first to load accounts and configure mappings.'
          : msg;
        throw new Error(friendly);
      }

      if (!mappingsRes.ok) {
        const msg = getFriendlyXeroErrorMessage(
          typeof mappingsData?.error === 'string' ? mappingsData.error : null,
          mappingsData?.error || mappingsData?.message || 'Failed to fetch mappings'
        );
        const friendly = msg.toLowerCase().includes('not connected')
          ? 'Connect to Xero first to load mappings.'
          : msg;
        throw new Error(friendly);
      }

      const accountList = accountsData.accounts || [];
      setAccounts(accountList);
      setMappings(mappingsData.mappings || []);

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
      setAccounts([]);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, getOrgHeaders]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => {
      void fetchData();
    };

    window.addEventListener('org-changed', handler);
    return () => window.removeEventListener('org-changed', handler);
  }, [fetchData]);

  const handleAccountSelect = (mappingKey: string, accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    if (account) {
      setSelectedMappings((prev) => ({
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
      const mappingsToSave = Object.entries(selectedMappings).map(([key, value]) => ({
        mappingKey: key,
        xeroAccountId: value.id,
        xeroAccountCode: value.code,
        xeroAccountName: value.name,
      }));

      const response = await fetch(buildApiUrl('/api/xero/mappings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrgHeaders(),
        },
        body: JSON.stringify({ mappings: mappingsToSave }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getFriendlyXeroErrorMessage(
          typeof data?.error === 'string' ? data.error : null,
          data?.error || data?.message || 'Failed to save mappings'
        );
        throw new Error(errorMessage);
      }

      toast.success('Account mappings saved successfully');
      await fetchData();
    } catch (err) {
      console.error('Failed to save mappings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save mappings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getFilteredAccounts = (mappingKey: string): XeroAccount[] => {
    switch (mappingKey) {
      case 'sales_revenue':
      case 'service_revenue':
      case 'rental_revenue':
      case 'shipping_revenue':
        return accounts.filter((account) => account.type === 'REVENUE' || account.class === 'REVENUE');

      case 'cost_of_goods_sold':
        return accounts.filter((account) => account.type === 'DIRECTCOSTS' || account.class === 'EXPENSE');

      case 'shipping_expense':
        return accounts.filter(
          (account) =>
            account.type === 'EXPENSE' || account.type === 'OVERHEADS' || account.class === 'EXPENSE'
        );

      case 'inventory_asset':
        return accounts.filter(
          (account) => account.type === 'INVENTORY' || account.type === 'CURRENT' || account.class === 'ASSET'
        );

      case 'accounts_receivable':
        return accounts.filter((account) => account.type === 'CURRENT' || account.class === 'ASSET');

      case 'accounts_payable':
      case 'deposits_received':
        return accounts.filter((account) => account.type === 'CURRLIAB' || account.class === 'LIABILITY');

      case 'bank_account':
        return accounts.filter((account) => account.type === 'BANK');

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
          <Button onClick={() => void fetchData()} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const missingRequired = mappings
    .filter((mapping) => mapping.isRequired && !selectedMappings[mapping.mappingKey])
    .map((mapping) => mapping.displayName);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xero Account Mappings</CardTitle>
        <CardDescription>Map NXT transaction types to your Xero chart of accounts</CardDescription>
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
                  {mapping.isRequired && <span className="text-destructive">*</span>}
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
        <Button variant="outline" onClick={() => void fetchData()} disabled={saving}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Accounts
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving || missingRequired.length > 0}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Mappings
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
