'use client';

/**
 * Xero Integration Settings Page
 * 
 * Configuration for webhooks, sync options, and connection details.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Webhook,
  Shield,
  Key,
  RefreshCw,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface XeroConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tenantName: string | null;
  tenantId: string | null;
  connectedAt: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
}

export default function XeroSettingsPage() {
  const [connectionStatus, setConnectionStatus] = useState<XeroConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Get the app URL for webhook configuration
  const appUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
  
  const webhookUrl = `${appUrl}/api/xero/webhooks`;
  const callbackUrl = `${appUrl}/api/xero/callback`;

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/xero/connection');
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch connection status:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const breadcrumbs = [
    { label: 'Integrations', href: '/integrations' },
    { label: 'Xero Accounting', href: '/integrations/xero' },
    { label: 'Settings' },
  ];

  return (
    <AppLayout title="Xero Settings" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Configure your Xero integration settings
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/integrations/xero">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Xero
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Connection Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Connection Details
              </CardTitle>
              <CardDescription>
                Current Xero connection information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : connectionStatus?.isConnected ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="default">Connected</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organization</span>
                      <span className="font-medium">{connectionStatus.tenantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenant ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {connectionStatus.tenantId?.slice(0, 8)}...
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connected</span>
                      <span>
                        {connectionStatus.connectedAt
                          ? new Date(connectionStatus.connectedAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Expires</span>
                      <span>
                        {connectionStatus.tokenExpiresAt
                          ? new Date(connectionStatus.tokenExpiresAt).toLocaleString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Not Connected</AlertTitle>
                  <AlertDescription>
                    <Link href="/integrations/xero" className="underline">
                      Connect to Xero
                    </Link>{' '}
                    to enable this integration.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* API Scopes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Permissions
              </CardTitle>
              <CardDescription>
                Scopes granted by the connected Xero account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStatus?.scopes && connectionStatus.scopes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {connectionStatus.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope.replace('accounting.', '')}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Connect to Xero to view granted permissions.
                </p>
              )}
            </CardContent>
          </Card>

          {/* OAuth Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                OAuth Configuration
              </CardTitle>
              <CardDescription>
                URLs required for Xero app configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>OAuth Callback URL</Label>
                <div className="flex gap-2">
                  <Input value={callbackUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(callbackUrl, 'Callback URL')}
                  >
                    {copied === 'Callback URL' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this URL to your Xero app&apos;s OAuth 2.0 redirect URIs
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <a
                  href="https://developer.xero.com/app/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Xero Developer Portal
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Real-time updates from Xero
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Delivery URL</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  >
                    {copied === 'Webhook URL' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Setup Instructions</AlertTitle>
                <AlertDescription className="space-y-2">
                  <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                    <li>Go to Xero Developer Portal &gt; Your App &gt; Webhooks</li>
                    <li>Add a new webhook subscription</li>
                    <li>Paste the Delivery URL above</li>
                    <li>Select event types (Invoices, Contacts, Payments)</li>
                    <li>Copy the generated Webhook Key</li>
                    <li>Add as <code className="bg-muted px-1 rounded">XERO_WEBHOOK_KEY</code> in Vercel</li>
                    <li>Redeploy and click &quot;Send Intent to Receive&quot; in Xero</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <a
                  href="https://developer.xero.com/documentation/webhooks/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Xero Webhook Documentation
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Environment Variables Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              Required environment variables for Xero integration (set in Vercel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Variable</th>
                    <th className="text-left py-2 font-medium">Description</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">XERO_CLIENT_ID</code>
                    </td>
                    <td className="py-2 text-muted-foreground">OAuth Client ID from Xero</td>
                    <td className="py-2">
                      <Badge variant={connectionStatus?.isConfigured ? 'default' : 'destructive'}>
                        {connectionStatus?.isConfigured ? 'Set' : 'Missing'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">XERO_CLIENT_SECRET</code>
                    </td>
                    <td className="py-2 text-muted-foreground">OAuth Client Secret from Xero</td>
                    <td className="py-2">
                      <Badge variant={connectionStatus?.isConfigured ? 'default' : 'destructive'}>
                        {connectionStatus?.isConfigured ? 'Set' : 'Missing'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">XERO_WEBHOOK_KEY</code>
                    </td>
                    <td className="py-2 text-muted-foreground">Webhook signing key from Xero</td>
                    <td className="py-2">
                      <Badge variant="secondary">Required for webhooks</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">NEXT_PUBLIC_APP_URL</code>
                    </td>
                    <td className="py-2 text-muted-foreground">Your application URL</td>
                    <td className="py-2">
                      <code className="text-xs">{appUrl}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              See the{' '}
              <Link href="/docs/integrations/XERO_INTEGRATION_GUIDE.md" className="underline">
                Xero Integration Guide
              </Link>{' '}
              for detailed setup instructions.
            </p>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
