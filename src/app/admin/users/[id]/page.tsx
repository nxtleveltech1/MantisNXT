'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import type { User } from '@/types/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateUserFormSchema } from '@/lib/auth/validation';
import type { z } from 'zod';

type UpdateUserFormData = z.infer<typeof updateUserFormSchema>;

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Shield,
  Save,
  X,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Lock,
} from 'lucide-react';
import { USER_ROLES, EMPLOYMENT_EQUITY_OPTIONS } from '@/types/auth';
import { formatDate } from '@/lib/auth/validation';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(updateUserFormSchema),
  });

  const loadUser = useCallback(async () => {
    // Handle "new" user case - don't try to fetch
    if (userId === 'new') {
      setIsLoading(false);
      setIsEditing(true); // Start in edit mode for new user
      reset({
        name: '',
        email: '',
        role: 'user',
        department: '',
        phone: '',
        is_active: true,
        permissions: [],
        id_number: '',
        employment_equity: undefined,
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get auth token from localStorage
      const authToken =
        typeof window !== 'undefined' ? localStorage.getItem('mantis_auth_token') : null;

      const headers: HeadersInit = {};

      // Add Authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        if (response.status === 404) {
          setUser(null);
          setError('User not found');
          return;
        }
        throw new Error(result.message || 'Failed to load user');
      }

      const foundUser = result.data;
      // Transform API response to match User type
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.displayName || `${foundUser.firstName} ${foundUser.lastName}`.trim(),
        role: foundUser.roles?.[0]?.slug || 'user',
        org_id: foundUser.orgId,
        department: foundUser.department || '',
        permissions: [],
        created_at: foundUser.createdAt,
        last_login: foundUser.lastLoginAt,
        is_active: foundUser.isActive,
        profile_image: foundUser.avatarUrl,
        phone: foundUser.phone || '',
        mobile: foundUser.mobile,
        preferences: {
          language: 'en',
          timezone: 'Africa/Johannesburg',
          date_format: 'dd/mm/yyyy',
          currency: 'ZAR',
          notifications: {
            email_notifications: true,
            sms_notifications: false,
            push_notifications: true,
            digest_frequency: 'daily',
          },
        },
        two_factor_enabled: foundUser.twoFactorEnabled || false,
        email_verified: foundUser.emailVerified || false,
        password_changed_at: new Date(),
        id_number: '',
        employment_equity: undefined,
      };

      setUser(userData);
      reset({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        phone: userData.phone,
        is_active: userData.is_active,
        permissions: userData.permissions.map(p => p.id),
        id_number: userData.id_number || '',
        employment_equity: userData.employment_equity,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [reset, router, userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const onSubmit = async (data: UpdateUserFormData) => {
    const isNewUser = userId === 'new';

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const url = isNewUser ? '/api/v1/admin/users' : `/api/v1/admin/users/${userId}`;

      const method = isNewUser ? 'POST' : 'PUT';

      // Get auth token from localStorage
      const authToken =
        typeof window !== 'undefined' ? localStorage.getItem('mantis_auth_token') : null;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify({
          firstName: data.name.split(' ')[0],
          lastName: data.name.split(' ').slice(1).join(' '),
          displayName: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          role: data.role,
          isActive: data.is_active,
          sendInvitation: isNewUser ? true : false, // Send invitation email for new users
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error(result.message || `Failed to ${isNewUser ? 'create' : 'update'} user`);
      }

      setSuccess(`User ${isNewUser ? 'created' : 'updated'} successfully`);

      if (isNewUser) {
        // Redirect to the new user's page
        router.push(`/admin/users/${result.data?.id || userId}`);
      } else {
        setIsEditing(false);
        await loadUser();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${isNewUser ? 'create' : 'update'} user`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    if (
      !window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      // Get auth token from localStorage
      const authToken =
        typeof window !== 'undefined' ? localStorage.getItem('mantis_auth_token') : null;

      const headers: HeadersInit = {};

      // Add Authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete user');
      }

      router.push('/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const toggleStatus = async () => {
    if (!user) return;

    try {
      // Get auth token from localStorage
      const authToken =
        typeof window !== 'undefined' ? localStorage.getItem('mantis_auth_token') : null;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify({
          isActive: !user.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update user status');
      }

      await loadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: userId === 'new' ? 'New User' : 'Loading...' },
        ]}
      >
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  // For "new" user, show create form even without user data
  const isNewUser = userId === 'new';

  if (!isNewUser && !user) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Not Found' },
        ]}
      >
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>User not found</AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/admin/users')} variant="outline">
              Back to Users
            </Button>
            <Button onClick={() => router.push('/admin/users/new')}>Create User</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Users', href: '/admin/users' },
        { label: isNewUser ? 'New User' : user?.name || 'User' },
      ]}
    >
      <div className="space-y-6">
        {/* Header with User Info */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profile_image} />
              <AvatarFallback className="text-lg">
                {isNewUser ? 'NU' : user ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">
                {isNewUser ? 'New User' : user?.name || 'User'}
              </h1>
              {!isNewUser && user && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline">
                    {USER_ROLES.find(r => r.value === user.role)?.label}
                  </Badge>
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {user.two_factor_enabled && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      2FA
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isEditing || isNewUser ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isNewUser) {
                      router.push('/admin/users');
                    } else {
                      setIsEditing(false);
                      reset();
                    }
                  }}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSaving || (!isNewUser && !isDirty)}
                >
                  {isSaving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {isNewUser ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isNewUser ? 'Create User' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                {user && (
                  <>
                    <Button
                      variant={user.is_active ? 'outline' : 'default'}
                      size="sm"
                      onClick={toggleStatus}
                    >
                      {user.is_active ? (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            {!isNewUser && (
              <>
                <TabsTrigger value="permissions">
                  <Shield className="mr-2 h-4 w-4" />
                  Permissions
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Lock className="mr-2 h-4 w-4" />
                  Security
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Basic user information and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        {...register('name')}
                        disabled={!isEditing}
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          disabled={!isEditing}
                          className={errors.email ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          {...register('phone')}
                          disabled={!isEditing}
                          placeholder="+27 11 123 4567"
                          className={errors.phone ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="department"
                          {...register('department')}
                          disabled={!isEditing}
                          className={errors.department ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.department && (
                        <p className="text-sm text-red-600">{errors.department.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={watch('role')}
                        onValueChange={value =>
                          setValue('role', value as unknown, { shouldDirty: true })
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employment_equity">Employment Equity</Label>
                      <Select
                        value={watch('employment_equity') || ''}
                        onValueChange={value =>
                          setValue('employment_equity', value as unknown, { shouldDirty: true })
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="employment_equity">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_EQUITY_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="id_number">ID Number (Optional)</Label>
                      <Input
                        id="id_number"
                        {...register('id_number')}
                        disabled={!isEditing}
                        placeholder="8001015009087"
                        className={errors.id_number ? 'border-red-500' : ''}
                      />
                      {errors.id_number && (
                        <p className="text-sm text-red-600">{errors.id_number.message}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={watch('is_active')}
                        onCheckedChange={checked =>
                          setValue('is_active', checked, { shouldDirty: true })
                        }
                        disabled={!isEditing}
                      />
                      <Label htmlFor="is_active">Account Active</Label>
                    </div>
                  </div>

                  {!isNewUser && user && (
                    <>
                      <Separator />

                      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="ml-2 font-medium">{formatDate(user.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Login:</span>
                          <span className="ml-2 font-medium">
                            {user.last_login ? formatDate(user.last_login) : 'Never'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email Verified:</span>
                          <span className="ml-2 font-medium">
                            {user.email_verified ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Password Changed:</span>
                          <span className="ml-2 font-medium">
                            {formatDate(user.password_changed_at)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Permissions Tab */}
          {!isNewUser && user && (
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>User Permissions</CardTitle>
                  <CardDescription>Manage permissions and access controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {user.permissions.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        No permissions assigned
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {user.permissions.map(permission => (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div>
                              <p className="font-medium">{permission.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {permission.resource} - {permission.action}
                              </p>
                            </div>
                            <Badge variant="outline">{permission.action}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Activity Tab */}
          {!isNewUser && user && (
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>User login history and actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 rounded-lg border p-4">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Last Login</p>
                        <p className="text-sm text-muted-foreground">
                          {user.last_login ? formatDate(user.last_login) : 'Never logged in'}
                        </p>
                      </div>
                    </div>
                    <div className="py-8 text-center text-muted-foreground">
                      <p>Activity tracking coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Security Tab */}
          {!isNewUser && user && (
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Authentication and security configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-4">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">
                          {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={user.two_factor_enabled ? 'default' : 'secondary'}>
                      {user.two_factor_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-4">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email_verified ? 'Verified' : 'Not Verified'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={user.email_verified ? 'default' : 'secondary'}>
                      {user.email_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      Force Password Reset
                    </Button>
                    <Button variant="outline" className="w-full">
                      Reset Two-Factor Authentication
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
