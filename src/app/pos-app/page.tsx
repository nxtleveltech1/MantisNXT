"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Package,
  Receipt,
  Store,
  DollarSign,
  TrendingUp,
  Settings,
  ArrowRight,
  Activity,
  ArrowLeft,
} from "lucide-react"

export default function POSHome() {
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    todayOrders: 0,
    lowStockItems: 0,
    totalProducts: 0,
  })
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch("/api/pos-app/stats")
      if (!response.ok) throw new Error("Failed to fetch stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title="POS System" subtitle="Point of Sale Dashboard" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.push("/portal")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/pos-app/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          <div className="space-y-8 max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
              <p className="text-gray-600">Here's what's happening with your business today</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Sales (30d)</CardTitle>
              <DollarSign className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold">${stats.totalSales.toFixed(2)}</div>
              )}
              <p className="text-xs opacity-80 mt-1">+12% from last month</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Today's Orders</CardTitle>
              <Receipt className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold">{stats.todayOrders}</div>
              )}
              <p className="text-xs opacity-80 mt-1">Active sales today</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Low Stock Alert</CardTitle>
              <Package className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">{stats.lowStockItems}</div>
                  {stats.lowStockItems > 0 && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Action needed
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-xs opacity-80 mt-1">Items need restocking</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Products</CardTitle>
              <TrendingUp className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold">{stats.totalProducts}</div>
              )}
              <p className="text-xs opacity-80 mt-1">In your inventory</p>
            </CardContent>
          </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    size="lg"
                    className="h-24 flex-col gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                    onClick={() => router.push("/pos-app/pos")}
                  >
                    <ShoppingCart className="h-8 w-8" />
                    <span className="font-semibold">Start Selling</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-24 flex-col gap-3 border-2 hover:bg-gray-50 shadow-sm bg-transparent"
                    onClick={() => router.push("/pos-app/products")}
                  >
                    <Package className="h-8 w-8 text-gray-600" />
                    <span className="font-semibold text-gray-700">Manage Products</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-24 flex-col gap-3 border-2 hover:bg-gray-50 shadow-sm bg-transparent"
                    onClick={() => router.push("/pos-app/orders")}
                  >
                    <Receipt className="h-8 w-8 text-gray-600" />
                    <span className="font-semibold text-gray-700">View Orders</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-24 flex-col gap-3 border-2 hover:bg-gray-50 shadow-sm bg-transparent"
                    onClick={() => router.push("/pos-app/settings")}
                  >
                    <Settings className="h-8 w-8 text-gray-600" />
                    <span className="font-semibold text-gray-700">Settings</span>
                  </Button>
                </div>
              </CardContent>
        </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>System Status</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      All Systems Operational
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Database Connection</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Payment Processing</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Ready
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium">Inventory Sync</span>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Active
                    </Badge>
                  </div>
                </CardContent>
          </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Quick Links</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => router.push("/pos-app/products")}>
                    <Package className="h-4 w-4 mr-3" />
                    Add New Product
                  </Button>
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => router.push("/pos-app/orders")}>
                    <Receipt className="h-4 w-4 mr-3" />
                    View Recent Orders
                  </Button>
                  <Button variant="ghost" className="w-full justify-start h-12" onClick={() => router.push("/pos-app/settings")}>
                    <Settings className="h-4 w-4 mr-3" />
                    System Diagnostics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

