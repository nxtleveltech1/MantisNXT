'use client';

/**
 * Xero Connection Card
 * 
 * Displays Xero connection status and provides connect/disconnect actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';

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

export function XeroConnectionCard() {
  const router = useRouter();
  const [status, setStatus] = useState<XeroConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/xero/connection');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch Xero connection status:', error);
      toast.error('Failed to check Xero connection status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/xero/auth');
      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        // Redirect to Xero OAuth
        window.location.href = data.redirectUrl;
      } else {
        const errorMessage = data.error || data.message || 'Failed to initiate Xero connection';
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
      const response = await fetch('/api/xero/disconnect', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Disconnected from Xero');
        await fetchStatus();
      } else {
        const errorMessage = data.error || data.message || 'Failed to disconnect';
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
      const response = await fetch('/api/xero/auth?force=true');
      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        const errorMessage = data.error || data.message || 'Failed to reconnect to Xero';
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
