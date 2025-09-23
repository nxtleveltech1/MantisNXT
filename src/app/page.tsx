"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  CheckCircle,
  Star,
  Award,
  TrendingUp,
  Activity,
  Menu,
  X,
  Home as HomeIcon,
  Users,
  ShoppingCart,
  FileText,
  Package,
  CreditCard,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Plus,
  Bell,
  Shield,
  UserCog,
  BarChart3,
  Lock,
  Database,
  Monitor
} from "lucide-react"

// Mock data with ZAR amounts
const mockStats = {
  totalSuppliers: 247,
  activeSuppliers: 198,
  strategicPartners: 12,
  avgRating: 4.5,
  onTimeDelivery: 92,
  qualityScore: 96,
  totalSpend: "R 125,000,000",
  avgContractValue: "R 2,500,000"
}

const mockSuppliers = [
  { name: "TechCorp Solutions", rating: 4.8, status: "active", category: "Technology", spend: "R 12,500,000" },
  { name: "Global Manufacturing", rating: 4.5, status: "active", category: "Manufacturing", spend: "R 8,750,000" },
  { name: "EcoSupply Solutions", rating: 4.2, status: "pending", category: "Sustainability", spend: "R 3,250,000" }
]

const mockActivities = [
  { title: "Contract Renewed", description: "TechCorp contract completed - R 5,500,000", time: "2h ago", priority: "medium" },
  { title: "Payment Processed", description: "Global Manufacturing - R 1,250,000", time: "4h ago", priority: "high" },
  { title: "New Supplier", description: "EcoSupply onboarded - R 750,000 initial order", time: "6h ago", priority: "low" }
]

const sidebarItems = [
  { icon: HomeIcon, label: "Dashboard", href: "/", active: true },
  { icon: Building2, label: "Suppliers", href: "/suppliers", badge: "22" },
  { icon: Users, label: "Add Supplier", href: "/suppliers/new" },
  { icon: ShoppingCart, label: "Purchase Orders", href: "/purchase-orders", badge: "12" },
  { icon: FileText, label: "Contracts", href: "/contracts", badge: "5" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: CreditCard, label: "Invoices", href: "/invoices", badge: "8" },
  { icon: DollarSign, label: "Payments", href: "/payments" },
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: "3" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  // Admin Section
  { type: "separator", label: "Administration" },
  { icon: UserCog, label: "Users", href: "/admin/users", badge: "125" },
  { icon: Shield, label: "Roles & Permissions", href: "/admin/roles" },
  { icon: Building2, label: "Organizations", href: "/admin/organizations" },
  { icon: Settings, label: "System Settings", href: "/admin/settings/general" },
  { icon: Monitor, label: "Monitoring", href: "/admin/monitoring/dashboard" },
  { icon: Database, label: "Audit Logs", href: "/admin/audit" },
  { icon: Lock, label: "Security", href: "/admin/security" },
  // Auth Section
  { type: "separator", label: "Authentication" },
  { icon: Lock, label: "Login", href: "/auth/login" },
  { icon: Users, label: "Register", href: "/auth/register" }
]

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar - Fixed Width */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-semibold">MantisNXT</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {sidebarItems.map((item, index) => {
            if (item.type === "separator") {
              return sidebarOpen ? (
                <div key={index} className="px-3 py-2 mt-4 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {item.label}
                  </h3>
                </div>
              ) : (
                <div key={index} className="border-t my-2" />
              )
            }

            return (
              <a
                key={index}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 hover:bg-gray-100 transition-colors ${
                  item.active ? 'bg-gray-100' : ''
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="text-sm flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </a>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t p-2">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 w-full">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <span className="text-xs font-semibold">JD</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold">Dashboard Overview</h1>
            <p className="text-sm text-gray-500">Welcome to MantisNXT Procurement Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                3
              </span>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
            <a href="/auth/login">
              <Button variant="outline" size="sm">
                <Lock className="h-4 w-4 mr-2" />
                Login
              </Button>
            </a>
          </div>
        </header>

        {/* Dashboard Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Grid with ZAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Suppliers</p>
                    <p className="text-2xl font-bold">{mockStats.totalSuppliers}</p>
                    <p className="text-xs text-green-600">Annual Spend: {mockStats.totalSpend}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Suppliers</p>
                    <p className="text-2xl font-bold">{mockStats.activeSuppliers}</p>
                    <p className="text-xs text-blue-600">87.5% Local (SA)</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Strategic Partners</p>
                    <p className="text-2xl font-bold">{mockStats.strategicPartners}</p>
                    <p className="text-xs text-purple-600">BEE Level 1-4</p>
                  </div>
                  <Star className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Contract Value</p>
                    <p className="text-2xl font-bold">{mockStats.avgContractValue}</p>
                    <p className="text-xs text-orange-600">Rating: {mockStats.avgRating}/5</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access to New Features */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Manage users, roles, and permissions across your organization.
                </p>
                <div className="flex gap-2">
                  <a href="/admin/users">
                    <Button size="sm" variant="outline">View Users</Button>
                  </a>
                  <a href="/admin/roles">
                    <Button size="sm" variant="outline">Manage Roles</Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Monitor security, audit logs, and POPIA compliance.
                </p>
                <div className="flex gap-2">
                  <a href="/admin/security">
                    <Button size="sm" variant="outline">Security</Button>
                  </a>
                  <a href="/admin/audit">
                    <Button size="sm" variant="outline">Audit Logs</Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Configure system settings, integrations, and workflows.
                </p>
                <div className="flex gap-2">
                  <a href="/admin/settings/general">
                    <Button size="sm" variant="outline">Settings</Button>
                  </a>
                  <a href="/admin/monitoring/dashboard">
                    <Button size="sm" variant="outline">Monitor</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Supplier Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">On-Time Delivery</span>
                      <span className="text-sm font-medium">{mockStats.onTimeDelivery}%</span>
                    </div>
                    <Progress value={mockStats.onTimeDelivery} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Quality Score</span>
                      <span className="text-sm font-medium">{mockStats.qualityScore}%</span>
                    </div>
                    <Progress value={mockStats.qualityScore} className="h-2" />
                  </div>
                </div>

                {/* Suppliers List with ZAR amounts */}
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Top Suppliers (ZAR)</h3>
                  <div className="space-y-3">
                    {mockSuppliers.map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{supplier.name}</p>
                            <p className="text-xs text-gray-500">{supplier.category} • {supplier.spend}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{supplier.rating}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {supplier.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed with ZAR */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockActivities.map((activity, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Activity className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">
                              {activity.priority}
                            </Badge>
                            <span className="text-xs text-gray-400">{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  )
}