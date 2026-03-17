'use client';

/**
 * Xero Connection Card
 * 
 * Displays Xero connection status and provides connect/disconnect actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { setStoredOrg } from '@/lib/org/current-org';

interface XeroConnectionStatus {
  configured: boolean;
  connected: boolean;
  message?: string;
  connection?: {
    tenantId: string;
    tenantName: string;
    connectedAt: string;
    lastSyncAt: string | null;
    scopes: string[];
    tokenStatus: {
      isExpired: boolean;
      expiresInMinutes: number;
      expiresAt: string;
    };
  };
}

function getOrgId(searchParams: ReturnType<typeof useSearchParams> | null): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('org_id');
  const urlOrg = searchParams?.get('org_id') ?? null;
  const orgId = stored || urlOrg || null;
  if (urlOrg && !stored) setStoredOrg(urlOrg, 'From URL');
  return orgId;
}

export function XeroConnectionCard() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<XeroConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const orgId = getOrgId(searchParams);
    try {
      const url = orgId ? `/api/xero/connection?org_id=${encodeURIComponent(orgId)}` : '/api/xero/connection';
      const response = await fetch(url);
      const ct = response.headers.get('content-type') ?? '';
      const data = ct.includes('application/json') ? await response.json().catch(() => null) : null;
      if (response.ok && data) {
        retryCountRef.current = 0;
        setStatus(data);
      } else {
        const msg = data?.error || data?.message || 'Failed to load connection status';
        const isNoOrg = response.status === 400 && typeof msg === 'string' && msg.includes('No organization selected');
        if (isNoOrg && !orgId && retryCountRef.current < 2) {
          retryCountRef.current += 1;
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            fetchStatus();
          }, 400);
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Xero connection status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check Xero connection status');
      toast.error('Failed to check Xero connection status');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handler = () => fetchStatus();
    window.addEventListener('org-changed', handler);
    return () => window.removeEventListener('org-changed', handler);
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const orgId = getOrgId(searchParams);
      const url = orgId ? `/api/xero/auth?org_id=${encodeURIComponent(orgId)}` : '/api/xero/auth';
      const response = await fetch(url);
      const ct = response.headers.get('content-type') ?? '';
      const data = ct.includes('application/json') ? await response.json().catch(() => null) : null;

      if (response.ok && data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        const errorMessage = data?.error || data?.message || 'Failed to initiate Xero connection';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to initiate Xero connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Xero';
      toast.error(errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Xero? This will stop all syncing.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const orgId = getOrgId(searchParams);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (orgId) headers['X-Org-Id'] = orgId;
      const response = await fetch('/api/xero/disconnect', { method: 'POST', headers });
      const ct = response.headers.get('content-type') ?? '';
      const data = ct.includes('application/json') ? await response.json().catch(() => null) : null;

      if (response.ok && data?.success) {
        toast.success('Disconnected from Xero');
        await fetchStatus();
      } else {
        const errorMessage = data?.error || data?.message || 'Failed to disconnect';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to disconnect from Xero:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect from Xero';
      toast.error(errorMessage);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    setConnecting(true);
    try {
      const orgId = getOrgId(searchParams);
      const base = orgId ? `/api/xero/auth?org_id=${encodeURIComponent(orgId)}&force=true` : '/api/xero/auth?force=true';
      const response = await fetch(base);
      const ct = response.headers.get('content-type') ?? '';
      const data = ct.includes('application/json') ? await response.json().catch(() => null) : null;

      if (response.ok && data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        const errorMessage = data?.error || data?.message || 'Failed to reconnect to Xero';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to reconnect to Xero:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reconnect to Xero';
      toast.error(errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Xero Accounting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking connection status...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    const isNoOrg = /no organization selected/i.test(error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xero Accounting</CardTitle>
          <CardDescription>
            {isNoOrg ? 'Organization required' : 'Connection status unavailable'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isNoOrg ? (
            <>
              <p className="text-sm text-muted-foreground">
                The current organization is shown in the header (next to the page title). If you still see this message,
                the app may still be loading it—click Retry once the org name appears in the header.
              </p>
            </>
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchStatus()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xero Accounting</CardTitle>
          <CardDescription>
            Xero integration is not configured for this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Contact your administrator to set up Xero API credentials.
          </p>
          {status?.message && (
            <p className="text-sm text-destructive">{status.message}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const isConnected = status.connected && status.connection;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" fill="#13B5EA" />
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  X
                </text>
              </svg>
              Xero Accounting
            </CardTitle>
            <CardDescription>
              Sync invoices, contacts, payments, and more with Xero
            </CardDescription>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Not Connected
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{status.connection?.tenantName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connected</span>
                <span className="font-medium">
                  {status.connection?.connectedAt
                    ? new Date(status.connection.connectedAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Sync</span>
                <span className="font-medium">
                  {status.connection?.lastSyncAt
                    ? new Date(status.connection.lastSyncAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              {status.connection?.tokenStatus.isExpired && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  Token expired. Please reconnect.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Unplug className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href="https://go.xero.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Xero
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Xero account to automatically sync financial data between MantisNXT and Xero.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Sync suppliers and customers</li>
              <li>Create and update invoices</li>
              <li>Record payments automatically</li>
              <li>View financial reports</li>
            </ul>
            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect to Xero'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
