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
  BarChart3,
  Target,
  Zap,
  Shield,
  MapPin,
  Percent
} from "lucide-react"

import { formatZAR, formatCompactZAR, getBEELevelColor, formatSADate } from "@/lib/zar-utils"
import {
  ZAR_DASHBOARD_STATS,
  ZAR_DASHBOARD_SUPPLIERS,
  ZAR_DASHBOARD_ACTIVITIES,
  ZAR_FINANCIAL_SUMMARY,
  ZAR_BEE_METRICS,
  ZAR_PROVINCIAL_SPEND
} from "@/lib/mock-data/zar-dashboard-data"

const sidebarItems = [
  { icon: HomeIcon, label: "Dashboard", href: "/", active: true },
  { icon: Building2, label: "Suppliers", href: "/suppliers", badge: "247" },
  { icon: Users, label: "Add Supplier", href: "/suppliers/new" },
  { icon: ShoppingCart, label: "Purchase Orders", href: "/purchase-orders", badge: "12" },
  { icon: FileText, label: "Contracts", href: "/contracts", badge: "5" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: CreditCard, label: "Invoices", href: "/invoices", badge: "8" },
  { icon: DollarSign, label: "Payments", href: "/payments" },
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: "3" }
]

export default function ZARDashboard() {
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
                <p className="text-xs text-gray-500">Procurement Manager</p>
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
            <p className="text-sm text-gray-500">South African Procurement Management - {formatSADate(new Date())}</p>
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
          </div>
        </header>

        {/* Dashboard Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Annual Spend</p>
                    <p className="text-2xl font-bold">{formatCompactZAR(ZAR_FINANCIAL_SUMMARY.totalAnnualSpend)}</p>
                    <p className="text-xs text-gray-500">87.5% Local Suppliers</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">BEE Compliant Spend</p>
                    <p className="text-2xl font-bold">{formatCompactZAR(ZAR_BEE_METRICS.beeSpendActual)}</p>
                    <p className="text-xs text-green-600">+1.6% over target</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Suppliers</p>
                    <p className="text-2xl font-bold">{ZAR_DASHBOARD_STATS.totalSuppliers}</p>
                    <p className="text-xs text-gray-500">{ZAR_DASHBOARD_STATS.activeSuppliers} Active</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Outstanding Payables</p>
                    <p className="text-2xl font-bold">{formatCompactZAR(ZAR_FINANCIAL_SUMMARY.outstandingPayables)}</p>
                    <p className="text-xs text-gray-500">Avg {ZAR_FINANCIAL_SUMMARY.averagePaymentDays} days</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">VAT Recoverable</p>
                    <p className="text-2xl font-bold">{formatCompactZAR(ZAR_FINANCIAL_SUMMARY.vatRecoverable)}</p>
                  </div>
                  <Percent className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Early Payment Savings</p>
                    <p className="text-2xl font-bold">{formatCompactZAR(ZAR_FINANCIAL_SUMMARY.earlyPaymentSavings)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Performance</p>
                    <p className="text-2xl font-bold">{ZAR_DASHBOARD_STATS.avgRating}/5</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">On-Time Delivery</p>
                    <p className="text-2xl font-bold">{ZAR_DASHBOARD_STATS.onTimeDelivery}%</p>
                  </div>
                  <Target className="h-8 w-8 text-cyan-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* BEE Compliance Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  BEE Compliance & Supplier Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">BEE Compliant Spend</span>
                      <span className="text-sm font-medium">65.0% ({formatCompactZAR(ZAR_BEE_METRICS.beeSpendActual)})</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Black-Owned Suppliers</span>
                      <span className="text-sm font-medium">36.0% ({formatCompactZAR(ZAR_BEE_METRICS.blackOwnedSpend)})</span>
                    </div>
                    <Progress value={36} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Women-Owned Suppliers</span>
                      <span className="text-sm font-medium">22.5% ({formatCompactZAR(ZAR_BEE_METRICS.womenOwnedSpend)})</span>
                    </div>
                    <Progress value={22.5} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Youth-Owned Suppliers</span>
                      <span className="text-sm font-medium">12.5% ({formatCompactZAR(ZAR_BEE_METRICS.youthOwnedSpend)})</span>
                    </div>
                    <Progress value={12.5} className="h-2" />
                  </div>
                </div>

                {/* Top Suppliers List */}
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Top Performing Suppliers</h3>
                  <div className="space-y-3">
                    {ZAR_DASHBOARD_SUPPLIERS.map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{supplier.name}</p>
                            <p className="text-xs text-gray-500">{supplier.category} • {formatCompactZAR(supplier.totalSpend)} spend</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{supplier.rating}</span>
                          </div>
                          <Badge className={getBEELevelColor(supplier.beeLevel)} variant="outline">
                            BEE L{supplier.beeLevel}
                          </Badge>
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
                  {ZAR_DASHBOARD_ACTIVITIES.map((activity, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        {activity.type === 'compliance' && <Shield className="h-4 w-4 text-purple-500 mt-0.5" />}
                        {activity.type === 'payment' && <CreditCard className="h-4 w-4 text-red-500 mt-0.5" />}
                        {activity.type === 'onboarding' && <Users className="h-4 w-4 text-green-500 mt-0.5" />}
                        {activity.type === 'purchase_order' && <ShoppingCart className="h-4 w-4 text-blue-500 mt-0.5" />}
                        {activity.type === 'vat' && <Percent className="h-4 w-4 text-indigo-500 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                          {activity.amount > 0 && (
                            <p className="text-xs text-gray-600 mt-1">{formatZAR(activity.amount)}</p>
                          )}
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

          {/* Provincial Spend Distribution */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Provincial Spend Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Gauteng</span>
                      <span className="text-sm font-medium">{formatCompactZAR(ZAR_PROVINCIAL_SPEND.GP)}</span>
                    </div>
                    <Progress value={36} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Western Cape</span>
                      <span className="text-sm font-medium">{formatCompactZAR(ZAR_PROVINCIAL_SPEND.WC)}</span>
                    </div>
                    <Progress value={21} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">KwaZulu-Natal</span>
                      <span className="text-sm font-medium">{formatCompactZAR(ZAR_PROVINCIAL_SPEND.KZN)}</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Eastern Cape</span>
                      <span className="text-sm font-medium">{formatCompactZAR(ZAR_PROVINCIAL_SPEND.EC)}</span>
                    </div>
                    <Progress value={9} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Mpumalanga</span>
                      <span className="text-sm font-medium">{formatCompactZAR(ZAR_PROVINCIAL_SPEND.MP)}</span>
                    </div>
                    <Progress value={7} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Other Provinces</span>
                      <span className="text-sm font-medium">{formatCompactZAR(ZAR_PROVINCIAL_SPEND.LP + ZAR_PROVINCIAL_SPEND.FS + ZAR_PROVINCIAL_SPEND.NW + ZAR_PROVINCIAL_SPEND.NC)}</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
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