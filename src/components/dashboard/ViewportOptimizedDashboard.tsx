"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  CheckCircle,
  Star,
  Award,
  TrendingUp,
  Calendar,
  Settings,
  Plus,
  Activity,
} from "lucide-react"

// Minimal data for demonstration
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

interface CompactMetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

const CompactMetricCard: React.FC<CompactMetricCardProps> = ({ title, value, icon, color = "blue" }) => {
  return (
    <Card className="h-20">
      <CardContent className="p-3 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-full bg-${color}-50 text-${color}-600`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ViewportOptimizedDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState("30")

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 border-b bg-background">
        <div className="flex items-center justify-between p-4 h-16">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-28">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7d</SelectItem>
                <SelectItem value="30">30d</SelectItem>
                <SelectItem value="90">90d</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="px-2">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Stats Grid - Fixed Height */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <CompactMetricCard
              title="Total Suppliers"
              value={mockStats.totalSuppliers}
              icon={<Building2 className="h-4 w-4" />}
              color="blue"
            />
            <CompactMetricCard
              title="Active"
              value={mockStats.activeSuppliers}
              icon={<CheckCircle className="h-4 w-4" />}
              color="green"
            />
            <CompactMetricCard
              title="Strategic"
              value={mockStats.strategicPartners}
              icon={<Star className="h-4 w-4" />}
              color="purple"
            />
            <CompactMetricCard
              title="Avg Rating"
              value={`${mockStats.avgRating}/5`}
              icon={<Award className="h-4 w-4" />}
              color="yellow"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Performance Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>On-Time Delivery</span>
                      <span className="font-medium">{mockStats.onTimeDelivery}%</span>
                    </div>
                    <Progress value={mockStats.onTimeDelivery} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quality Score</span>
                      <span className="font-medium">{mockStats.qualityScore}%</span>
                    </div>
                    <Progress value={mockStats.qualityScore} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 border rounded">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Suppliers */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Suppliers
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <a href="/suppliers">View All</a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSuppliers.map((supplier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{supplier.name}</div>
                        <div className="text-xs text-muted-foreground">{supplier.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{supplier.rating}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {supplier.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Action Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button size="sm" className="rounded-full h-12 w-12 p-0 shadow-lg" asChild>
          <a href="/suppliers/new" title="Add Supplier">
            <Plus className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}

export default ViewportOptimizedDashboard