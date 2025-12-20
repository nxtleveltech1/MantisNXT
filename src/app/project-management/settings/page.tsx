'use client';

import React, { useEffect, useState } from 'react';
import { Save, TestTube2, RefreshCw, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSecureAuth } from '@/hooks/useSecureAuth';

interface ConnectionStatus {
  connected: boolean;
  validated?: boolean;
  lastValidatedAt?: string;
}

export default function ProjectManagementSettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useSecureAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (authLoading) return;
    loadStatus();
  }, [authLoading]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/project-management/dartai/connect');
      const data = await res.json();
      if (data.error && data.error.code !== 'DARTAI_NOT_CONNECTED') {
        throw new Error(data.error.message || 'Failed to load connection status');
      }
      setStatus(data.data || { connected: false });
    } catch (error: unknown) {
      toast({
        title: 'Failed to load status',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!token.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your Dart-AI API token',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/project-management/dartai/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to connect');
      }

      toast({
        title: 'Connected',
        description: data.data.validated
          ? 'Dart-AI account connected and validated successfully'
          : 'Dart-AI account connected, but token validation failed',
        variant: data.data.validated ? 'default' : 'destructive',
      });

      setToken('');
      await loadStatus();
    } catch (error: unknown) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!status?.connected) {
      toast({
        title: 'Not Connected',
        description: 'Please connect your Dart-AI account first',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/v1/project-management/dartai/connect');
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Connection test failed');
      }

      toast({
        title: 'Connection Test',
        description: data.data.connected
          ? 'Connection is active and working'
          : 'Connection is not active',
        variant: data.data.connected ? 'default' : 'destructive',
      });

      await loadStatus();
    } catch (error: unknown) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Dart-AI account?')) return;

    setDisconnecting(true);
    try {
      const res = await fetch('/api/v1/project-management/dartai/connect', {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to disconnect');
      }

      toast({
        title: 'Disconnected',
        description: 'Dart-AI account has been disconnected',
      });

      await loadStatus();
    } catch (error: unknown) {
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout
        title="Project Management Settings"
        breadcrumbs={[
          { label: 'Project Management', href: '/project-management' },
          { label: 'Settings' },
        ]}
      >
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout
        title="Project Management Settings"
        breadcrumbs={[
          { label: 'Project Management', href: '/project-management' },
          { label: 'Settings' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold">Authentication Required</h3>
            <p className="text-muted-foreground text-center">Please sign in to access settings</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Project Management Settings"
      breadcrumbs={[
        { label: 'Project Management', href: '/project-management' },
        { label: 'Settings' },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dart-AI Connection</CardTitle>
            <CardDescription>Connect your Dart-AI account to enable Project Management features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.connected ? (
              <>
                <div className="flex items-center justify-between rounded-lg border bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Connected</p>
                      <p className="text-muted-foreground text-sm">
                        {status.validated
                          ? 'Token validated successfully'
                          : 'Token stored but not yet validated'}
                        {status.lastValidatedAt &&
                          ` • Last validated: ${new Date(status.lastValidatedAt).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={status.validated ? 'default' : 'secondary'}>
                    {status.validated ? 'Validated' : 'Pending'}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                    {testing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube2 className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                    {disconnecting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleConnect();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="token">Dart-AI API Token</Label>
                  <Input
                    id="token"
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Enter your Dart-AI API token"
                    autoComplete="current-password"
                  />
                  <p className="text-muted-foreground text-xs">
                    You can find your API token in your Dart-AI account settings. The token will be encrypted and
                    stored securely.
                  </p>
                </div>

                <Button type="submit" disabled={saving || !token.trim()}>
                  {saving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Connect Account
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Dart-AI Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Dart-AI is a powerful project management tool with AI-powered task management and chat capabilities.
            </p>
            <p>
              By connecting your Dart-AI account, you can manage tasks, dartboards, and interact with the AI agent
              directly from MantisNXT.
            </p>
            <p>
              <a
                href="https://app.dartai.com/api/v0/public/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                View Dart-AI API documentation
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}










