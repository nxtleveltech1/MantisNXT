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
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatCurrency, formatPercentage, getStatusColor, getTierColor } from "@/lib/utils"
import { safeFormatDate, safeRelativeTime, safeParseDate } from "@/lib/utils/safe-data"
import { SupplierBoundary, DataTableBoundary, ChartBoundary } from "@/components/error-boundaries/GranularErrorBoundary"
import { DataError, InvalidDateFallback } from "@/components/fallbacks/FallbackComponents"
import {
  Supplier,
  DashboardMetrics,
  DashboardActivity,
  PurchaseOrder,
  SupplierContract
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
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Award,
  BarChart3,
  Settings,
  Building2,
  FileText,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ShoppingCart,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar as CalendarIcon,
  Zap,
  Shield
} from "lucide-react"

// Enhanced sample data with more realistic values
const sampleSuppliers: Supplier[] = [
  {
    id: "1",
    name: "TechCorp Solutions Inc",
    code: "TECH001",
    status: "active",
    tier: "strategic",
    category: "Technology",
    tags: ["preferred", "enterprise", "cloud"],
    contacts: [{
      id: "c1",
      type: "primary",
      name: "John Smith",
      title: "Account Manager",
      email: "john@techcorp.com",
      phone: "+1-555-0123",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a1",
      type: "headquarters",
      addressLine1: "123 Tech Street",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "USA",
      isPrimary: true,
      isActive: true
    }],
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
      products: ["Software Development", "Cloud Services"],
      services: ["Consulting", "Support"],
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
      lastEvaluationDate: new Date("2024-01-15"),
      nextEvaluationDate: new Date("2024-07-15")
    },
    financial: {
      creditRating: "A",
      paymentTerms: "Net 30",
      currency: "USD"
    },
    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-18")
  },
  {
    id: "2",
    name: "Global Manufacturing Inc",
    code: "MANUF001",
    status: "active",
    tier: "preferred",
    category: "Manufacturing",
    tags: ["reliable", "iso-certified"],
    contacts: [{
      id: "c2",
      type: "primary",
      name: "Sarah Johnson",
      title: "Operations Manager",
      email: "sarah@globalmanuf.com",
      phone: "+1-555-0124",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a2",
      type: "headquarters",
      addressLine1: "456 Industrial Blvd",
      city: "Detroit",
      state: "MI",
      postalCode: "48201",
      country: "USA",
      isPrimary: true,
      isActive: true
    }],
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
      products: ["Components", "Assembly"],
      services: ["Manufacturing", "Quality Control"],
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
      lastEvaluationDate: new Date("2024-01-10"),
      nextEvaluationDate: new Date("2024-07-10")
    },
    financial: {
      creditRating: "B+",
      paymentTerms: "Net 45",
      currency: "USD"
    },
    createdAt: new Date("2022-06-20"),
    updatedAt: new Date("2024-01-15"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-12")
  },
  {
    id: "3",
    name: "EcoSupply Solutions",
    code: "ECO001",
    status: "pending",
    tier: "approved",
    category: "Sustainability",
    tags: ["green", "certified"],
    contacts: [{
      id: "c3",
      type: "primary",
      name: "Maria Garcia",
      title: "Sustainability Director",
      email: "maria@ecosupply.com",
      phone: "+1-555-0125",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a3",
      type: "headquarters",
      addressLine1: "789 Green Way",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "USA",
      isPrimary: true,
      isActive: true
    }],
    businessInfo: {
      legalName: "EcoSupply Solutions LLC",
      tradingName: "EcoSupply",
      taxId: "55-7891234",
      registrationNumber: "REG345678",
      website: "https://ecosupply.com",
      foundedYear: 2018,
      employeeCount: 75,
      annualRevenue: 15000000,
      currency: "USD"
    },
    capabilities: {
      products: ["Sustainable Materials", "Eco-Packaging"],
      services: ["Consulting", "Carbon Footprint Analysis"],
      certifications: [],
      leadTime: 21,
      paymentTerms: "Net 30"
    },
    performance: {
      overallRating: 4.2,
      qualityRating: 4.3,
      deliveryRating: 4.1,
      serviceRating: 4.4,
      priceRating: 3.8,
      metrics: {
        onTimeDeliveryRate: 85,
        qualityAcceptanceRate: 92,
        responseTime: 3,
        defectRate: 3.2,
        leadTimeVariance: 8
      },
      kpis: [],
      lastEvaluationDate: new Date("2024-01-05"),
      nextEvaluationDate: new Date("2024-07-05")
    },
    financial: {
      creditRating: "B",
      paymentTerms: "Net 30",
      currency: "USD"
    },
    createdAt: new Date("2023-08-10"),
    updatedAt: new Date("2024-01-08"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-05")
  }
]

