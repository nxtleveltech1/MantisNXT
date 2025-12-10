'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, Upload, Plus, Users, Activity, Shield, User as UserIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth/auth-context';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import type { User } from '@/types/auth';

import { UserTable } from '@/components/admin/users/UserTable';
import type { UserFilterState } from '@/components/admin/users/UserFilters';
import { UserFilters } from '@/components/admin/users/UserFilters';

export default function UsersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { getToken } = useClerkAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: 'all',
    department: 'all',
    status: 'all',
    createdFrom: undefined,
    createdTo: undefined,
  });

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check authentication
      if (!isAuthenticated) {
        console.warn('[UsersPage] Not authenticated, redirecting to login');
        router.push('/auth/login');
        return;
      }

      // Get Clerk session token
      const token = await getToken();

      if (!token) {
        console.warn('[UsersPage] No Clerk token found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      console.log('[UsersPage] Clerk token obtained');

      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch('/api/v1/admin/users', {
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[UsersPage] API error:', response.status, result);
        if (response.status === 401) {
          console.warn('[UsersPage] Unauthorized, redirecting to login');
          router.push('/auth/login');
          return;
        }
        throw new Error(result.message || 'Failed to load users');
      }

      // Transform API response to match User type
      const userList = result.data.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.displayName,
        role: u.roles?.[0]?.slug || 'user',
        org_id: u.organizationId || '',
        department: u.department || '',
        permissions: [],
        created_at: u.createdAt,
        last_login: u.lastLoginAt,
        is_active: u.isActive,
        profile_image: undefined,
        phone: u.phone || '',
        mobile: u.mobile,
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
        two_factor_enabled: u.twoFactorEnabled || false,
        email_verified: u.emailVerified || false,
        password_changed_at: new Date(),
      }));

      setUsers(userList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [router, isAuthenticated, getToken]);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to load users
    if (!authLoading) {
      loadUsers();
    }
  }, [loadUsers, authLoading]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set(users.map(u => u.department))).sort();
  }, [users]);

  // Filter users based on all active filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.department.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Role filter
      if (filters.role !== 'all' && user.role !== filters.role) {
        return false;
      }

      // Department filter
      if (filters.department !== 'all' && user.department !== filters.department) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const isActive = filters.status === 'active';
        if (user.is_active !== isActive) return false;
      }

      // Date range filters
      if (filters.createdFrom) {
        const userDate = new Date(user.created_at);
        if (userDate < filters.createdFrom) return false;
      }

      if (filters.createdTo) {
        const userDate = new Date(user.created_at);
        // Set to end of day for inclusive comparison
        const toDate = new Date(filters.createdTo);
        toDate.setHours(23, 59, 59, 999);
        if (userDate > toDate) return false;
      }

      return true;
    });
  }, [users, filters]);

  const handleDeleteUser = async (user: User) => {
    if (
      !window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete user');
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !user.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update user status');
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleBulkAction = async (selectedUsers: User[], action: string) => {
    if (selectedUsers.length === 0) return;

    const confirmMessage = `Are you sure you want to ${action} ${selectedUsers.length} user(s)?`;
    if (action === 'delete' && !window.confirm(confirmMessage)) return;

    try {
      switch (action) {
        case 'activate':
          await Promise.all(
            selectedUsers.map(user =>
              fetch(`/api/v1/admin/users/${user.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: true }),
              })
            )
          );
          break;
        case 'deactivate':
          await Promise.all(
            selectedUsers.map(user =>
              fetch(`/api/v1/admin/users/${user.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: false }),
              })
            )
          );
          break;
        case 'delete':
          await Promise.all(
            selectedUsers.map(user =>
              fetch(`/api/v1/admin/users/${user.id}`, {
                method: 'DELETE',
              })
            )
          );
          break;
        case 'assign-role':
          // Navigate to bulk operations page
          router.push('/admin/users/bulk');
          return;
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} users`);
    }
  };

  const exportUsers = () => {
    const csvContent = [
      'Name,Email,Role,Department,Status,Created Date,Last Login',
      ...filteredUsers.map(user =>
        [
          user.name,
          user.email,
          user.role,
          user.department,
          user.is_active ? 'Active' : 'Inactive',
          new Date(user.created_at).toLocaleDateString('en-ZA'),
          user.last_login ? new Date(user.last_login).toLocaleDateString('en-ZA') : 'Never',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      department: 'all',
      status: 'all',
      createdFrom: undefined,
      createdTo: undefined,
    });
  };

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={exportUsers} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Link href="/admin/users/bulk">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
            </Link>

            <Link href="/admin/users/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-chart-2 text-3xl font-bold">
                {users.filter(u => u.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">2FA Enabled</CardTitle>
              <Shield className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.two_factor_enabled).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <UserIcon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <UserFilters
          departments={departments}
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

        {/* User Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription>View and manage all users in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <UserTable
              data={filteredUsers}
              onDelete={handleDeleteUser}
              onToggleStatus={toggleUserStatus}
              onBulkAction={handleBulkAction}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
