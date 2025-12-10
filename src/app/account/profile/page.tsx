'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { Save, CheckCircle2, User as UserIcon } from 'lucide-react';

import { useAuth } from '@/lib/auth/auth-context';

interface ProfileFormData {
  name: string;
  phone: string;
  mobile?: string;
  department: string;
}

export default function AccountProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ProfileFormData>({
    defaultValues: {
      name: '',
      phone: '',
      mobile: '',
      department: '',
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Reset form when user loads
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        phone: user.phone,
        mobile: user.mobile || '',
        department: user.department,
      });
    }
  }, [user, form]);

  // Show loading state while checking authentication
  if (authLoading || !isAuthenticated || !user) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Profile' }]}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.name.split(' ')[0],
          lastName: data.name.split(' ').slice(1).join(' '),
          displayName: data.name,
          phone: data.phone,
          mobile: data.mobile,
          department: data.department,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully');
      // Form will be reset with updated data when user context updates
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Account', href: '/account' }, { label: 'Profile' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and profile details
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.profile_image} alt={user.name} />
                  <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </div>
              <Button variant="outline" className="w-full">
                Change Picture
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register('name', { required: 'Name is required' })} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={user.email} disabled />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed. Contact administrator.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...form.register('phone', { required: 'Phone is required' })}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile (Optional)</Label>
                    <Input id="mobile" {...form.register('mobile')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      {...form.register('department', { required: 'Department is required' })}
                    />
                    {form.formState.errors.department && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.department.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Read-only account details and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Verified</Label>
                <div className="flex items-center gap-2">
                  {user.email_verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {user.email_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Member Since</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
