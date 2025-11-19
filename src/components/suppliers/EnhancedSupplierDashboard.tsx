"use client"
import { useState, useMemo, useCallback, useEffect } from "react"
import { useSuppliers, useDashboardMetrics } from "@/hooks/useSuppliers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Phone,
  Mail,
  User,
  Star,
  BarChart3,
  Globe,
  Eye,
  Edit,
  Download,
  Upload,
  RefreshCw,
  Search,
  Plus,
  MoreHorizontal,
  ShoppingCart,
  Target,
  Award,
  Brain,
  Sparkles
} from "lucide-react"
import NextJsXlsxConverter from "@/components/inventory/NextJsXlsxConverter"
import type { DataValidationResult } from "@/components/inventory/NextJsXlsxConverter"
import dynamic from 'next/dynamic'
const AISupplierDiscovery = dynamic(
  () => import('@/components/suppliers/AISupplierDiscovery'),
  {
    loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />,
    ssr: false
  }
)
import AIInsightCards from "@/components/ai/InsightCards"
import { AIErrorBoundary } from "@/components/ai/AIErrorHandler"

// Enhanced Supplier Types
export interface SupplierPerformanceMetrics {
  deliveryPerformance: {
    onTimeDeliveryRate: number
    averageDeliveryDays: number
    totalDeliveries: number
    lateDeliveries: number
  }
  qualityMetrics: {
    qualityRating: number
    defectRate: number
    returnRate: number
    qualityIssues: number
  }
  financialMetrics: {
    totalSpend: number
    averageOrderValue: number
    paymentTerms: string
    discountRate: number
  }
  relationshipMetrics: {
    responsiveness: number
    communication: number
    innovation: number
    sustainability: number
  }
}

export interface SupplierContact {
  id: string
  name: string
  role: string
  department: string
  email: string
  phone: string
  isPrimary: boolean
  isActive: boolean
  createdAt: Date
  lastContactDate?: Date
}

export interface PricelistVersion {
  id: string
  version: string
  fileName: string
  uploadDate: Date
  uploadedBy: string
  itemCount: number
  status: 'active' | 'archived' | 'draft'
  effectiveDate: Date
  expiryDate?: Date
  changes: string[]
  notes?: string
}

export interface EnhancedSupplier {
  id: string
  code: string
  name: string
  legalName: string
  website: string
  industry: string
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'strategic'
  status: 'active' | 'inactive' | 'under_review' | 'suspended'

  // Contact Information
  primaryContact: SupplierContact
  contacts: SupplierContact[]

  // Address Information
  addresses: {
    billing: Address
    shipping: Address
    headquarters: Address
  }

  // Business Details
  taxNumber: string
  registrationNumber: string
  certifications: string[]
  paymentTerms: string
  currency: string
  creditLimit: number

  // Performance
  performanceMetrics: SupplierPerformanceMetrics
  rating: number
  ratingHistory: { date: Date; rating: number; notes: string }[]

  // Pricelists
  pricelists: PricelistVersion[]
  activePricelistId?: string

  // Audit Trail
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string

  // Additional Metadata
  tags: string[]
  notes: string
  documents: { id: string; name: string; type: string; url: string; uploadDate: Date }[]

  // Risk Assessment
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  lastRiskAssessment: Date
}

