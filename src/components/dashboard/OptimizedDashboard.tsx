"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, formatCurrency, formatPercentage, getStatusColor, getTierColor } from "@/lib/utils"
import {
  Supplier,
  DashboardActivity,
} from "@/types/supplier"
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Award,
  Settings,
  Building2,
  Target,
  Activity,
  ArrowUpRight,
  MoreHorizontal,
  Eye,
  Edit,
  RefreshCw,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react"

// Compact sample data
const sampleSuppliers: Supplier[] = [
  {
    id: "1",
    name: "TechCorp Solutions",
    code: "TECH001",
    status: "active",
    tier: "strategic",
    category: "Technology",
    tags: ["preferred"],
    contacts: [],
    addresses: [],
    businessInfo: {
      legalName: "TechCorp Solutions Inc",
      tradingName: "TechCorp",
      taxId: "12-3456789",
      registrationNumber: "REG123456",
      website: "https://techcorp.com",
      foundedYear: 2010,
      employeeCount: 250,
      annualRevenue: 50000000,
      currency: "USD"
    },
    capabilities: {
      products: ["Software"],
      services: ["Consulting"],
      certifications: [],
      leadTime: 30,
      paymentTerms: "Net 30"
    },
    performance: {
      overallRating: 4.8,
      qualityRating: 4.9,
      deliveryRating: 4.7,
      serviceRating: 4.8,
      priceRating: 4.6,
      metrics: {
        onTimeDeliveryRate: 95,
        qualityAcceptanceRate: 98,
        responseTime: 2,
        defectRate: 1.5,
        leadTimeVariance: 5
      },
      kpis: [],
      lastEvaluationDate: new Date(),
      nextEvaluationDate: new Date()
    },
    financial: {
      creditRating: "A",
      paymentTerms: "Net 30",
      currency: "USD"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin",
    lastContactDate: new Date()
  },
  {
    id: "2",
    name: "Global Manufacturing",
    code: "MANUF001",
    status: "active",
    tier: "preferred",
    category: "Manufacturing",
    tags: ["reliable"],
    contacts: [],
    addresses: [],
    businessInfo: {
      legalName: "Global Manufacturing Inc",
      tradingName: "Global Manuf",
      taxId: "98-7654321",
      registrationNumber: "REG789012",
      website: "https://globalmanuf.com",
      foundedYear: 1995,
      employeeCount: 500,
      annualRevenue: 120000000,
      currency: "USD"
    },
    capabilities: {
      products: ["Components"],
      services: ["Manufacturing"],
      certifications: [],
      leadTime: 45,
      paymentTerms: "Net 45"
    },
    performance: {
      overallRating: 4.5,
      qualityRating: 4.6,
      deliveryRating: 4.3,
      serviceRating: 4.5,
      priceRating: 4.6,
      metrics: {
        onTimeDeliveryRate: 88,
        qualityAcceptanceRate: 94,
        responseTime: 4,
        defectRate: 2.8,
        leadTimeVariance: 12
      },
      kpis: [],
      lastEvaluationDate: new Date(),
      nextEvaluationDate: new Date()
    },
    financial: {
      creditRating: "B+",
      paymentTerms: "Net 45",
      currency: "USD"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin",
    lastContactDate: new Date()
  }
]

const sampleActivities: DashboardActivity[] = [
  {
    id: "1",
    type: "contract_signed",
    title: "Contract Renewed",
    description: "TechCorp Solutions contract renewal completed",
    supplierId: "1",
    supplierName: "TechCorp Solutions",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    priority: "medium",
    status: "completed"
  },
  {
    id: "2",
    type: "delivery_received",
    title: "Delivery Delayed",
    description: "Global Manufacturing delivery delayed",
    supplierId: "2",
    supplierName: "Global Manufacturing",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    priority: "high",
    status: "pending"
  }
]

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  trend?: "up" | "down"
  color?: "blue" | "green" | "yellow" | "red" | "purple"
  compact?: boolean
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = "up",
  color = "blue",
  compact = false
}) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    yellow: "text-yellow-600 bg-yellow-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50"
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-muted-foreground truncate", compact && "text-xs")}>
              {title}
            </p>
            <p className={cn("text-xl font-bold mt-1", compact && "text-lg")}>
              {value}
            </p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trend === "up" ? "text-green-600" : "text-red-600"
                )}>
                  {change > 0 ? "+" : ""}{change}%
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-full ml-2", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const QuickStats: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  const stats = useMemo(() => {
    const total = suppliers.length
    const active = suppliers.filter(s => s.status === "active").length
    const strategic = suppliers.filter(s => s.tier === "strategic").length
    const avgRating = suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + s.performance.overallRating, 0) / suppliers.length
      : 0

    return { total, active, strategic, avgRating }
  }, [suppliers])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <MetricCard
        title="Total Suppliers"
        value={stats.total}
        change={8}
        icon={<Building2 className="h-4 w-4" />}
        color="blue"
        compact={true}
      />
      <MetricCard
        title="Active"
        value={stats.active}
        change={5}
        icon={<CheckCircle className="h-4 w-4" />}
        color="green"
        compact={true}
      />
      <MetricCard
        title="Strategic"
        value={stats.strategic}
        change={2}
        icon={<Star className="h-4 w-4" />}
        color="purple"
        compact={true}
      />
      <MetricCard
        title="Avg Rating"
        value={`${stats.avgRating.toFixed(1)}/5`}
        change={3}
        icon={<Award className="h-4 w-4" />}
        color="yellow"
        compact={true}
      />
    </div>
  )
}

