'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, CheckCircle2, Bell, Globe, Palette, Eye } from 'lucide-react';

import { authProvider } from '@/lib/auth/mock-provider';
import type { User as UserType } from '@/types/auth';

interface PreferencesFormData {
  language: string;
  timezone: string;
  date_format: string;
  currency: string;
  theme: 'light' | 'dark' | 'auto';
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  digest_frequency: string;
  profile_visibility: string;
  show_email: boolean;
  show_phone: boolean;
}

export default function AccountPreferencesPage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const [preferences, setPreferences] = useState<PreferencesFormData>({
    language: 'en',
    timezone: 'Africa/Johannesburg',
    date_format: 'dd/mm/yyyy',
    currency: 'ZAR',
    theme: 'light',
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    digest_frequency: 'daily',
    profile_visibility: 'organization',
    show_email: false,
    show_phone: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await authProvider.getCurrentUser();
        if (!currentUser) {
          router.push('/auth/login');
          return;
        }
        setUser(currentUser);
        if (currentUser.preferences) {
          setPreferences({
            language: currentUser.preferences.language || 'en',
            timezone: currentUser.preferences.timezone || 'Africa/Johannesburg',
            date_format: currentUser.preferences.date_format || 'dd/mm/yyyy',
            currency: currentUser.preferences.currency || 'ZAR',
            theme: currentUser.preferences.theme || 'light',
            email_notifications: currentUser.preferences.notifications?.email_notifications ?? true,
            sms_notifications: currentUser.preferences.notifications?.sms_notifications ?? false,
            push_notifications: currentUser.preferences.notifications?.push_notifications ?? true,
            digest_frequency: currentUser.preferences.notifications?.digest_frequency || 'daily',
            profile_visibility: 'organization',
            show_email: false,
            show_phone: false,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/v1/users/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: preferences.language,
          timezone: preferences.timezone,
          dateFormat: preferences.date_format,
          timeFormat: '24h',
          currency: preferences.currency,
          theme: preferences.theme,
          notifications: {
            email: preferences.email_notifications,
            sms: preferences.sms_notifications,
            push: preferences.push_notifications,
            digestFrequency: preferences.digest_frequency,
          },
          privacy: {
            profileVisibility: preferences.profile_visibility,
            showEmail: preferences.show_email,
            showPhone: preferences.show_phone,
          },
          accessibility: {
            highContrast: false,
            reducedMotion: false,
            screenReaderOptimized: false,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save preferences');
      }

      setSuccess('Preferences saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Preferences' }]}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Preferences' }]}>
        <Alert variant="destructive">
          <AlertDescription>Failed to load user data</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Preferences' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Preferences</h1>
          <p className="text-muted-foreground">
            Customize your notification settings, theme, and localization preferences
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Localization
              </CardTitle>
              <CardDescription>Language, timezone, and format settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={value => setPreferences({ ...preferences, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="af">Afrikaans</SelectItem>
                    <SelectItem value="zu">Zulu</SelectItem>
                    <SelectItem value="xh">Xhosa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={value => setPreferences({ ...preferences, timezone: value })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={preferences.date_format}
                  onValueChange={value => setPreferences({ ...preferences, date_format: value })}
                >
                  <SelectTrigger id="date_format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={preferences.currency}
                  onValueChange={value => setPreferences({ ...preferences, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR (South African Rand)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Theme and UI preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: 'light' | 'dark' | 'auto') =>
                    setPreferences({ ...preferences, theme: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">Email Notifications</Label>
                  <p className="text-muted-foreground text-sm">Receive notifications via email</p>
                </div>
                <Checkbox
                  id="email_notifications"
                  checked={preferences.email_notifications}
                  onCheckedChange={checked =>
                    setPreferences({
                      ...preferences,
                      email_notifications: checked as boolean,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms_notifications">SMS Notifications</Label>
                  <p className="text-muted-foreground text-sm">Receive notifications via SMS</p>
                </div>
                <Checkbox
                  id="sms_notifications"
                  checked={preferences.sms_notifications}
                  onCheckedChange={checked =>
                    setPreferences({
                      ...preferences,
                      sms_notifications: checked as boolean,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_notifications">Push Notifications</Label>
                  <p className="text-muted-foreground text-sm">
                    Receive push notifications in browser
                  </p>
                </div>
                <Checkbox
                  id="push_notifications"
                  checked={preferences.push_notifications}
                  onCheckedChange={checked =>
                    setPreferences({
                      ...preferences,
                      push_notifications: checked as boolean,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest_frequency">Notification Digest</Label>
                <Select
                  value={preferences.digest_frequency}
                  onValueChange={value =>
                    setPreferences({ ...preferences, digest_frequency: value })
                  }
                >
                  <SelectTrigger id="digest_frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Privacy
              </CardTitle>
              <CardDescription>Control your profile visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile_visibility">Profile Visibility</Label>
                <Select
                  value={preferences.profile_visibility}
                  onValueChange={value =>
                    setPreferences({ ...preferences, profile_visibility: value })
                  }
                >
                  <SelectTrigger id="profile_visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="organization">Organization Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show_email">Show Email</Label>
                  <p className="text-muted-foreground text-sm">
                    Allow others to see your email address
                  </p>
                </div>
                <Checkbox
                  id="show_email"
                  checked={preferences.show_email}
                  onCheckedChange={checked =>
                    setPreferences({ ...preferences, show_email: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show_phone">Show Phone</Label>
                  <p className="text-muted-foreground text-sm">
                    Allow others to see your phone number
                  </p>
                </div>
                <Checkbox
                  id="show_phone"
                  checked={preferences.show_phone}
                  onCheckedChange={checked =>
                    setPreferences({ ...preferences, show_phone: checked as boolean })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
