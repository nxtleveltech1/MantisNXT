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
  Home,
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
  Bell
} from "lucide-react"

// Mock data
const mockStats = {
  totalSuppliers: 247,
  activeSuppliers: 198,
  strategicPartners: 12,
  avgRating: 4.5,
  onTimeDelivery: 92,
  qualityScore: 96
}

const mockSuppliers = [
  { name: "TechCorp Solutions", rating: 4.8, status: "active", category: "Technology" },
  { name: "Global Manufacturing", rating: 4.5, status: "active", category: "Manufacturing" },
  { name: "EcoSupply Solutions", rating: 4.2, status: "pending", category: "Sustainability" }
]

const mockActivities = [
  { title: "Contract Renewed", description: "TechCorp contract completed", time: "2h ago", priority: "medium" },
  { title: "Delivery Delayed", description: "Global Manufacturing delay", time: "4h ago", priority: "high" },
  { title: "New Supplier", description: "EcoSupply onboarded", time: "6h ago", priority: "low" }
]

const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/", active: true },
  { icon: Building2, label: "Suppliers", href: "/suppliers", badge: "22" },
  { icon: Users, label: "Add Supplier", href: "/suppliers/new" },
  { icon: ShoppingCart, label: "Purchase Orders", href: "/purchase-orders", badge: "12" },
  { icon: FileText, label: "Contracts", href: "/contracts", badge: "5" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: CreditCard, label: "Invoices", href: "/invoices", badge: "8" },
  { icon: DollarSign, label: "Payments", href: "/payments" },
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: "3" }
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
          {sidebarItems.map((item, index) => (
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
          ))}
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
          <h1 className="text-xl font-semibold">Dashboard Overview</h1>
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
          </div>
        </header>

        {/* Dashboard Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Suppliers</p>
                    <p className="text-2xl font-bold">{mockStats.totalSuppliers}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-bold">{mockStats.activeSuppliers}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Strategic</p>
                    <p className="text-2xl font-bold">{mockStats.strategicPartners}</p>
                  </div>
                  <Star className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Rating</p>
                    <p className="text-2xl font-bold">{mockStats.avgRating}/5</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
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

                {/* Suppliers List */}
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Top Suppliers</h3>
                  <div className="space-y-3">
                    {mockSuppliers.map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{supplier.name}</p>
                            <p className="text-xs text-gray-500">{supplier.category}</p>
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

            {/* Activity Feed */}
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