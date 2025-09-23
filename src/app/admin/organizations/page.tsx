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
import {
  Building2,
  Users,
  Crown,
  Settings,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Shield,
  CreditCard,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  Activity,
  TrendingUp,
  DollarSign
} from "lucide-react"

interface Organization {
  id: string
  name: string
  domain: string
  logo?: string
  tier: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  userCount: number
  maxUsers: number
  storageUsed: number
  storageLimit: number
  monthlySpend: number
  contactEmail: string
  contactPhone: string
  address: string
  primaryContact: string
  features: string[]
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([
    {
      id: '1',
      name: 'Acme Corporation',
      domain: 'acme.mantisnxt.com',
      logo: '/logos/acme.png',
      tier: 'enterprise',
      status: 'active',
      createdAt: '2023-01-15',
      userCount: 125,
      maxUsers: 500,
      storageUsed: 45.2,
      storageLimit: 100,
      monthlySpend: 2500,
      contactEmail: 'admin@acme.com',
      contactPhone: '+27 11 123 4567',
      address: '123 Business Park, Johannesburg',
      primaryContact: 'John Smith',
      features: ['api_access', 'advanced_analytics', 'priority_support', 'custom_integrations']
    },
    {
      id: '2',
      name: 'TechStart Solutions',
      domain: 'techstart.mantisnxt.com',
      tier: 'professional',
      status: 'active',
      createdAt: '2023-03-22',
      userCount: 25,
      maxUsers: 100,
      storageUsed: 12.8,
      storageLimit: 50,
      monthlySpend: 450,
      contactEmail: 'contact@techstart.co.za',
      contactPhone: '+27 21 456 7890',
      address: '456 Innovation Hub, Cape Town',
      primaryContact: 'Sarah Johnson',
      features: ['api_access', 'standard_analytics', 'email_support']
    },
    {
      id: '3',
      name: 'Local Business Co',
      domain: 'localbiz.mantisnxt.com',
      tier: 'starter',
      status: 'active',
      createdAt: '2023-06-10',
      userCount: 8,
      maxUsers: 25,
      storageUsed: 3.1,
      storageLimit: 10,
      monthlySpend: 99,
      contactEmail: 'info@localbiz.co.za',
      contactPhone: '+27 31 789 0123',
      address: '789 Main Street, Durban',
      primaryContact: 'Mike Wilson',
      features: ['basic_analytics', 'email_support']
    },
    {
      id: '4',
      name: 'Suspended Corp',
      domain: 'suspended.mantisnxt.com',
      tier: 'professional',
      status: 'suspended',
      createdAt: '2023-02-08',
      userCount: 0,
      maxUsers: 100,
      storageUsed: 8.5,
      storageLimit: 50,
      monthlySpend: 0,
      contactEmail: 'admin@suspended.com',
      contactPhone: '+27 11 234 5678',
      address: '321 Inactive Street, Pretoria',
      primaryContact: 'Jane Doe',
      features: ['api_access', 'standard_analytics']
    }
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterTier, setFilterTier] = useState<string>("all")
  const [isNewOrgDialogOpen, setIsNewOrgDialogOpen] = useState(false)

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || org.status === filterStatus
    const matchesTier = filterTier === "all" || org.tier === filterTier

    return matchesSearch && matchesStatus && matchesTier
  })

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800'
      case 'professional':
        return 'bg-blue-100 text-blue-800'
      case 'starter':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Crown className="h-4 w-4" />
      case 'professional':
        return <Shield className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const suspendOrganization = (orgId: string) => {
    setOrganizations(prev => prev.map(org =>
      org.id === orgId ? { ...org, status: 'suspended' as const } : org
    ))
  }

  const activateOrganization = (orgId: string) => {
    setOrganizations(prev => prev.map(org =>
      org.id === orgId ? { ...org, status: 'active' as const } : org
    ))
  }

  const deleteOrganization = (orgId: string) => {
    setOrganizations(prev => prev.filter(org => org.id !== orgId))
  }

  const totalOrganizations = organizations.length
  const activeOrganizations = organizations.filter(org => org.status === 'active').length
  const totalUsers = organizations.reduce((sum, org) => sum + org.userCount, 0)
  const totalRevenue = organizations.reduce((sum, org) => sum + org.monthlySpend, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organization Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage multi-tenant organizations and their settings
          </p>
        </div>
        <Dialog open={isNewOrgDialogOpen} onOpenChange={setIsNewOrgDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input id="orgName" placeholder="Enter organization name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgDomain">Domain</Label>
                <Input id="orgDomain" placeholder="company.mantisnxt.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgTier">Tier</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" placeholder="admin@company.com" />
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">Create Organization</Button>
                <Button variant="outline" onClick={() => setIsNewOrgDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Organizations</p>
                <p className="text-2xl font-bold">{totalOrganizations}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Organizations</p>
                <p className="text-2xl font-bold">{activeOrganizations}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-bold">R{totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
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
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <div className="space-y-4">
        {filteredOrganizations.map((org) => (
          <Card key={org.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={org.logo} alt={org.name} />
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{org.name}</h3>
                      <Badge className={getTierColor(org.tier)} variant="secondary">
                        {getTierIcon(org.tier)}
                        <span className="ml-1 capitalize">{org.tier}</span>
                      </Badge>
                      <Badge className={getStatusColor(org.status)} variant="secondary">
                        {org.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Domain
                        </p>
                        <p className="font-medium">{org.domain}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Users
                        </p>
                        <p className="font-medium">{org.userCount} / {org.maxUsers}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Monthly Spend
                        </p>
                        <p className="font-medium">R{org.monthlySpend.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created
                        </p>
                        <p className="font-medium">{new Date(org.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Contact
                        </p>
                        <p className="font-medium">{org.contactEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Location
                        </p>
                        <p className="font-medium">{org.address}</p>
                      </div>
                    </div>

                    {/* Storage Usage */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">Storage Usage</span>
                        <span>{org.storageUsed} GB / {org.storageLimit} GB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(org.storageUsed / org.storageLimit) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mt-3">
                      <p className="text-gray-500 text-sm mb-2">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {org.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/organizations/${org.id}`}>
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/organizations/billing?org=${org.id}`}>
                      <CreditCard className="h-4 w-4" />
                    </a>
                  </Button>
                  {org.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => suspendOrganization(org.id)}
                    >
                      Suspend
                    </Button>
                  ) : org.status === 'suspended' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => activateOrganization(org.id)}
                    >
                      Activate
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteOrganization(org.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrganizations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== "all" || filterTier !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first organization"
              }
            </p>
            {!searchTerm && filterStatus === "all" && filterTier === "all" && (
              <Button onClick={() => setIsNewOrgDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}