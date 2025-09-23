"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Shield,
  Users,
  Crown,
  UserCheck,
  Settings,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  Key,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

interface Role {
  id: string
  name: string
  description: string
  type: 'system' | 'custom'
  userCount: number
  permissions: string[]
  createdAt: string
  updatedAt: string
  isDefault: boolean
  canModify: boolean
}

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  roles: string[]
  status: 'active' | 'inactive'
  lastLogin: string
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
      canModify: false
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
      canModify: true
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
      canModify: true
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
      canModify: true
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
      canModify: true
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
      canModify: true
    }
  ])

  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@acme.com',
      roles: ['2'],
      status: 'active',
      lastLogin: '2 hours ago'
    },
    {
      id: '2',
      name: 'Sarah Davis',
      email: 'sarah@acme.com',
      roles: ['3'],
      status: 'active',
      lastLogin: '1 day ago'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@acme.com',
      roles: ['5'],
      status: 'active',
      lastLogin: '3 days ago'
    }
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isNewRoleDialogOpen, setIsNewRoleDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || role.type === filterType

    return matchesSearch && matchesType
  })

  const getRoleIcon = (role: Role) => {
    if (role.name.includes('Admin') || role.name.includes('System')) {
      return <Crown className="h-4 w-4" />
    }
    if (role.name.includes('Manager')) {
      return <Shield className="h-4 w-4" />
    }
    return <Users className="h-4 w-4" />
  }

  const getRoleColor = (role: Role) => {
    if (role.type === 'system') {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const duplicateRole = (roleId: string) => {
    const originalRole = roles.find(r => r.id === roleId)
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
        canModify: true
      }
      setRoles(prev => [...prev, newRole])
    }
  }

  const deleteRole = (roleId: string) => {
    setRoles(prev => prev.filter(role => role.id !== roleId))
  }

  const viewRoleDetails = (role: Role) => {
    setSelectedRole(role)
    setIsViewDialogOpen(true)
  }

  const totalRoles = roles.length
  const customRoles = roles.filter(role => role.type === 'custom').length
  const systemRoles = roles.filter(role => role.type === 'system').length
  const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Role Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage user roles and permissions across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/admin/roles/permissions">
              <Key className="h-4 w-4 mr-2" />
              Manage Permissions
            </a>
          </Button>
          <Button asChild>
            <a href="/admin/roles/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Roles</p>
                <p className="text-2xl font-bold">{totalRoles}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Custom Roles</p>
                <p className="text-2xl font-bold">{customRoles}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Roles</p>
                <p className="text-2xl font-bold">{systemRoles}</p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Users with Roles</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getRoleIcon(role)}
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Badge className={getRoleColor(role)} variant="secondary">
                    {role.type}
                  </Badge>
                  {role.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{role.description}</p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Users assigned</span>
                <span className="font-medium">{role.userCount}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Permissions</span>
                <span className="font-medium">
                  {role.permissions.includes('*') ? 'All' : role.permissions.length}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last updated</span>
                <span className="font-medium">
                  {new Date(role.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Permissions Preview */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Key Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 3).map((permission) => (
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewRoleDetails(role)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {role.canModify && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/roles/${role.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateRole(role.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {role.canModify && role.type === 'custom' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRole(role.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first custom role"
              }
            </p>
            {!searchTerm && filterType === "all" && (
              <Button asChild>
                <a href="/admin/roles/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
                  <Label className="text-sm text-gray-500">Type</Label>
                  <Badge className={getRoleColor(selectedRole)} variant="secondary">
                    {selectedRole.type}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Users Assigned</Label>
                  <p className="font-medium">{selectedRole.userCount}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Created</Label>
                  <p className="font-medium">{new Date(selectedRole.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Last Updated</Label>
                  <p className="font-medium">{new Date(selectedRole.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Description</Label>
                <p className="text-sm mt-1">{selectedRole.description}</p>
              </div>

              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Permissions</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedRole.permissions.map((permission) => (
                    <div key={permission} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-mono">{permission}</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Users with this role */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Users with this Role</Label>
                <div className="space-y-2">
                  {users
                    .filter(user => user.roles.includes(selectedRole.id))
                    .map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {user.lastLogin}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedRole.canModify && (
                  <Button asChild>
                    <a href={`/admin/roles/${selectedRole.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
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
  )
}