const sampleActivities: DashboardActivity[] = [
  {
    id: "1",
    type: "contract_signed",
    title: "Contract Renewed",
    description: "TechCorp Solutions contract renewal completed for $2.5M",
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
    description: "Global Manufacturing delivery delayed - investigating root cause",
    supplierId: "2",
    supplierName: "Global Manufacturing Inc",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    priority: "high",
    status: "pending"
  },
  {
    id: "3",
    type: "supplier_added",
    title: "New Supplier Onboarded",
    description: "EcoSupply Solutions completed onboarding process",
    supplierId: "3",
    supplierName: "EcoSupply Solutions",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    priority: "low",
    status: "completed"
  },
  {
    id: "4",
    type: "performance_review",
    title: "Performance Review Required",
    description: "Quarterly review due for 5 suppliers",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    priority: "medium",
    status: "pending"
  }
]

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  trend?: "up" | "down"
  color?: "blue" | "green" | "yellow" | "red" | "purple"
  href?: string
  loading?: boolean
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = "up",
  color = "blue",
  href,
  loading = false
}) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    yellow: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
  }

  const CardWrapper = href ? "a" : "div"

  return (
    <Card className={cn(
      "hover:shadow-md transition-all duration-200",
      href && "cursor-pointer hover:shadow-lg"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{loading ? "..." : value}</p>
              {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  trend === "up" ? "text-green-600" : "text-red-600"
                )}>
                  {change > 0 ? "+" : ""}{change}%
                </span>
                {changeLabel && (
                  <span className="text-sm text-muted-foreground ml-1">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-full", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const QuickStatsGrid: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Suppliers"
        value={stats.total}
        change={8}
        changeLabel="vs last month"
        icon={<Building2 className="h-6 w-6" />}
        color="blue"
        href="/suppliers"
      />
      <MetricCard
        title="Active Suppliers"
        value={stats.active}
        change={5}
        changeLabel="vs last month"
        icon={<CheckCircle className="h-6 w-6" />}
        color="green"
      />
      <MetricCard
        title="Strategic Partners"
        value={stats.strategic}
        change={2}
        changeLabel="new this quarter"
        icon={<Star className="h-6 w-6" />}
        color="purple"
      />
      <MetricCard
        title="Avg Performance"
        value={`${stats.avgRating.toFixed(1)}/5.0`}
        change={3}
        changeLabel="vs last quarter"
        icon={<Award className="h-6 w-6" />}
        color="yellow"
      />
    </div>
  )
}

const PerformanceOverview: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  const performanceMetrics = useMemo(() => {
    if (suppliers.length === 0) return null

    const avgOnTime = suppliers.reduce((sum, s) => sum + s.performance.metrics.onTimeDeliveryRate, 0) / suppliers.length
    const avgQuality = suppliers.reduce((sum, s) => sum + s.performance.metrics.qualityAcceptanceRate, 0) / suppliers.length
    const avgResponse = suppliers.reduce((sum, s) => sum + s.performance.metrics.responseTime, 0) / suppliers.length
    const avgDefect = suppliers.reduce((sum, s) => sum + s.performance.metrics.defectRate, 0) / suppliers.length

    return { avgOnTime, avgQuality, avgResponse, avgDefect }
  }, [suppliers])

  if (!performanceMetrics) return null

  return (
    <ChartBoundary chartName="Performance Overview">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">On-Time Delivery</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(performanceMetrics.avgOnTime)}
              </span>
            </div>
            <Progress value={performanceMetrics.avgOnTime} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Quality Acceptance</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(performanceMetrics.avgQuality)}
              </span>
            </div>
            <Progress value={performanceMetrics.avgQuality} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Response Time</span>
              <span className="text-sm text-muted-foreground">
                {performanceMetrics.avgResponse.toFixed(1)}h avg
              </span>
            </div>
            <Progress value={Math.max(0, 100 - (performanceMetrics.avgResponse * 10))} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Defect Rate</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(performanceMetrics.avgDefect)}
              </span>
            </div>
            <Progress value={Math.max(0, 100 - (performanceMetrics.avgDefect * 20))} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
    </ChartBoundary>
  )
}

