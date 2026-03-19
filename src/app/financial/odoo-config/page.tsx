'use client';

/**
 * Odoo Config — Ingest Odoo extraction JSON, sync Chart of Accounts to Xero
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, RefreshCw, FileJson, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OdooImport {
  id: string;
  source_file: string | null;
  import_date: string;
  cutover_date: string | null;
  records_imported: Record<string, number>;
  validation_errors: unknown;
  status: string;
}

interface AccountSummary {
  pendingCount: number;
  syncedCount: number;
}

function getOrgId(): string {
  if (typeof window === 'undefined') return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  return localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}

export default function OdooConfigPage() {
  const [imports, setImports] = useState<OdooImport[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImports = useCallback(async () => {
    setLoadingImports(true);
    try {
      const res = await fetch(`/api/v1/financial/odoo-ingest/imports?org_id=${getOrgId()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setImports(json.data);
      }
    } catch {
      setImports([]);
    } finally {
      setLoadingImports(false);
    }
  }, []);

  const fetchAccountSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/financial/odoo-ingest/accounts?org_id=${getOrgId()}&summary_only=true`);
      const json = await res.json();
      if (json.success && json.summary) {
        setAccountSummary(json.summary);
      }
    } catch {
      setAccountSummary(null);
    }
  }, []);

  const loadData = useCallback(() => {
    fetchImports();
    fetchAccountSummary();
  }, [fetchImports, fetchAccountSummary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        toast.error('Invalid JSON file');
        setUploading(false);
        return;
      }

      const res = await fetch('/api/v1/financial/odoo-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: payload,
          sourceFile: file.name,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Upload failed');
        setUploading(false);
        return;
      }

      if (json.status === 'failed' && json.validationErrors?.length) {
        toast.error(`Validation: ${json.validationErrors.slice(0, 2).join('; ')}`);
      } else {
        toast.success(`Imported: ${JSON.stringify(json.recordsImported || {})}`);
      }

      loadData();
      fileInputRef.current && (fileInputRef.current.value = '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSyncCoa = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/v1/financial/odoo-ingest/sync-coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: getOrgId() }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Sync failed');
        setSyncing(false);
        return;
      }

      const created = json.created ?? 0;
      const matched = json.matched ?? 0;
      const skipped = json.skipped ?? 0;
      toast.success(`Synced: ${created} created, ${matched} matched, ${skipped} skipped`);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppLayout
      title="Odoo Config"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Odoo Config' },
      ]}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Odoo Extraction Ingest
            </CardTitle>
            <CardDescription>
              Upload Odoo extraction JSON (accounts, taxes, payment terms, journals, fiscal positions) to prepare for Xero sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".json"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
              />
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loadingImports}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingImports ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {accountSummary && (accountSummary.pendingCount > 0 || accountSummary.syncedCount > 0) && (
              <div className="flex items-center gap-4 rounded border border-border bg-card p-3">
                <span className="text-sm text-muted-foreground">
                  Odoo accounts: <strong>{accountSummary.syncedCount}</strong> synced to Xero
                  {accountSummary.pendingCount > 0 && (
                    <> · <strong>{accountSummary.pendingCount}</strong> pending</>
                  )}
                </span>
                {accountSummary.pendingCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSyncCoa}
                    disabled={syncing}
                  >
                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sync COA to Xero
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>Recent Odoo config imports</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingImports ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : imports.length === 0 ? (
              <div className="text-sm text-muted-foreground">No imports yet. Upload an Odoo extraction JSON to get started.</div>
            ) : (
              <div className="space-y-2">
                {imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between rounded border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {imp.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : imp.status === 'failed' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                      <div>
                        <div className="text-sm font-medium">
                          {imp.source_file || 'Unknown file'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(imp.import_date).toLocaleString()}
                          {imp.records_imported && Object.keys(imp.records_imported).length > 0 && (
                            <> · {Object.entries(imp.records_imported).map(([k, v]) => `${k}: ${v}`).join(', ')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={imp.status === 'completed' ? 'default' : imp.status === 'failed' ? 'destructive' : 'secondary'}>
                      {imp.status}
                    </Badge>
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
