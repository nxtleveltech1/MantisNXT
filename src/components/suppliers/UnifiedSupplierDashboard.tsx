"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenuLabel,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSuppliers } from "@/hooks/useSuppliers"
import { cn, formatCurrency, formatDate, formatPercentage } from "@/lib/utils"
import { getDisplayUrl } from "@/lib/utils/url-validation"
import { SafeLink } from "@/components/ui/SafeLink"
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  DollarSign,
  Phone,
  Mail,
  FileText,
  Star,
  BarChart3,
  Activity,
  Calendar,
  Globe,
  MapPin,
  Settings,
  Eye,
  Edit,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  History,
  ShoppingCart,
  Target,
  Award,
  Zap,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Brain,
  Loader2
} from "lucide-react"

// Types
interface SupplierMetrics {
  totalSuppliers: number
  activeSuppliers: number
  totalSpend: number
  avgRating: number
  avgOnTimeDelivery: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

interface SupplierData {
  id: string
  code: string
  name: string
  legalName: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  tier: 'strategic' | 'preferred' | 'approved' | 'conditional'
  category: string
  subcategory?: string
  website?: string
  rating: number
  onTimeDelivery: number
  totalSpend: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastContact: Date | null
  primaryContact: {
    name: string
    email: string
    phone: string
    role: string
  }
  address: {
    city: string
    country: string
    full: string
  }
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// Transformation function to convert DatabaseSupplier to SupplierData
function transformDatabaseSupplierToSupplierData(dbSupplier: any): SupplierData {
  // Generate a risk level based on performance tier
  const getRiskLevel = (performanceTier: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (performanceTier) {
      case 'tier_1': return 'low'
      case 'tier_2': return 'low'
      case 'tier_3': return 'medium'
      case 'unrated':
      default: return 'high'
    }
  }

  // Parse address or use defaults
  const parseAddress = (address: string | null) => {
    if (!address) {
      return {
        city: 'Unknown',
        country: 'South Africa',
        full: 'Address not provided'
      }
    }
    // Simple parsing - could be enhanced
    return {
      city: 'Various',
      country: 'South Africa',
      full: address
    }
  }

  return {
    id: dbSupplier.id,
    code: dbSupplier.supplier_code || 'N/A',
    name: dbSupplier.name,
    companyName: dbSupplier.company_name || dbSupplier.name,
    status: dbSupplier.status,
    tier: dbSupplier.performance_tier === 'tier_1' ? 'strategic' :
          dbSupplier.performance_tier === 'tier_2' ? 'preferred' :
          dbSupplier.performance_tier === 'tier_3' ? 'approved' : 'conditional',
    category: dbSupplier.primary_category || 'General',
    subcategory: undefined,
    website: dbSupplier.website || undefined,
    rating: parseFloat(dbSupplier.rating) || 0,
    onTimeDelivery: 85, // Default value - could be calculated
    totalSpend: parseFloat(dbSupplier.spend_last_12_months) || 0,
    riskLevel: getRiskLevel(dbSupplier.performance_tier),
    lastContact: null, // Not available in DB
    primaryContact: {
      name: dbSupplier.contact_person || 'Unknown',
      email: dbSupplier.email || '',
      phone: dbSupplier.phone || '',
      role: 'Primary Contact'
    },
    address: parseAddress(dbSupplier.address),
    tags: [],
    createdAt: new Date(dbSupplier.created_at),
    updatedAt: new Date(dbSupplier.updated_at)
  }
}

// Sample data with South African suppliers
const sampleSuppliers: SupplierData[] = [
  {
    id: "SUP-001",
    code: "BKPRC",
    name: "BK Percussion",
    legalName: "BK Percussion (Pty) Ltd",
    status: "active",
    tier: "strategic",
    category: "Musical Instruments",
    subcategory: "Percussion",
    website: "https://www.bkpercussion.co.za",
    rating: 4.7,
    onTimeDelivery: 94,
    totalSpend: 2850000,
    riskLevel: "low",
    lastContact: new Date("2024-09-20"),
    primaryContact: {
      name: "Sarah Mitchell",
      email: "sarah@bkpercussion.co.za",
      phone: "+27 11 234 5678",
      role: "Sales Manager"
    },
    address: {
      city: "Johannesburg",
      country: "South Africa",
      full: "123 Music Street, Johannesburg, Gauteng 2000"
    },
    tags: ["percussion", "drums", "premium", "professional"],
    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2024-09-20")
  },
  {
    id: "SUP-002",
    code: "BCELEC",
    name: "BC Electronics",
    legalName: "BC Electronics (Pty) Ltd",
    status: "active",
    tier: "preferred",
    category: "Electronics",
    subcategory: "Audio Equipment",
    website: "https://www.bcelectronics.co.za",
    rating: 4.5,
    onTimeDelivery: 92,
    totalSpend: 1890000,
    riskLevel: "low",
    lastContact: new Date("2024-09-18"),
    primaryContact: {
      name: "David Chen",
      email: "david@bcelectronics.co.za",
      phone: "+27 21 345 6789",
      role: "Technical Director"
    },
    address: {
      city: "Cape Town",
      country: "South Africa",
      full: "456 Tech Avenue, Cape Town, Western Cape 8001"
    },
    tags: ["electronics", "audio", "professional", "broadcast"],
    createdAt: new Date("2023-02-01"),
    updatedAt: new Date("2024-09-18")
  },
  {
    id: "SUP-003",
    code: "LEGACY",
    name: "Legacy Brands",
    legalName: "Legacy Brands (Pty) Ltd",
    status: "active",
    tier: "approved",
    category: "Musical Instruments",
    subcategory: "Guitars & Amplifiers",
    website: "https://www.legacybrands.co.za",
    rating: 4.3,
    onTimeDelivery: 89,
    totalSpend: 1250000,
    riskLevel: "medium",
    lastContact: new Date("2024-09-15"),
    primaryContact: {
      name: "Mike Rodriguez",
      email: "mike@legacybrands.co.za",
      phone: "+27 31 456 7890",
      role: "Sales Director"
    },
    address: {
      city: "Durban",
      country: "South Africa",
      full: "789 Guitar Lane, Durban, KwaZulu-Natal 4000"
    },
    tags: ["guitars", "amplifiers", "vintage", "classic"],
    createdAt: new Date("2023-03-01"),
    updatedAt: new Date("2024-09-15")
  }
]

// AI Supplier Discovery Component
interface AISupplierDiscoveryProps {
  onSupplierFound: (data: Partial<SupplierData>) => void
  supplierName?: string
}

const AISupplierDiscovery: React.FC<AISupplierDiscoveryProps> = ({
  onSupplierFound,
  supplierName = ""
}) => {
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState(supplierName)
  const [error, setError] = useState<string | null>(null)

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      // Simulate AI lookup with realistic delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock AI response based on search query
      const mockData: Partial<SupplierData> = {
        name: searchQuery,
        legalName: `${searchQuery} (Pty) Ltd`,
        website: `https://www.${searchQuery.toLowerCase().replace(/\s+/g, '')}.co.za`,
        category: "Technology",
        address: {
          city: "Johannesburg",
          country: "South Africa",
          full: "123 Business Park, Johannesburg, Gauteng 2000"
        },
        primaryContact: {
          name: "John Smith",
          email: `info@${searchQuery.toLowerCase().replace(/\s+/g, '')}.co.za`,
          phone: "+27 11 123 4567",
          role: "Sales Manager"
        }
      }

      onSupplierFound(mockData)
    } catch (err) {
      setError("Failed to find supplier information. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Enter supplier name to discover information..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAISearch()}
            className="pr-10"
          />
        </div>
        <Button
          onClick={handleAISearch}
          disabled={isSearching || !searchQuery.trim()}
          className="min-w-[140px]"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Find Info
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Export functionality
const handleExportSuppliers = async (suppliers: SupplierData[], format: 'csv' | 'xlsx' | 'pdf') => {
  try {
    // Simulate export processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    const data = suppliers.map(supplier => ({
      Code: supplier.code,
      Name: supplier.name,
      'Legal Name': supplier.legalName,
      Status: supplier.status,
      Tier: supplier.tier,
      Category: supplier.category,
      Rating: supplier.rating,
      'On-Time Delivery %': supplier.onTimeDelivery,
      'Total Spend': supplier.totalSpend,
      'Risk Level': supplier.riskLevel,
      'Primary Contact': supplier.primaryContact.name,
      'Contact Email': supplier.primaryContact.email,
      'Contact Phone': supplier.primaryContact.phone,
      Location: supplier.address.full,
      Website: supplier.website || '',
      'Last Contact': supplier.lastContact ? formatDate(supplier.lastContact) : 'Never',
      Created: formatDate(supplier.createdAt),
      Updated: formatDate(supplier.updatedAt)
    }))

    // Convert to CSV format
    if (format === 'csv') {
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    return true
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Export failed. Please try again.')
  }
}

// Main Component
interface UnifiedSupplierDashboardProps {
  initialTab?: string
}

const UnifiedSupplierDashboard: React.FC<UnifiedSupplierDashboardProps> = ({
  initialTab = "overview"
}) => {
  const router = useRouter()
  const { suppliers: apiSuppliers, loading: suppliersLoading, error: suppliersError } = useSuppliers()

  // Convert API suppliers to component format
  const suppliers = useMemo(() => {
    return apiSuppliers.map((supplier: any) => transformDatabaseSupplierToSupplierData(supplier))
  }, [apiSuppliers])

  // Legacy code (remove after confirming new transformation works)
  const legacyTransform = useMemo(() => {
    return apiSuppliers.map((supplier: any) => ({
      website: supplier.website || '',
      contactInfo: {
        primaryContact: {
          name: supplier.contact_person || '',
          title: '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          department: ''
        },
        address: {
          street: supplier.address || '',
          city: '',
          state: '',
          postalCode: '',
          country: 'South Africa'
        }
      },
      businessInfo: {
        taxId: supplier.tax_id || '',
        registrationNumber: '',
        foundedYear: 0,
        employeeCount: 0,
        annualRevenue: 0,
        currency: 'ZAR'
      },
      capabilities: {
        products: [],
        services: [],
        certifications: [],
        leadTime: 30,
        minimumOrderValue: 0,
        paymentTerms: supplier.payment_terms || 'Net 30'
      },
      performance: {
        overallRating: parseFloat(supplier.rating) || 0,
        qualityRating: 0,
        deliveryRating: 0,
        serviceRating: 0,
        priceRating: 0,
        onTimeDeliveryRate: 0.9,
        qualityAcceptanceRate: 0.95,
        responseTime: 24
      },
      financial: {
        creditRating: 'Good',
        creditLimit: 0,
        totalPurchaseValue: parseFloat(supplier.spend_last_12_months) || 0,
        paymentHistory: 'Good',
        riskScore: supplier.performance_tier === 'tier_1' ? 20 :
                  supplier.performance_tier === 'tier_2' ? 35 : 60
      },
      contractInfo: {
        hasActiveContract: false,
        contractExpiry: new Date(),
        preferredSupplier: supplier.preferred_supplier || false
      },
      tags: [],
      createdAt: new Date(supplier.created_at),
      updatedAt: new Date(supplier.updated_at)
    }))
  }, [apiSuppliers])

  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null)
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showAIDiscovery, setShowAIDiscovery] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [tierFilter, setTierFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [riskFilter, setRiskFilter] = useState<string>("")

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo((): SupplierMetrics => {
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length
    const totalSpend = suppliers.reduce((sum, s) => sum + s.totalSpend, 0)
    const avgRating = suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length
      : 0
    const avgOnTimeDelivery = suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + s.onTimeDelivery, 0) / suppliers.length
      : 0

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
  }, [suppliers])

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          supplier.name.toLowerCase().includes(query) ||
          supplier.code.toLowerCase().includes(query) ||
          supplier.category.toLowerCase().includes(query) ||
          supplier.tags.some(tag => tag.toLowerCase().includes(query))

        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all' && supplier.status !== statusFilter) {
        return false
      }

      // Tier filter
      if (tierFilter && tierFilter !== 'all' && supplier.tier !== tierFilter) {
        return false
      }

      // Category filter
      if (categoryFilter && categoryFilter !== 'all' && supplier.category !== categoryFilter) {
        return false
      }

      // Risk filter
      if (riskFilter && riskFilter !== 'all' && supplier.riskLevel !== riskFilter) {
        return false
      }

      return true
    })
  }, [suppliers, searchQuery, statusFilter, tierFilter, categoryFilter, riskFilter])

  // Handle export
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true)
    try {
      const suppliersToExport = selectedSuppliers.length > 0
        ? suppliers.filter(s => selectedSuppliers.includes(s.id))
        : filteredSuppliers

      await handleExportSuppliers(suppliersToExport, format)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("")
    setTierFilter("")
    setCategoryFilter("")
    setRiskFilter("")
  }

  // Navigation helpers
  const navigateToNewSupplier = () => {
    router.push('/suppliers/new')
  }

  const navigateToEditSupplier = (supplierId: string) => {
    router.push(`/suppliers/${supplierId}/edit`)
  }

  // Utility functions
  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      suspended: "bg-red-100 text-red-800 border-red-200"
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  const getTierColor = (tier: string) => {
    const colors = {
      strategic: "bg-purple-100 text-purple-800 border-purple-200",
      preferred: "bg-blue-100 text-blue-800 border-blue-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      conditional: "bg-orange-100 text-orange-800 border-orange-200"
    }
    return colors[tier as keyof typeof colors] || colors.approved
  }

  const getRiskColor = (risk: string) => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      critical: "text-red-600"
    }
    return colors[risk as keyof typeof colors] || colors.low
  }

  // Handle loading and error states
  if (suppliersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    )
  }

  if (suppliersError) {
    return (
      <Alert className="max-w-md mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading suppliers: {suppliersError}
        </AlertDescription>
      </Alert>
    )
  }

  // Debug: show raw data
  if (apiSuppliers && apiSuppliers.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Debug Info</h2>
        <p>API Suppliers Length: {apiSuppliers.length}</p>
        <p>Loading: {suppliersLoading ? 'Yes' : 'No'}</p>
        <p>Error: {suppliersError || 'None'}</p>
        <pre className="bg-gray-100 p-4 mt-4 text-sm">
          {JSON.stringify(apiSuppliers, null, 2)}
        </pre>
      </div>
    )
  }

  const breadcrumbs = [
    { label: "Supplier Management" }
  ]

  return (
    <SelfContainedLayout
      title="Suppliers"
      breadcrumbs={breadcrumbs}
    >
      <TooltipProvider>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
            <p className="text-muted-foreground">
              Comprehensive supplier relationship and performance management
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIDiscovery(true)}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
            >
              <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
              AI Discovery
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Excel File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={navigateToNewSupplier} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Suppliers</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalSuppliers}</p>
                  <p className="text-xs text-green-600">
                    {dashboardMetrics.activeSuppliers} active
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalSpend)}</p>
                  <p className="text-xs text-blue-600">
                    Avg: {formatCurrency(dashboardMetrics.totalSpend / dashboardMetrics.totalSuppliers)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.avgOnTimeDelivery.toFixed(1)}%</p>
                  <p className="text-xs text-orange-600">
                    Industry avg: 85%
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.avgRating.toFixed(1)}/5</p>
                  <p className="text-xs text-purple-600">
                    {dashboardMetrics.riskDistribution.low} low risk
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Risk Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Performance</span>
                        <span>{dashboardMetrics.avgRating.toFixed(1)}/5</span>
                      </div>
                      <Progress value={(dashboardMetrics.avgRating / 5) * 100} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>On-Time Delivery</span>
                        <span>{dashboardMetrics.avgOnTimeDelivery.toFixed(1)}%</span>
                      </div>
                      <Progress value={dashboardMetrics.avgOnTimeDelivery} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
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
                    .slice(0, 3)
                    .map((supplier, index) => (
                      <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                            <span className="text-sm font-medium">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            <p className="text-xs text-muted-foreground">{supplier.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={getTierColor(supplier.tier)}>
                            {supplier.tier.toUpperCase()}
                          </Badge>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="font-medium">{supplier.rating}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {supplier.onTimeDelivery}% on-time
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
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search suppliers by name, code, category, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {(statusFilter || tierFilter || categoryFilter || riskFilter) && (
                        <Badge variant="secondary" className="ml-2">
                          Active
                        </Badge>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Tier</label>
                        <Select value={tierFilter} onValueChange={setTierFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All tiers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tiers</SelectItem>
                            <SelectItem value="strategic">Strategic</SelectItem>
                            <SelectItem value="preferred">Preferred</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="conditional">Conditional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Category</label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="Musical Instruments">Musical Instruments</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Risk Level</label>
                        <Select value={riskFilter} onValueChange={setRiskFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="low">Low Risk</SelectItem>
                            <SelectItem value="medium">Medium Risk</SelectItem>
                            <SelectItem value="high">High Risk</SelectItem>
                            <SelectItem value="critical">Critical Risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredSuppliers.length} of {suppliers.length} suppliers
              </p>
              {selectedSuppliers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedSuppliers.length} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </Button>
                </div>
              )}
            </div>

            {/* Suppliers Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSuppliers.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSuppliers(filteredSuppliers.map(s => s.id))
                            } else {
                              setSelectedSuppliers([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Spend</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSuppliers.includes(supplier.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSuppliers([...selectedSuppliers, supplier.id])
                              } else {
                                setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {supplier.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              <p className="text-sm text-muted-foreground">{supplier.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(supplier.status)}>
                            {supplier.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTierColor(supplier.tier)}>
                            {supplier.tier.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="font-medium">{supplier.rating}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {supplier.onTimeDelivery}% on-time
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(supplier.totalSpend)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{supplier.address.city}, {supplier.address.country}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("font-medium", getRiskColor(supplier.riskLevel))}>
                            {supplier.riskLevel.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedSupplier(supplier)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigateToEditSupplier(supplier.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Supplier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Create Order
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Performance Report
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
              {filteredSuppliers.slice(0, 4).map((supplier) => (
                <Card key={supplier.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{supplier.name}</span>
                      <Badge variant="outline" className={getTierColor(supplier.tier)}>
                        {supplier.tier.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {supplier.onTimeDelivery}%
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
                          <span>Performance Score</span>
                          <span>{supplier.rating}/5</span>
                        </div>
                        <Progress value={(supplier.rating / 5) * 100} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Delivery Performance</span>
                          <span>{supplier.onTimeDelivery}%</span>
                        </div>
                        <Progress value={supplier.onTimeDelivery} className="h-2" />
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>Total Spend:</span>
                        <span className="font-medium">{formatCurrency(supplier.totalSpend)}</span>
                      </div>
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
                          <span>{formatCurrency(supplier.totalSpend)}</span>
                        </div>
                        <Progress
                          value={(supplier.totalSpend / dashboardMetrics.totalSpend) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {suppliers.map((supplier) => (
                      <div key={supplier.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{supplier.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{supplier.rating}</span>
                          </div>
                          <Badge variant="outline" className={getRiskColor(supplier.riskLevel)}>
                            {supplier.riskLevel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* AI Discovery Modal */}
        <Dialog open={showAIDiscovery} onOpenChange={setShowAIDiscovery}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Supplier Discovery
              </DialogTitle>
              <DialogDescription>
                Use AI to automatically discover and populate supplier information
              </DialogDescription>
            </DialogHeader>

            <AISupplierDiscovery
              onSupplierFound={(data) => {
                // Navigate to new supplier form with pre-filled data
                setShowAIDiscovery(false)
                navigateToNewSupplier()
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Supplier Detail Modal */}
        {selectedSupplier && (
          <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedSupplier.name} - Details</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToEditSupplier(selectedSupplier.id)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTitle>
                <DialogDescription>
                  Comprehensive supplier information and performance metrics
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedSupplier.primaryContact.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedSupplier.primaryContact.phone}</span>
                        </div>
                        {selectedSupplier.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <SafeLink
                              href={selectedSupplier.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {getDisplayUrl(selectedSupplier.website) || selectedSupplier.website}
                              <ExternalLink className="h-3 w-3" />
                            </SafeLink>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedSupplier.address.full}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Business Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>Legal Name: {selectedSupplier.legalName}</div>
                        <div>Category: {selectedSupplier.category}</div>
                        {selectedSupplier.subcategory && (
                          <div>Subcategory: {selectedSupplier.subcategory}</div>
                        )}
                        <div>
                          Risk Level:
                          <span className={cn("ml-1 font-medium", getRiskColor(selectedSupplier.riskLevel))}>
                            {selectedSupplier.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          Last Contact: {selectedSupplier.lastContact
                            ? formatDate(selectedSupplier.lastContact)
                            : 'Never'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedSupplier.rating}/5
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Rating</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedSupplier.onTimeDelivery}%
                      </div>
                      <div className="text-sm text-muted-foreground">On-Time Delivery</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(selectedSupplier.totalSpend)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Spend</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tags */}
                {selectedSupplier.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplier.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
    </SelfContainedLayout>
  )
}

export default UnifiedSupplierDashboard