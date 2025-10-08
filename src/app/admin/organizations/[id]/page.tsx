"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  Users,
  Settings,
  Save,
  Undo2,
  CheckCircle,
  AlertTriangle,
  Crown,
  Shield,
  Database,
  Activity,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  Key,
  Trash2,
  Plus,
  Eye,
  Clock
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
  lastLogin: string
  avatar?: string
}

interface Feature {
  id: string
  name: string
  description: string
  enabled: boolean
  tier: string[]
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [paramData, setParamData] = useState<{ id: string } | null>(null)
  const [organization, setOrganization] = useState({
    id: '',
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
    address: '123 Business Park, Johannesburg, South Africa',
    primaryContact: 'John Smith',
    description: 'Leading manufacturing company specializing in automotive parts and industrial equipment.',
    website: 'https://acme.com',
    industry: 'Manufacturing',
    taxNumber: 'TAX123456789',
    registrationNumber: 'REG987654321'
  })

  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@acme.com',
      role: 'Organization Admin',
      status: 'active',
      lastLogin: '2 hours ago'
    },
    {
      id: '2',
      name: 'Sarah Davis',
      email: 'sarah@acme.com',
      role: 'Procurement Manager',
      status: 'active',
      lastLogin: '1 day ago'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@acme.com',
      role: 'Supplier Manager',
      status: 'active',
      lastLogin: '3 days ago'
    },
    {
      id: '4',
      name: 'Lisa Brown',
      email: 'lisa@acme.com',
      role: 'Finance Manager',
      status: 'inactive',
      lastLogin: '2 weeks ago'
    }
  ])

  const [features, setFeatures] = useState<Feature[]>([
    {
      id: 'api_access',
      name: 'API Access',
      description: 'Full REST API access for integrations',
      enabled: true,
      tier: ['professional', 'enterprise']
    },
    {
      id: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed reporting and analytics dashboard',
      enabled: true,
      tier: ['enterprise']
    },
    {
      id: 'priority_support',
      name: 'Priority Support',
      description: '24/7 phone and email support',
      enabled: true,
      tier: ['enterprise']
    },
    {
      id: 'custom_integrations',
      name: 'Custom Integrations',
      description: 'Dedicated integration support',
      enabled: true,
      tier: ['enterprise']
    },
    {
      id: 'white_label',
      name: 'White Label',
      description: 'Custom branding and domain',
      enabled: false,
      tier: ['enterprise']
    },
    {
      id: 'advanced_workflows',
      name: 'Advanced Workflows',
      description: 'Custom approval workflows',
      enabled: true,
      tier: ['professional', 'enterprise']
    }
  ])

  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Resolve params Promise
  React.useEffect(() => {
    params.then(resolvedParams => {
      setParamData(resolvedParams)
      setOrganization(prev => ({ ...prev, id: resolvedParams.id }))
    })
  }, [params])

  const handleOrgChange = (field: string, value: string) => {
    setOrganization(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleFeatureToggle = (featureId: string) => {
    setFeatures(prev => prev.map(feature =>
      feature.id === featureId ? { ...feature, enabled: !feature.enabled } : feature
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setHasChanges(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    // Reset logic here
    setHasChanges(false)
  }

  const suspendUser = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, status: 'inactive' } : user
    ))
  }

  const activateUser = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, status: 'active' } : user
    ))
  }

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={organization.logo} alt={organization.name} />
            <AvatarFallback>
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">{organization.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-purple-100 text-purple-800" variant="secondary">
                {getTierIcon(organization.tier)}
                <span className="ml-1 capitalize">{organization.tier}</span>
              </Badge>
              <Badge className="bg-green-100 text-green-800" variant="secondary">
                {organization.status}
              </Badge>
            </div>
          </div>
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
            disabled={!hasChanges || isLoading}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Organization settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organization Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Domain
                    </p>
                    <p className="font-medium">{organization.domain}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created
                    </p>
                    <p className="font-medium">{new Date(organization.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Contact Email
                    </p>
                    <p className="font-medium">{organization.contactEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </p>
                    <p className="font-medium">{organization.contactPhone}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Address
                  </p>
                  <p className="font-medium">{organization.address}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{organization.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Industry</p>
                    <p className="font-medium">{organization.industry}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Website</p>
                    <p className="font-medium">{organization.website}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Tax Number</p>
                    <p className="font-medium">{organization.taxNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Registration Number</p>
                    <p className="font-medium">{organization.registrationNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Users</span>
                    <span>{organization.userCount} / {organization.maxUsers}</span>
                  </div>
                  <Progress value={(organization.userCount / organization.maxUsers) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage</span>
                    <span>{organization.storageUsed} GB / {organization.storageLimit} GB</span>
                  </div>
                  <Progress value={(organization.storageUsed / organization.storageLimit) * 100} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Monthly Spend</span>
                    <span className="font-semibold">R{organization.monthlySpend.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Active Users</span>
                    <span className="font-semibold">{users.filter(u => u.status === 'active').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Features Enabled</span>
                    <span className="font-semibold">{features.filter(f => f.enabled).length}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Billing
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Logs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Key className="h-4 w-4 mr-2" />
                    API Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={organization.name}
                    onChange={(e) => handleOrgChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={organization.domain}
                    onChange={(e) => handleOrgChange('domain', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={organization.description}
                    onChange={(e) => handleOrgChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={organization.website}
                    onChange={(e) => handleOrgChange('website', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={organization.industry} onValueChange={(value) => handleOrgChange('industry', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Construction">Construction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={organization.contactEmail}
                    onChange={(e) => handleOrgChange('contactEmail', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input
                    id="contactPhone"
                    value={organization.contactPhone}
                    onChange={(e) => handleOrgChange('contactPhone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={organization.address}
                    onChange={(e) => handleOrgChange('address', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryContact">Primary Contact</Label>
                  <Input
                    id="primaryContact"
                    value={organization.primaryContact}
                    onChange={(e) => handleOrgChange('primaryContact', e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Tax Number</Label>
                  <Input
                    id="taxNumber"
                    value={organization.taxNumber}
                    onChange={(e) => handleOrgChange('taxNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={organization.registrationNumber}
                    onChange={(e) => handleOrgChange('registrationNumber', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Organization Users</span>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {user.lastLogin}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user.status === 'active' ? (
                          <Button variant="outline" size="sm" onClick={() => suspendUser(user.id)}>
                            Suspend
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => activateUser(user.id)}>
                            Activate
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => deleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{feature.name}</h4>
                        <div className="flex gap-1">
                          {feature.tier.map((tier) => (
                            <Badge key={tier} variant="outline" className="text-xs">
                              {tier}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                    <Checkbox
                      checked={feature.enabled}
                      onCheckedChange={() => handleFeatureToggle(feature.id)}
                      disabled={!feature.tier.includes(organization.tier)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage */}
        <TabsContent value="usage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Users</span>
                    <span>{organization.userCount} / {organization.maxUsers}</span>
                  </div>
                  <Progress value={(organization.userCount / organization.maxUsers) * 100} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Storage</span>
                    <span>{organization.storageUsed} GB / {organization.storageLimit} GB</span>
                  </div>
                  <Progress value={(organization.storageUsed / organization.storageLimit) * 100} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>API Calls (this month)</span>
                    <span>45,230 / 100,000</span>
                  </div>
                  <Progress value={45.23} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Data Transfer</span>
                    <span>15.2 GB / 50 GB</span>
                  </div>
                  <Progress value={30.4} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">1,247</p>
                    <p className="text-sm text-blue-800">Orders (30 days)</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">89</p>
                    <p className="text-sm text-green-800">Suppliers</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">567</p>
                    <p className="text-sm text-purple-800">Invoices</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">23</p>
                    <p className="text-sm text-yellow-800">Contracts</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Recent Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Last login</span>
                      <span className="text-gray-500">2 hours ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last order</span>
                      <span className="text-gray-500">5 hours ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last invoice</span>
                      <span className="text-gray-500">1 day ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last payment</span>
                      <span className="text-gray-500">3 days ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}