interface Address {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

// Sample data
const sampleSuppliers: EnhancedSupplier[] = [
  {
    id: 'sup_001',
    code: 'DELL_001',
    name: 'Dell Technologies',
    legalName: 'Dell Technologies Inc.',
    website: 'https://dell.com',
    industry: 'Technology Hardware',
    tier: 'strategic',
    status: 'active',
    primaryContact: {
      id: 'contact_001',
      name: 'Sarah Johnson',
      role: 'Account Manager',
      department: 'Sales',
      email: 'sarah.johnson@dell.com',
      phone: '+1-555-0123',
      isPrimary: true,
      isActive: true,
      createdAt: new Date('2024-01-15'),
      lastContactDate: new Date('2024-09-20')
    },
    contacts: [],
    addresses: {
      billing: {
        street: '1 Dell Way',
        city: 'Round Rock',
        state: 'TX',
        postalCode: '78682',
        country: 'USA'
      },
      shipping: {
        street: '1 Dell Way',
        city: 'Round Rock',
        state: 'TX',
        postalCode: '78682',
        country: 'USA'
      },
      headquarters: {
        street: '1 Dell Way',
        city: 'Round Rock',
        state: 'TX',
        postalCode: '78682',
        country: 'USA'
      }
    },
    taxNumber: 'US123456789',
    registrationNumber: 'DEL001234',
    certifications: ['ISO 9001', 'ISO 14001', 'SOC 2'],
    paymentTerms: 'Net 30',
    currency: 'USD',
    creditLimit: 1000000,
    performanceMetrics: {
      deliveryPerformance: {
        onTimeDeliveryRate: 95.8,
        averageDeliveryDays: 3.2,
        totalDeliveries: 248,
        lateDeliveries: 10
      },
      qualityMetrics: {
        qualityRating: 4.8,
        defectRate: 0.5,
        returnRate: 1.2,
        qualityIssues: 3
      },
      financialMetrics: {
        totalSpend: 2850000,
        averageOrderValue: 11500,
        paymentTerms: 'Net 30',
        discountRate: 12.5
      },
      relationshipMetrics: {
        responsiveness: 9.2,
        communication: 8.8,
        innovation: 9.0,
        sustainability: 8.5
      }
    },
    rating: 4.8,
    ratingHistory: [
      { date: new Date('2024-01-01'), rating: 4.6, notes: 'Quarterly review - good performance' },
      { date: new Date('2024-04-01'), rating: 4.7, notes: 'Improved delivery times' },
      { date: new Date('2024-07-01'), rating: 4.8, notes: 'Excellent service quality' }
    ],
    pricelists: [
      {
        id: 'pl_001',
        version: 'v2024.3',
        fileName: 'dell_pricelist_2024_q3.xlsx',
        uploadDate: new Date('2024-07-01'),
        uploadedBy: 'john.doe@company.com',
        itemCount: 1250,
        status: 'active',
        effectiveDate: new Date('2024-07-01'),
        expiryDate: new Date('2024-09-30'),
        changes: ['Price reduction on laptop series', 'New desktop models added'],
        notes: 'Q3 pricing update with competitive adjustments'
      },
      {
        id: 'pl_002',
        version: 'v2024.2',
        fileName: 'dell_pricelist_2024_q2.xlsx',
        uploadDate: new Date('2024-04-01'),
        uploadedBy: 'jane.smith@company.com',
        itemCount: 1180,
        status: 'archived',
        effectiveDate: new Date('2024-04-01'),
        expiryDate: new Date('2024-06-30'),
        changes: ['Updated warranty terms', 'Seasonal promotions'],
        notes: 'Q2 pricing with spring promotions'
      }
    ],
    activePricelistId: 'pl_001',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-09-20'),
    createdBy: 'admin@company.com',
    updatedBy: 'sarah.manager@company.com',
    tags: ['technology', 'hardware', 'strategic'],
    notes: 'Key strategic partner for enterprise hardware',
    documents: [
      {
        id: 'doc_001',
        name: 'Master Service Agreement',
        type: 'contract',
        url: '/documents/dell_msa_2024.pdf',
        uploadDate: new Date('2024-01-15')
      }
    ],
    riskLevel: 'low',
    riskFactors: [],
    lastRiskAssessment: new Date('2024-08-15')
  }
]

interface EnhancedSupplierDashboardProps {
  onSupplierSelect?: (supplier: EnhancedSupplier) => void
}

const EnhancedSupplierDashboard = ({
  onSupplierSelect
}: EnhancedSupplierDashboardProps) => {
  const { suppliers: realSuppliers, loading: suppliersLoading, error: suppliersError, fetchSuppliers } = useSuppliers()
  const { metrics, loading: metricsLoading, error: metricsError } = useDashboardMetrics()
  const [suppliers, setSuppliers] = useState<EnhancedSupplier[]>(sampleSuppliers)
  const [selectedSupplier, setSelectedSupplier] = useState<EnhancedSupplier | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [activeTab, setActiveTab] = useState("overview")
  const [showPricelistDialog] = useState(false)

  // Update suppliers when real data is loaded
  useEffect(() => {
    if (realSuppliers && realSuppliers.length > 0) {
      // Convert real suppliers to enhanced format for display
      const enhancedSuppliers = realSuppliers.map(supplier => ({
        ...sampleSuppliers[0], // Use sample as template
        id: supplier.id,
        code: supplier.supplier_code || '',
        name: supplier.name,
        legalName: supplier.company_name || supplier.name,
        website: supplier.website || '',
        industry: supplier.primary_category || '',
        tier: supplier.performance_tier as unknown,
        status: supplier.status as unknown,
        primaryContact: {
          ...sampleSuppliers[0].primaryContact,
          name: supplier.contact_person || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          role: '',
        },
        taxNumber: supplier.tax_id || '',
        registrationNumber: '',
        paymentTerms: supplier.payment_terms || 'Net 30',
        currency: 'ZAR',
        tags: supplier.tags || [],
        notes: supplier.notes || '',
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      }))
      setSuppliers(enhancedSuppliers)
    }
  }, [realSuppliers])

  // Handle pricelist upload
  const handlePricelistUpload = useCallback(async (supplierId: string, result: DataValidationResult) => {
    const newPricelist: PricelistVersion = {
      id: `pl_${Date.now()}`,
      version: `v${new Date().getFullYear()}.${new Date().getMonth() + 1}`,
      fileName: `pricelist_${supplierId}_${Date.now()}.xlsx`,
      uploadDate: new Date(),
      uploadedBy: 'current.user@company.com',
      itemCount: result.cleanedData.length,
      status: 'active',
      effectiveDate: new Date(),
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      changes: [`Imported ${result.cleanedData.length} items`],
      notes: 'Uploaded via enhanced XLSX converter'
    }

    setSuppliers(prev => prev.map(supplier => {
      if (supplier.id === supplierId) {
        // Archive existing active pricelist
        const updatedPricelists = supplier.pricelists.map(pl =>
          pl.status === 'active' ? { ...pl, status: 'archived' as const } : pl
        )

        return {
          ...supplier,
          pricelists: [...updatedPricelists, newPricelist],
          activePricelistId: newPricelist.id,
          updatedAt: new Date()
        }
      }
      return supplier
    }))

  }, [])

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = searchQuery === "" ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.industry.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTier = tierFilter === "" || supplier.tier === tierFilter
      const matchesStatus = statusFilter === "" || supplier.status === statusFilter

      return matchesSearch && matchesTier && matchesStatus
    })
  }, [suppliers, searchQuery, tierFilter, statusFilter])

  // Calculate dashboard metrics from real data or fallback to sample
  const dashboardMetrics = useMemo(() => {
    if (metrics) {
      return {
        totalSuppliers: metrics.totalSuppliers,
        activeSuppliers: metrics.activeSuppliers,
        totalSpend: metrics.totalPurchaseValue,
        avgRating: metrics.avgPerformanceRating,
        avgOnTimeDelivery: metrics.onTimeDeliveryRate,
        riskDistribution: {
          low: suppliers.filter(s => s.riskLevel === 'low').length,
          medium: suppliers.filter(s => s.riskLevel === 'medium').length,
          high: suppliers.filter(s => s.riskLevel === 'high').length,
          critical: suppliers.filter(s => s.riskLevel === 'critical').length
        }
      }
    }

    // Fallback to calculated metrics from suppliers data
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length
    const totalSpend = suppliers.reduce((sum, s) => sum + s.performanceMetrics.financialMetrics.totalSpend, 0)
    const avgRating = suppliers.length > 0 ? suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length : 0
    const avgOnTimeDelivery = suppliers.length > 0 ? suppliers.reduce((sum, s) => sum + s.performanceMetrics.deliveryPerformance.onTimeDeliveryRate, 0) / suppliers.length : 0

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers,
      totalSpend,
      avgRating,
      avgOnTimeDelivery,
      riskDistribution: {
        low: suppliers.filter(s => s.riskLevel === 'low').length,
        medium: suppliers.filter(s => s.riskLevel === 'medium').length,
        high: suppliers.filter(s => s.riskLevel === 'high').length,
        critical: suppliers.filter(s => s.riskLevel === 'critical').length
      }
    }
  }, [suppliers, metrics])

  const getTierColor = (tier: string): string => {
    const colors = {
      strategic: "bg-purple-100 text-purple-800 border-purple-200",
      tier_1: "bg-green-100 text-green-800 border-green-200",
      tier_2: "bg-blue-100 text-blue-800 border-blue-200",
      tier_3: "bg-gray-100 text-gray-800 border-gray-200"
    }
    return colors[tier as keyof typeof colors] || colors.tier_3
  }

  const getStatusColor = (status: string): string => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200",
      under_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
      suspended: "bg-red-100 text-red-800 border-red-200"
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  const getRiskColor = (risk: string): string => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      critical: "text-red-600"
    }
    return colors[risk as keyof typeof colors] || colors.low
  }

  // Show loading state
  if (suppliersLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading suppliers...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (suppliersError || metricsError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {suppliersError || metricsError || 'Failed to load supplier data'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => fetchSuppliers()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <AIErrorBoundary>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Supplier Management</h1>
          <p className="text-muted-foreground">
            Comprehensive supplier relationship and performance management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pricelists">Pricelists</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai-discovery" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Discovery
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Suppliers</p>
                    <p className="text-2xl font-bold">{dashboardMetrics.totalSuppliers}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Suppliers</p>
                    <p className="text-2xl font-bold">{dashboardMetrics.activeSuppliers}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalSpend)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">{dashboardMetrics.avgRating.toFixed(1)}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Delivery Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>On-Time Delivery Rate</span>
                      <span>{dashboardMetrics.avgOnTimeDelivery.toFixed(1)}%</span>
                    </div>
                    <Progress value={dashboardMetrics.avgOnTimeDelivery} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Best Performer</p>
                      <p className="font-medium">Dell Technologies</p>
                      <p className="text-xs text-green-600">95.8% on-time</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Delivery Days</p>
                      <p className="font-medium">3.2 days</p>
                      <p className="text-xs text-blue-600">Industry standard: 5 days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardMetrics.riskDistribution).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", {
                          "bg-green-500": level === "low",
                          "bg-yellow-500": level === "medium",
                          "bg-orange-500": level === "high",
                          "bg-red-500": level === "critical"
                        })} />
                        <span className="text-sm capitalize">{level} Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground">
                          ({((count / dashboardMetrics.totalSuppliers) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performing Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suppliers
                  .sort((a, b) => b.rating - a.rating)
                  .slice(0, 5)
                  .map((supplier, index) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.industry}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getTierColor(supplier.tier)}>
                          {supplier.tier.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{supplier.rating}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {supplier.performanceMetrics.deliveryPerformance.onTimeDeliveryRate}% on-time
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Directory Tab */}
        <TabsContent value="directory" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search suppliers by name, code, or industry..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="strategic">Strategic</SelectItem>
                      <SelectItem value="tier_1">Tier 1</SelectItem>
                      <SelectItem value="tier_2">Tier 2</SelectItem>
                      <SelectItem value="tier_3">Tier 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSuppliers()}
                    disabled={suppliersLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${suppliersLoading ? 'animate-spin' : ''}`} />
                    {suppliersLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suppliers Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">{supplier.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTierColor(supplier.tier)}>
                          {supplier.tier.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(supplier.status)}>
                          {supplier.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{supplier.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {supplier.performanceMetrics.deliveryPerformance.onTimeDeliveryRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(supplier.performanceMetrics.financialMetrics.totalSpend)}
                      </TableCell>
                      <TableCell>
                        <span className={cn("font-medium", getRiskColor(supplier.riskLevel))}>
                          {supplier.riskLevel.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {supplier.primaryContact.lastContactDate
                            ? formatDate(supplier.primaryContact.lastContactDate)
                            : 'No contact'
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSupplier(supplier)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Pricelist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Performance Report
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Create Purchase Order
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
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {suppliers.slice(0, 4).map((supplier) => (
              <Card key={supplier.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{supplier.name}</span>
                    <Badge variant="outline" className={getTierColor(supplier.tier)}>
                      {supplier.tier.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {supplier.performanceMetrics.deliveryPerformance.onTimeDeliveryRate}%
                        </div>
                        <div className="text-sm text-muted-foreground">On-Time Delivery</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {supplier.rating}
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Rating</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quality Rating</span>
                        <span>{supplier.performanceMetrics.qualityMetrics.qualityRating}/5</span>
                      </div>
                      <Progress
                        value={(supplier.performanceMetrics.qualityMetrics.qualityRating / 5) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Responsiveness</span>
                        <span>{supplier.performanceMetrics.relationshipMetrics.responsiveness}/10</span>
                      </div>
                      <Progress
                        value={(supplier.performanceMetrics.relationshipMetrics.responsiveness / 10) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span>Total Spend:</span>
                      <span className="font-medium">
                        {formatCurrency(supplier.performanceMetrics.financialMetrics.totalSpend)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pricelists Tab */}
        <TabsContent value="pricelists" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {suppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{supplier.name}</span>
                    <NextJsXlsxConverter
                      onDataProcessed={(result) => handlePricelistUpload(supplier.id, result)}
                      supplierFilter={supplier.name}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {supplier.pricelists.map((pricelist) => (
                      <div key={pricelist.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{pricelist.version}</div>
                          <div className="text-sm text-muted-foreground">
                            {pricelist.itemCount} items • {formatDate(pricelist.uploadDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={pricelist.status === 'active' ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-700'}
                          >
                            {pricelist.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {supplier.pricelists.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No pricelists uploaded yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{supplier.name}</span>
                        <span>{formatCurrency(supplier.performanceMetrics.financialMetrics.totalSpend)}</span>
                      </div>
                      <Progress
                        value={(supplier.performanceMetrics.financialMetrics.totalSpend / dashboardMetrics.totalSpend) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{supplier.name}</span>
                      <div className="flex items-center gap-2">
                        {supplier.ratingHistory.slice(-3).map((rating, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            {rating.rating}
                          </div>
                        ))}
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{supplier.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Discovery Tab */}
        <TabsContent value="ai-discovery" className="space-y-6">
          <AIErrorBoundary>
            <AISupplierDiscovery
              onSupplierSelect={(supplier) => {
                console.log('AI Supplier selected:', supplier)
                // Convert AI supplier to enhanced supplier format if needed
                onSupplierSelect?.(supplier as unknown)
              }}
              onSupplierBookmark={(supplierId) => {
                console.log('AI Supplier bookmarked:', supplierId)
              }}
            />
          </AIErrorBoundary>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <AIErrorBoundary>
            <AIInsightCards
              filterBy={{
                category: ['Supplier Management', 'Cost Optimization', 'Risk Management']
              }}
              onInsightAction={(insightId, action) => {
                console.log('AI Insight action:', insightId, action)
                // Handle insight actions like creating plans, analyzing suppliers, etc.
              }}
              onInsightStatusChange={(id, status) => {
                console.log('AI Insight status changed:', id, status)
              }}
              onRefresh={() => {
                console.log('AI Insights refreshed')
              }}
            />
          </AIErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Supplier Detail Dialog */}
      {selectedSupplier && (
        <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSupplier.name} - Supplier Details</DialogTitle>
              <DialogDescription>
                Comprehensive supplier information and performance metrics
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{selectedSupplier.primaryContact.name} ({selectedSupplier.primaryContact.role})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{selectedSupplier.primaryContact.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{selectedSupplier.primaryContact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>{selectedSupplier.website}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Business Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>Industry: {selectedSupplier.industry}</div>
                    <div>Payment Terms: {selectedSupplier.paymentTerms}</div>
                    <div>Credit Limit: {formatCurrency(selectedSupplier.creditLimit)}</div>
                    <div>Risk Level:
                      <span className={cn("ml-1 font-medium", getRiskColor(selectedSupplier.riskLevel))}>
                        {selectedSupplier.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedSupplier.performanceMetrics.deliveryPerformance.onTimeDeliveryRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">On-Time Delivery</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedSupplier.performanceMetrics.qualityMetrics.qualityRating}/5
                    </div>
                    <div className="text-sm text-muted-foreground">Quality Rating</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedSupplier.performanceMetrics.financialMetrics.totalSpend)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Spend</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedSupplier.rating}/5
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Rating</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Pricelists */}
              <div>
                <h4 className="font-medium mb-3">Recent Pricelists</h4>
                <div className="space-y-2">
                  {selectedSupplier.pricelists.slice(0, 3).map((pricelist) => (
                    <div key={pricelist.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{pricelist.version}</div>
                        <div className="text-xs text-muted-foreground">
                          {pricelist.itemCount} items • {formatDate(pricelist.uploadDate)}
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        pricelist.status === 'active' ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-700'
                      }>
                        {pricelist.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </AIErrorBoundary>
  )
}

export default EnhancedSupplierDashboard