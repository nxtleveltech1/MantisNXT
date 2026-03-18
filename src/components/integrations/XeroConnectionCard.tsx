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

function getFriendlyXeroErrorMessage(errorCode: string | null, fallback?: string | null) {
  switch (errorCode) {
    case 'org_context_mismatch':
      return 'The selected organization does not match your active authenticated organization. Switch to the same organization and try again.';
    case 'org_context_changed':
      return 'The selected organization changed during the Xero connection flow. Switch back to the same organization and try again.';
    case 'missing_org':
      return 'No organization selected. Choose an organization in the header and try again.';
    default:
      return fallback || errorCode || 'Failed to initiate Xero connection';
  }
}

function getOrgId(searchParams: ReturnType<typeof useSearchParams> | null): string | null {
  if (typeof window === 'undefined') return null;

  const storedOrgId = localStorage.getItem('org_id');
  const urlOrgId = searchParams?.get('org_id') ?? null;
  const orgId = storedOrgId || urlOrgId || null;

  if (urlOrgId && !storedOrgId) {
    setStoredOrg(urlOrgId, 'From URL');
  }

  return orgId;
}

function buildApiUrl(path: string, searchParams: ReturnType<typeof useSearchParams> | null) {
  const orgId = getOrgId(searchParams);
  if (!orgId) return path;

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}org_id=${encodeURIComponent(orgId)}`;
}

function getOrgHeaders(searchParams: ReturnType<typeof useSearchParams> | null): HeadersInit {
  const orgId = getOrgId(searchParams);
  return orgId ? { 'X-Org-Id': orgId } : {};
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
      const response = await fetch(buildApiUrl('/api/xero/connection', searchParams), {
        headers: getOrgHeaders(searchParams),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : null;

      if (response.ok && data) {
        retryCountRef.current = 0;
        setStatus(data);
        return;
      }

      const errorCode = typeof data?.error === 'string' ? data.error : null;
      const fallbackMessage = typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : 'Failed to load connection status';
      const errorMessage = getFriendlyXeroErrorMessage(errorCode, fallbackMessage);
      const isNoOrg = response.status === 400 && errorCode === 'missing_org';

      if (isNoOrg && !orgId && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          void fetchStatus();
        }, 400);
        return;
      }

      setError(errorMessage);
    } catch (err) {
      console.error('Failed to fetch Xero connection status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check Xero connection status');
      toast.error('Failed to check Xero connection status');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void fetchStatus();
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
    const handler = () => {
      void fetchStatus();
    };

    window.addEventListener('org-changed', handler);
    return () => window.removeEventListener('org-changed', handler);
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch(buildApiUrl('/api/xero/auth', searchParams), {
        headers: getOrgHeaders(searchParams),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : null;

      if (response.ok && data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      const errorMessage = getFriendlyXeroErrorMessage(
        typeof data?.error === 'string' ? data.error : null,
        data?.message || data?.error || 'Failed to initiate Xero connection'
      );
      toast.error(errorMessage);
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
      const response = await fetch(buildApiUrl('/api/xero/disconnect', searchParams), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrgHeaders(searchParams),
        },
      });
      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : null;

      if (response.ok && data?.success) {
        toast.success('Disconnected from Xero');
        await fetchStatus();
        return;
      }

      const errorMessage = getFriendlyXeroErrorMessage(
        typeof data?.error === 'string' ? data.error : null,
        data?.message || data?.error || 'Failed to disconnect'
      );
      toast.error(errorMessage);
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
      const response = await fetch(buildApiUrl('/api/xero/auth?force=true', searchParams), {
        headers: getOrgHeaders(searchParams),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : null;

      if (response.ok && data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      const errorMessage = getFriendlyXeroErrorMessage(
        typeof data?.error === 'string' ? data.error : null,
        data?.message || data?.error || 'Failed to reconnect to Xero'
      );
      toast.error(errorMessage);
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
            <p className="text-sm text-muted-foreground">
              The current organization is shown in the header next to the page title. If you still see this message,
              the app may still be loading it. Click Retry once the org name appears in the header.
            </p>
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button variant="outline" size="sm" onClick={() => void fetchStatus()}>
            <RefreshCw className="mr-2 h-4 w-4" />
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
          <CardDescription>Xero integration is not configured for this application.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Contact your administrator to set up Xero API credentials.
          </p>
          {status?.message && <p className="text-sm text-destructive">{status.message}</p>}
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
                <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                  X
                </text>
              </svg>
              Xero Accounting
            </CardTitle>
            <CardDescription>Sync invoices, contacts, payments, and more with Xero</CardDescription>
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
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
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
              <Button variant="outline" size="sm" onClick={() => void handleReconnect()} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                {disconnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
              <Button variant="ghost" size="sm" asChild>
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
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Sync suppliers and customers</li>
              <li>Create and update invoices</li>
              <li>Record payments automatically</li>
              <li>View financial reports</li>
            </ul>
            <Button onClick={() => void handleConnect()} disabled={connecting} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
