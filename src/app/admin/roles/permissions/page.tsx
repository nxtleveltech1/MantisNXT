"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Key,
  Shield,
  Search,
  Save,
  Undo2,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  Building2,
  FileText,
  CreditCard,
  Settings,
  BarChart3
} from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string
  category: string
  level: 'read' | 'write' | 'admin'
  isSystem: boolean
}

interface PermissionCategory {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  permissions: Permission[]
}

interface Role {
  id: string
  name: string
  permissions: string[]
}

export default function PermissionsPage() {
  const [permissionCategories] = useState<PermissionCategory[]>([
    {
      id: 'users',
      name: 'User Management',
      description: 'Manage users, roles, and authentication',
      icon: <Users className="h-5 w-5" />,
      permissions: [
        {
          id: 'users.view',
          name: 'View Users',
          description: 'View user profiles and basic information',
          category: 'users',
          level: 'read',
          isSystem: false
        },
        {
          id: 'users.create',
          name: 'Create Users',
          description: 'Add new users to the system',
          category: 'users',
          level: 'write',
          isSystem: false
        },
        {
          id: 'users.edit',
          name: 'Edit Users',
          description: 'Modify user profiles and settings',
          category: 'users',
          level: 'write',
          isSystem: false
        },
        {
          id: 'users.delete',
          name: 'Delete Users',
          description: 'Remove users from the system',
          category: 'users',
          level: 'admin',
          isSystem: false
        },
        {
          id: 'users.impersonate',
          name: 'Impersonate Users',
          description: 'Login as another user for support purposes',
          category: 'users',
          level: 'admin',
          isSystem: true
        }
      ]
    },
    {
      id: 'organizations',
      name: 'Organizations',
      description: 'Manage multi-tenant organizations',
      icon: <Building2 className="h-5 w-5" />,
      permissions: [
        {
          id: 'organizations.view',
          name: 'View Organizations',
          description: 'View organization details and settings',
          category: 'organizations',
          level: 'read',
          isSystem: false
        },
        {
          id: 'organizations.create',
          name: 'Create Organizations',
          description: 'Create new organizations',
          category: 'organizations',
          level: 'admin',
          isSystem: true
        },
        {
          id: 'organizations.edit',
          name: 'Edit Organizations',
          description: 'Modify organization settings',
          category: 'organizations',
          level: 'write',
          isSystem: false
        },
        {
          id: 'organizations.delete',
          name: 'Delete Organizations',
          description: 'Remove organizations from the system',
          category: 'organizations',
          level: 'admin',
          isSystem: true
        },
        {
          id: 'organizations.billing',
          name: 'Manage Billing',
          description: 'Access billing and subscription information',
          category: 'organizations',
          level: 'admin',
          isSystem: false
        }
      ]
    },
    {
      id: 'suppliers',
      name: 'Supplier Management',
      description: 'Manage suppliers and vendor relationships',
      icon: <Building2 className="h-5 w-5" />,
      permissions: [
        {
          id: 'suppliers.view',
          name: 'View Suppliers',
          description: 'View supplier profiles and information',
          category: 'suppliers',
          level: 'read',
          isSystem: false
        },
        {
          id: 'suppliers.create',
          name: 'Create Suppliers',
          description: 'Add new suppliers to the system',
          category: 'suppliers',
          level: 'write',
          isSystem: false
        },
        {
          id: 'suppliers.edit',
          name: 'Edit Suppliers',
          description: 'Modify supplier information and settings',
          category: 'suppliers',
          level: 'write',
          isSystem: false
        },
        {
          id: 'suppliers.approve',
          name: 'Approve Suppliers',
          description: 'Approve or reject supplier applications',
          category: 'suppliers',
          level: 'admin',
          isSystem: false
        },
        {
          id: 'suppliers.delete',
          name: 'Delete Suppliers',
          description: 'Remove suppliers from the system',
          category: 'suppliers',
          level: 'admin',
          isSystem: false
        }
      ]
    },
    {
      id: 'orders',
      name: 'Purchase Orders',
      description: 'Manage purchase orders and procurement',
      icon: <FileText className="h-5 w-5" />,
      permissions: [
        {
          id: 'orders.view',
          name: 'View Orders',
          description: 'View purchase order details',
          category: 'orders',
          level: 'read',
          isSystem: false
        },
        {
          id: 'orders.create',
          name: 'Create Orders',
          description: 'Create new purchase orders',
          category: 'orders',
          level: 'write',
          isSystem: false
        },
        {
          id: 'orders.edit',
          name: 'Edit Orders',
          description: 'Modify purchase order details',
          category: 'orders',
          level: 'write',
          isSystem: false
        },
        {
          id: 'orders.approve',
          name: 'Approve Orders',
          description: 'Approve purchase orders for processing',
          category: 'orders',
          level: 'admin',
          isSystem: false
        },
        {
          id: 'orders.cancel',
          name: 'Cancel Orders',
          description: 'Cancel or void purchase orders',
          category: 'orders',
          level: 'admin',
          isSystem: false
        }
      ]
    },
    {
      id: 'finance',
      name: 'Finance & Billing',
      description: 'Manage invoices, payments, and financial data',
      icon: <CreditCard className="h-5 w-5" />,
      permissions: [
        {
          id: 'invoices.view',
          name: 'View Invoices',
          description: 'View invoice details and history',
          category: 'finance',
          level: 'read',
          isSystem: false
        },
        {
          id: 'invoices.create',
          name: 'Create Invoices',
          description: 'Generate new invoices',
          category: 'finance',
          level: 'write',
          isSystem: false
        },
        {
          id: 'payments.view',
          name: 'View Payments',
          description: 'View payment records and transactions',
          category: 'finance',
          level: 'read',
          isSystem: false
        },
        {
          id: 'payments.process',
          name: 'Process Payments',
          description: 'Process and record payments',
          category: 'finance',
          level: 'write',
          isSystem: false
        },
        {
          id: 'finance.reports',
          name: 'Financial Reports',
          description: 'Access financial reporting and analytics',
          category: 'finance',
          level: 'read',
          isSystem: false
        }
      ]
    },
    {
      id: 'system',
      name: 'System Administration',
      description: 'System-level configuration and management',
      icon: <Settings className="h-5 w-5" />,
      permissions: [
        {
          id: 'system.settings',
          name: 'System Settings',
          description: 'Access and modify system configuration',
          category: 'system',
          level: 'admin',
          isSystem: true
        },
        {
          id: 'system.backup',
          name: 'Backup Management',
          description: 'Manage system backups and restores',
          category: 'system',
          level: 'admin',
          isSystem: true
        },
        {
          id: 'system.audit',
          name: 'Audit Logs',
          description: 'View system audit logs and activity',
          category: 'system',
          level: 'read',
          isSystem: true
        },
        {
          id: 'system.monitoring',
          name: 'System Monitoring',
          description: 'Access system performance and health data',
          category: 'system',
          level: 'read',
          isSystem: true
        },
        {
          id: 'system.integrations',
          name: 'Manage Integrations',
          description: 'Configure API keys and integrations',
          category: 'system',
          level: 'admin',
          isSystem: true
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Reporting',
      description: 'Access reports and business intelligence',
      icon: <BarChart3 className="h-5 w-5" />,
      permissions: [
        {
          id: 'analytics.view',
          name: 'View Analytics',
          description: 'Access basic analytics and dashboards',
          category: 'analytics',
          level: 'read',
          isSystem: false
        },
        {
          id: 'analytics.advanced',
          name: 'Advanced Analytics',
          description: 'Access detailed analytics and custom reports',
          category: 'analytics',
          level: 'read',
          isSystem: false
        },
        {
          id: 'reports.create',
          name: 'Create Reports',
          description: 'Generate custom reports and exports',
          category: 'analytics',
          level: 'write',
          isSystem: false
        },
        {
          id: 'reports.schedule',
          name: 'Schedule Reports',
          description: 'Schedule automated report generation',
          category: 'analytics',
          level: 'write',
          isSystem: false
        }
      ]
    }
  ])

  const [roles] = useState<Role[]>([
    {
      id: '1',
      name: 'System Administrator',
      permissions: ['*']
    },
    {
      id: '2',
      name: 'Organization Admin',
      permissions: ['users.view', 'users.create', 'users.edit', 'organizations.view', 'organizations.edit']
    },
    {
      id: '3',
      name: 'Procurement Manager',
      permissions: ['suppliers.view', 'suppliers.create', 'suppliers.edit', 'orders.view', 'orders.create', 'orders.edit', 'orders.approve']
    }
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRole, setSelectedRole] = useState("all")
  const [hasChanges, setHasChanges] = useState(false)
  const [showSystemPermissions, setShowSystemPermissions] = useState(false)

  const allPermissions = permissionCategories.flatMap(category => category.permissions)

  const filteredPermissions = allPermissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || permission.category === selectedCategory
    const matchesSystemFilter = showSystemPermissions || !permission.isSystem

    return matchesSearch && matchesCategory && matchesSystemFilter
  })

  const getPermissionLevel = (level: string) => {
    switch (level) {
      case 'read':
        return { color: 'bg-blue-100 text-blue-800', icon: <Key className="h-3 w-3" /> }
      case 'write':
        return { color: 'bg-green-100 text-green-800', icon: <Unlock className="h-3 w-3" /> }
      case 'admin':
        return { color: 'bg-red-100 text-red-800', icon: <Lock className="h-3 w-3" /> }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <Key className="h-3 w-3" /> }
    }
  }

  const hasPermission = (roleId: string, permissionId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return false
    return role.permissions.includes('*') || role.permissions.includes(permissionId)
  }

  const handleSave = () => {
    // Save permission changes
    setHasChanges(false)
  }

  const handleReset = () => {
    // Reset changes
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Permission Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage granular permissions across all system features
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {permissionCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showSystem"
                checked={showSystemPermissions}
                onCheckedChange={(checked) => setShowSystemPermissions(Boolean(checked))}
              />
              <label htmlFor="showSystem" className="text-sm font-medium">
                Show System Permissions
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Categories */}
      <div className="space-y-6">
        {permissionCategories
          .filter(category =>
            selectedCategory === "all" || category.id === selectedCategory
          )
          .map((category) => {
            const categoryPermissions = category.permissions.filter(permission =>
              filteredPermissions.includes(permission)
            )

            if (categoryPermissions.length === 0) return null

            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.icon}
                    {category.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Permission Table Header */}
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                      <div className="col-span-5">Permission</div>
                      <div className="col-span-2">Level</div>
                      <div className="col-span-5">Role Access</div>
                    </div>

                    {/* Permission Rows */}
                    {categoryPermissions.map((permission) => {
                      const levelInfo = getPermissionLevel(permission.level)

                      return (
                        <div key={permission.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
                          <div className="col-span-5">
                            <div className="flex items-center gap-2">
                              {permission.isSystem && (
                                <Shield className="h-4 w-4 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">{permission.name}</p>
                                <p className="text-sm text-gray-500">{permission.description}</p>
                                <code className="text-xs bg-gray-100 px-1 rounded">{permission.id}</code>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Badge className={levelInfo.color} variant="secondary">
                              {levelInfo.icon}
                              <span className="ml-1 capitalize">{permission.level}</span>
                            </Badge>
                          </div>

                          <div className="col-span-5">
                            <div className="flex gap-2 flex-wrap">
                              {roles.map((role) => (
                                <div key={role.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${permission.id}-${role.id}`}
                                    checked={hasPermission(role.id, permission.id)}
                                    onCheckedChange={() => setHasChanges(true)}
                                  />
                                  <label
                                    htmlFor={`${permission.id}-${role.id}`}
                                    className="text-sm"
                                  >
                                    {role.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {filteredPermissions.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No permissions found matching your current filters. Try adjusting your search criteria.
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{allPermissions.filter(p => p.level === 'read').length}</p>
              <p className="text-sm text-blue-800">Read Permissions</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{allPermissions.filter(p => p.level === 'write').length}</p>
              <p className="text-sm text-green-800">Write Permissions</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{allPermissions.filter(p => p.level === 'admin').length}</p>
              <p className="text-sm text-red-800">Admin Permissions</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{allPermissions.filter(p => p.isSystem).length}</p>
              <p className="text-sm text-purple-800">System Permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}