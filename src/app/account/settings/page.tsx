'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Lock, Bell, Eye, Shield, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth/auth-context';

export default function AccountSettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const router = useRouter();

  // Redirect to login if not authenticated (only after auth check is complete)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Settings' }]}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  // Don't render if not authenticated (redirect is happening)
  if (!isAuthenticated || !user) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Settings' }]}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Settings' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information, security, and preferences
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Bell className="mr-2 h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Eye className="mr-2 h-4 w-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={user.email} disabled />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed. Contact administrator.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" defaultValue={user.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" defaultValue={user.department} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password, two-factor authentication, and active sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">Password</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Change your password to keep your account secure
                    </p>
                    <Link href="/account/security">
                      <Button variant="outline">
                        <Lock className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </Link>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="mb-2 text-lg font-semibold">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {user.two_factor_enabled
                            ? '2FA is enabled on your account'
                            : 'Add an extra layer of security to your account'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.two_factor_enabled ? (
                          <Shield className="h-5 w-5 text-green-500" />
                        ) : (
                          <Shield className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Button variant="outline" size="sm">
                          {user.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="mb-2 text-lg font-semibold">Active Sessions</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Manage devices that are currently signed in to your account
                    </p>
                    <Link href="/account/security">
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        View Active Sessions
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your notification settings, theme, and localization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/account/preferences">
                  <Button variant="outline">
                    <Bell className="mr-2 h-4 w-4" />
                    Manage Preferences
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control who can see your profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <select
                    id="profile-visibility"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="organization"
                  >
                    <option value="public">Public</option>
                    <option value="organization">Organization Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