const TopSuppliersTable: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  const topSuppliers = useMemo(() => {
    return suppliers
      .sort((a, b) => b.performance.overallRating - a.performance.overallRating)
      .slice(0, 5)
  }, [suppliers])

  return (
    <DataTableBoundary tableName="Top Performing Suppliers">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Suppliers
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/suppliers">View All</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>On-Time Delivery</TableHead>
              <TableHead>Quality Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {supplier.businessInfo.tradingName || supplier.businessInfo.legalName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {supplier.category}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn("capitalize", getStatusColor(supplier.status))}
                    variant="outline"
                  >
                    {supplier.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn("capitalize", getTierColor(supplier.tier))}
                    variant="outline"
                  >
                    {supplier.tier}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {supplier.performance.overallRating.toFixed(1)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {formatPercentage(supplier.performance.metrics.onTimeDeliveryRate)}
                    </span>
                    {supplier.performance.metrics.onTimeDeliveryRate >= 90 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : supplier.performance.metrics.onTimeDeliveryRate >= 80 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {formatPercentage(supplier.performance.metrics.qualityAcceptanceRate)}
                    </span>
                    {supplier.performance.metrics.qualityAcceptanceRate >= 95 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : supplier.performance.metrics.qualityAcceptanceRate >= 85 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Supplier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Purchase Orders
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </DataTableBoundary>
  )
}

const ActivityFeed: React.FC<{ activities: DashboardActivity[] }> = ({ activities }) => {
  const getActivityIcon = (type: DashboardActivity["type"]) => {
    switch (type) {
      case "contract_signed": return <FileText className="h-4 w-4" />
      case "delivery_received": return <Truck className="h-4 w-4" />
      case "payment_made": return <DollarSign className="h-4 w-4" />
      case "performance_review": return <BarChart3 className="h-4 w-4" />
      case "supplier_added": return <Building2 className="h-4 w-4" />
      case "order_placed": return <ShoppingCart className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (priority: DashboardActivity["priority"]) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200"
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low": return "text-green-600 bg-green-50 border-green-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const formatTimestamp = (timestamp: Date | string | unknown) => {
    return safeRelativeTime(timestamp, 'Unknown time')
  }

  return (
    <SupplierBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className={cn("p-2 rounded-full border", getStatusColor(activity.priority))}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {activity.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                  {activity.supplierName && (
                    <p className="text-xs text-muted-foreground">
                      {activity.supplierName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    </SupplierBoundary>
  )
}

const QuickActions: React.FC = () => {
  const actions = [
    {
      icon: <Plus className="h-4 w-4" />,
      label: "Add Supplier",
      color: "bg-blue-600 hover:bg-blue-700",
      href: "/suppliers/new"
    },
    {
      icon: <ShoppingCart className="h-4 w-4" />,
      label: "New PO",
      color: "bg-green-600 hover:bg-green-700",
      href: "/purchase-orders/new"
    },
    {
      icon: <Download className="h-4 w-4" />,
      label: "Export Data",
      color: "bg-orange-600 hover:bg-orange-700",
      onClick: () => {}
    }
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            className={cn("rounded-full w-12 h-12 p-0 text-white shadow-lg", action.color)}
            title={action.label}
            onClick={action.onClick}
            asChild={!!action.href}
          >
            {action.href ? (
              <a href={action.href}>
                {action.icon}
              </a>
            ) : (
              action.icon
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}

const EnhancedSupplierDashboard: React.FC = () => {
  const [suppliers] = useState<Supplier[]>(sampleSuppliers)
  const [activities] = useState<DashboardActivity[]>(sampleActivities)
  const [dateRange, setDateRange] = useState("30")

  const breadcrumbs = [
    { label: "Dashboard" }
  ]

  return (
    <SupplierBoundary>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Supplier Management Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage your supplier relationships and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStatsGrid suppliers={suppliers} />

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <PerformanceOverview suppliers={suppliers} />
                <TopSuppliersTable suppliers={suppliers} />
              </div>
              <div>
                <ActivityFeed activities={activities} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Avg On-Time Delivery"
                value={formatPercentage(
                  suppliers.reduce((sum, s) => sum + s.performance.metrics.onTimeDeliveryRate, 0) / suppliers.length
                )}
                change={2}
                icon={<Truck className="h-6 w-6" />}
                color="green"
              />
              <MetricCard
                title="Avg Quality Score"
                value={formatPercentage(
                  suppliers.reduce((sum, s) => sum + s.performance.metrics.qualityAcceptanceRate, 0) / suppliers.length
                )}
                change={4}
                icon={<Shield className="h-6 w-6" />}
                color="blue"
              />
              <MetricCard
                title="Avg Response Time"
                value={`${(suppliers.reduce((sum, s) => sum + s.performance.metrics.responseTime, 0) / suppliers.length).toFixed(1)}h`}
                change={-15}
                trend="down"
                icon={<Zap className="h-6 w-6" />}
                color="yellow"
              />
              <MetricCard
                title="Avg Defect Rate"
                value={formatPercentage(
                  suppliers.reduce((sum, s) => sum + s.performance.metrics.defectRate, 0) / suppliers.length
                )}
                change={-8}
                trend="down"
                icon={<AlertTriangle className="h-6 w-6" />}
                color="red"
              />
            </div>
            <PerformanceOverview suppliers={suppliers} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <ActivityFeed activities={activities} />
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </SupplierBoundary>
  )
}

export default EnhancedSupplierDashboard