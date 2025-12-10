'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Users,
  Crown,
  UserCheck,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  Key,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  canModify: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
  status: 'active' | 'inactive';
  lastLogin: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      name: 'System Administrator',
      description: 'Full system access with all permissions',
      type: 'system',
      userCount: 2,
      permissions: ['*'],
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      isDefault: false,
      canModify: false,
    },
    {
      id: '2',
      name: 'Organization Admin',
      description: 'Full access within organization scope',
      type: 'system',
      userCount: 5,
      permissions: ['org.admin', 'users.manage', 'settings.manage', 'billing.view'],
      createdAt: '2023-01-01',
      updatedAt: '2023-06-15',
      isDefault: true,
      canModify: true,
    },
    {
      id: '3',
      name: 'Procurement Manager',
      description: 'Manage procurement processes and suppliers',
      type: 'custom',
      userCount: 12,
      permissions: ['suppliers.manage', 'orders.manage', 'contracts.manage', 'reports.view'],
      createdAt: '2023-02-15',
      updatedAt: '2023-11-20',
      isDefault: false,
      canModify: true,
    },
    {
      id: '4',
      name: 'Finance Manager',
      description: 'Handle financial operations and reporting',
      type: 'custom',
      userCount: 8,
      permissions: ['invoices.manage', 'payments.manage', 'reports.financial', 'analytics.view'],
      createdAt: '2023-03-10',
      updatedAt: '2023-10-05',
      isDefault: false,
      canModify: true,
    },
    {
      id: '5',
      name: 'Supplier Manager',
      description: 'Manage supplier relationships and onboarding',
      type: 'custom',
      userCount: 15,
      permissions: ['suppliers.manage', 'suppliers.onboard', 'communications.manage'],
      createdAt: '2023-04-20',
      updatedAt: '2023-12-01',
      isDefault: false,
      canModify: true,
    },
    {
      id: '6',
      name: 'Read Only',
      description: 'View-only access to system data',
      type: 'system',
      userCount: 25,
      permissions: ['*.view'],
      createdAt: '2023-01-01',
      updatedAt: '2023-08-12',
      isDefault: false,
      canModify: true,
    },
  ]);

  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@acme.com',
      roles: ['2'],
      status: 'active',
      lastLogin: '2 hours ago',
    },
    {
      id: '2',
      name: 'Sarah Davis',
      email: 'sarah@acme.com',
      roles: ['3'],
      status: 'active',
      lastLogin: '1 day ago',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@acme.com',
      roles: ['5'],
      status: 'active',
      lastLogin: '3 days ago',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const filteredRoles = roles.filter(role => {
    const matchesSearch =
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || role.type === filterType;

    return matchesSearch && matchesType;
  });

  const getRoleIcon = (role: Role) => {
    if (role.name.includes('Admin') || role.name.includes('System')) {
      return <Crown className="h-4 w-4" />;
    }
    if (role.name.includes('Manager')) {
      return <Shield className="h-4 w-4" />;
    }
    return <Users className="h-4 w-4" />;
  };

  const duplicateRole = (roleId: string) => {
    const originalRole = roles.find(r => r.id === roleId);
    if (originalRole) {
      const newRole: Role = {
        ...originalRole,
        id: Date.now().toString(),
        name: `${originalRole.name} (Copy)`,
        type: 'custom',
        userCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        isDefault: false,
        canModify: true,
      };
      setRoles(prev => [...prev, newRole]);
    }
  };

  const deleteRole = (roleId: string) => {
    setRoles(prev => prev.filter(role => role.id !== roleId));
  };

  const viewRoleDetails = (role: Role) => {
    setSelectedRole(role);
    setIsViewDialogOpen(true);
  };

  const totalRoles = roles.length;
  const customRoles = roles.filter(role => role.type === 'custom').length;
  const systemRoles = roles.filter(role => role.type === 'system').length;
  const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0);

  return (
    <AppLayout breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Roles' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">
              Manage user roles and permissions across your organization
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/roles/permissions">
                <Key className="mr-2 h-4 w-4" />
                Manage Permissions
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href="/admin/roles/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRoles}</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{customRoles}</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Roles</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{systemRoles}</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users with Roles</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="system">System Roles</SelectItem>
                  <SelectItem value="custom">Custom Roles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Roles List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles ({filteredRoles.length})
            </CardTitle>
            <CardDescription>View and manage all roles in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map(role => (
                <div
                  key={role.id}
                  className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role)}
                      <span className="font-semibold">{role.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={role.type === 'system' ? 'default' : 'secondary'}>
                        {role.type}
                      </Badge>
                      {role.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="mb-4 text-sm text-muted-foreground">{role.description}</p>

                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Users assigned</span>
                      <span className="font-medium">{role.userCount}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Permissions</span>
                      <span className="font-medium">
                        {role.permissions.includes('*') ? 'All' : role.permissions.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last updated</span>
                      <span className="font-medium">
                        {new Date(role.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Permissions Preview */}
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Key Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map(permission => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {role.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-border pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewRoleDetails(role)}
                      className="flex-1"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    {role.canModify && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/roles/${role.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => duplicateRole(role.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {role.canModify && role.type === 'custom' && (
                      <Button variant="outline" size="sm" onClick={() => deleteRole(role.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredRoles.length === 0 && (
              <div className="py-12 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No roles found</h3>
                <p className="mb-4 text-muted-foreground">
                  {searchTerm || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first custom role'}
                </p>
                {!searchTerm && filterType === 'all' && (
                  <Button asChild>
                    <a href="/admin/roles/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Role
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedRole && getRoleIcon(selectedRole)}
                {selectedRole?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <div className="mt-1">
                      <Badge variant={selectedRole.type === 'system' ? 'default' : 'secondary'}>
                        {selectedRole.type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Users Assigned</Label>
                    <p className="font-medium">{selectedRole.userCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Created</Label>
                    <p className="font-medium">
                      {new Date(selectedRole.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Last Updated</Label>
                    <p className="font-medium">
                      {new Date(selectedRole.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedRole.description}</p>
                </div>

                <div>
                  <Label className="mb-2 block text-sm text-muted-foreground">Permissions</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {selectedRole.permissions.map(permission => (
                      <div
                        key={permission}
                        className="flex items-center justify-between rounded bg-muted p-2"
                      >
                        <span className="font-mono text-sm">{permission}</span>
                        <CheckCircle className="h-4 w-4 text-chart-2" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users with this role */}
                <div>
                  <Label className="mb-2 block text-sm text-muted-foreground">
                    Users with this Role
                  </Label>
                  <div className="space-y-2">
                    {users
                      .filter(user => user.roles.includes(selectedRole.id))
                      .map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 rounded bg-muted p-2"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>
                              {user.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                            <p className="mt-1 text-xs text-muted-foreground">
                              <Clock className="mr-1 inline h-3 w-3" />
                              {user.lastLogin}
                            </p>
                          </div>
                        </div>
                      ))}
                    {users.filter(user => user.roles.includes(selectedRole.id)).length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No users assigned to this role
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  {selectedRole.canModify && (
                    <Button asChild>
                      <a href={`/admin/roles/${selectedRole.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Role
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