const CompactPerformanceOverview: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  const metrics = useMemo(() => {
    if (suppliers.length === 0) return null
    const avgOnTime = suppliers.reduce((sum, s) => sum + s.performance.metrics.onTimeDeliveryRate, 0) / suppliers.length
    const avgQuality = suppliers.reduce((sum, s) => sum + s.performance.metrics.qualityAcceptanceRate, 0) / suppliers.length
    return { avgOnTime, avgQuality }
  }, [suppliers])

  if (!metrics) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-4 w-4" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>On-Time Delivery</span>
              <span className="font-medium">{formatPercentage(metrics.avgOnTime)}</span>
            </div>
            <Progress value={metrics.avgOnTime} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Quality Score</span>
              <span className="font-medium">{formatPercentage(metrics.avgQuality)}</span>
            </div>
            <Progress value={metrics.avgQuality} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CompactSuppliersTable: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  const topSuppliers = suppliers.slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
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
          {topSuppliers.map((supplier) => (
            <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{supplier.businessInfo.tradingName}</div>
                  <div className="text-xs text-muted-foreground">{supplier.category}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{supplier.performance.overallRating.toFixed(1)}</span>
                </div>
                <Badge variant="outline" className={cn("text-xs", getStatusColor(supplier.status))}>
                  {supplier.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const CompactActivityFeed: React.FC<{ activities: DashboardActivity[] }> = ({ activities }) => {
  const recentActivities = activities.slice(0, 4)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-2 border rounded-lg">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <Activity className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">
                    {activity.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const OptimizedDashboard: React.FC = () => {
  const [suppliers] = useState<Supplier[]>(sampleSuppliers)
  const [activities] = useState<DashboardActivity[]>(sampleActivities)
  const [dateRange, setDateRange] = useState("30")

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="space-y-4">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Supplier Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor supplier performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">3 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStats suppliers={suppliers} />

        {/* Main Content - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="lg:col-span-1 xl:col-span-2 space-y-4">
            <CompactPerformanceOverview suppliers={suppliers} />
            <CompactSuppliersTable suppliers={suppliers} />
          </div>
          <div className="lg:col-span-1 xl:col-span-1">
            <CompactActivityFeed activities={activities} />
          </div>
        </div>

        {/* Quick Actions - Bottom Right */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          <Button size="sm" className="rounded-full h-12 w-12 p-0 shadow-lg" asChild>
            <a href="/suppliers/new" title="Add Supplier">
              <Plus className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default OptimizedDashboard