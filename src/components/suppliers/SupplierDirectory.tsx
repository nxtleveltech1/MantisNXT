// @ts-nocheck
"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


import { cn, formatPercentage, getStatusColor, getTierColor, formatDate } from "@/lib/utils"
import type { Supplier, SupplierSearchFilters, SupplierSortOptions } from "@/types/supplier"
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Star,
  TrendingUp,
  FileText,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  X
} from "lucide-react"

// Purged and seeded supplier list (minimal defaults)
const supplierSeedNames = [
  "BK Percussion",
  "BC Electronics",
  "Legacy Brands",
  "Alpha Technologies",
  "Music Power",
  "Viva Afrika",
  "Audiolite",
  "Tuerk Multimedia",
  "Tuerk Technologies",
  "Sonic Informed",
  "Stage Audio Works",
  "Stage One Distribution",
  "Yamaha Music South Africa",
  "AV Distribution",
  "Sennheiser South Africa",
  "Planetworld",
  "MD Distribution",
  "Rockit Distribution",
  "Rolling Thunder",
  "Global Music",
  "Audiosure",
  "ApexPro Distribution"
]

const sampleSuppliers: Supplier[] = [
  {
    id: "SUP-1001",
    name: "BK Percussion",
    code: "BKPRC",
    status: "active",
    tier: "strategic",
    category: "Musical Instruments",
    subcategory: "Percussion",
    tags: ["percussion", "drums", "premium", "professional"],
    contacts: [{
      id: "c1",
      type: "primary",
      name: "Sarah Mitchell",
      title: "Sales Manager",
      email: "sarah@bkpercussion.co.za",
      phone: "+27 11 234 5678",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a1",
      type: "headquarters",
      addressLine1: "123 Music Street",
      city: "Johannesburg",
      state: "Gauteng",
      postalCode: "2000",
      country: "South Africa",
      isPrimary: true,
      isActive: true
    }],
    businessInfo: {
      legalName: "BK Percussion (Pty) Ltd",
      tradingName: "BK Percussion",
      taxId: "1234567890",
      registrationNumber: "2010/123456/07",
      website: "https://www.bkpercussion.co.za",
      foundedYear: 2010,
      employeeCount: 25,
      annualRevenue: 15000000,
      currency: "ZAR"
    },
    capabilities: {
      products: ["Drum Kits", "Cymbals", "Percussion Accessories", "Electronic Drums"],
      services: ["Equipment Rental", "Maintenance", "Custom Builds"],
      certifications: [{ id: "cert1", name: "ISO 9001:2015", issuer: "SABS", validUntil: "2025-12-31" }],
      leadTime: 14,
      minimumOrderValue: 5000,
      paymentTerms: "Net 30"
    },
    performance: {
      overallRating: 4.7,
      qualityRating: 4.8,
      deliveryRating: 4.6,
      serviceRating: 4.7,
      priceRating: 4.5,
      metrics: {
        onTimeDeliveryRate: 94,
        qualityAcceptanceRate: 98,
        responseTime: 2,
        defectRate: 1.2,
        leadTimeVariance: 3
      },
      kpis: [],
      lastEvaluationDate: new Date("2024-01-15"),
      nextEvaluationDate: new Date("2024-07-15")
    },
    financial: {
      creditRating: "A",
      paymentTerms: "Net 30",
      currency: "ZAR"
    },
    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-18")
  },
  {
    id: "SUP-1002",
    name: "BC Electronics",
    code: "BCELEC",
    status: "active",
    tier: "preferred",
    category: "Electronics",
    subcategory: "Audio Equipment",
    tags: ["electronics", "audio", "professional", "broadcast"],
    contacts: [{
      id: "c2",
      type: "primary",
      name: "David Chen",
      title: "Technical Director",
      email: "david@bcelectronics.co.za",
      phone: "+27 21 345 6789",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a2",
      type: "headquarters",
      addressLine1: "456 Tech Avenue",
      city: "Cape Town",
      state: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
      isPrimary: true,
      isActive: true
    }],
    businessInfo: {
      legalName: "BC Electronics (Pty) Ltd",
      tradingName: "BC Electronics",
      taxId: "2345678901",
      registrationNumber: "2012/234567/07",
      website: "https://www.bcelectronics.co.za",
      foundedYear: 2012,
      employeeCount: 40,
      annualRevenue: 25000000,
      currency: "ZAR"
    },
    capabilities: {
      products: ["Mixers", "Amplifiers", "Microphones", "Audio Processors"],
      services: ["Installation", "Technical Support", "Training"],
      certifications: [{ id: "cert2", name: "BEE Level 2", issuer: "SANAS", validUntil: "2025-06-30" }],
      leadTime: 21,
      minimumOrderValue: 10000,
      paymentTerms: "Net 30"
    },
    performance: {
      overallRating: 4.5,
      qualityRating: 4.6,
      deliveryRating: 4.4,
      serviceRating: 4.5,
      priceRating: 4.3,
      metrics: {
        onTimeDeliveryRate: 92,
        qualityAcceptanceRate: 96,
        responseTime: 4,
        defectRate: 2.1,
        leadTimeVariance: 5
      },
      kpis: [],
      lastEvaluationDate: new Date("2024-02-01"),
      nextEvaluationDate: new Date("2024-08-01")
    },
    financial: {
      creditRating: "A-",
      paymentTerms: "Net 30",
      currency: "ZAR"
    },
    createdAt: new Date("2023-02-01"),
    updatedAt: new Date("2024-02-05"),
    createdBy: "admin",
    lastContactDate: new Date("2024-02-03")
  },
  {
    id: "SUP-1003",
    name: "Legacy Brands",
    code: "LEGACY",
    status: "active",
    tier: "approved",
    category: "Musical Instruments",
    subcategory: "Guitars & Amplifiers",
    tags: ["guitars", "amplifiers", "vintage", "classic"],
    contacts: [{
      id: "c3",
      type: "primary",
      name: "Mike Rodriguez",
      title: "Sales Director",
      email: "mike@legacybrands.co.za",
      phone: "+27 31 456 7890",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a3",
      type: "headquarters",
      addressLine1: "789 Guitar Lane",
      city: "Durban",
      state: "KwaZulu-Natal",
      postalCode: "4000",
      country: "South Africa",
      isPrimary: true,
      isActive: true
    }],
    businessInfo: {
      legalName: "Legacy Brands (Pty) Ltd",
      tradingName: "Legacy Brands",
      taxId: "3456789012",
      registrationNumber: "2015/345678/07",
      website: "https://www.legacybrands.co.za",
      foundedYear: 2015,
      employeeCount: 18,
      annualRevenue: 12000000,
      currency: "ZAR"
    },
    capabilities: {
      products: ["Electric Guitars", "Acoustic Guitars", "Amplifiers", "Effects Pedals"],
      services: ["Guitar Setup", "Repairs", "Custom Modifications"],
      certifications: [{ id: "cert3", name: "BEE Level 3", issuer: "SANAS", validUntil: "2025-03-31" }],
      leadTime: 28,
      minimumOrderValue: 3000,
      paymentTerms: "Net 30"
    },
    performance: {
      overallRating: 4.3,
      qualityRating: 4.4,
      deliveryRating: 4.2,
      serviceRating: 4.3,
      priceRating: 4.1,
      metrics: {
        onTimeDeliveryRate: 89,
        qualityAcceptanceRate: 94,
        responseTime: 6,
        defectRate: 2.8,
        leadTimeVariance: 7
      },
      kpis: [],
      lastEvaluationDate: new Date("2024-01-20"),
      nextEvaluationDate: new Date("2024-07-20")
    },
    financial: {
      creditRating: "B+",
      paymentTerms: "Net 30",
      currency: "ZAR"
    },
    createdAt: new Date("2023-03-01"),
    updatedAt: new Date("2024-01-25"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-22")
  }
];

/* removed legacy sample suppliers */

/*
  {
    id: "1",
    name: "TechCorp Solutions Inc",
    code: "TECH001",
    status: "active",
    tier: "strategic",
    category: "Technology",
    subcategory: "Software Development",
    tags: ["preferred", "enterprise", "cloud", "innovation"],
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
      products: ["Software Development", "Cloud Services", "AI Solutions"],
      services: ["Consulting", "Support", "Training"],
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
    lastContactDate: new Date("2024-01-18"),
    nextReviewDate: new Date("2024-06-15")
  },
  {
    id: "2",
    name: "Global Manufacturing Inc",
    code: "MANUF001",
    status: "active",
    tier: "preferred",
    category: "Manufacturing",
    subcategory: "Industrial Equipment",
    tags: ["reliable", "iso-certified", "automotive"],
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
      products: ["Components", "Assembly", "Custom Parts"],
      services: ["Manufacturing", "Quality Control", "Testing"],
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
    lastContactDate: new Date("2024-01-12"),
    nextReviewDate: new Date("2024-05-20")
  },
  {
    id: "3",
    name: "EcoSupply Solutions",
    code: "ECO001",
    status: "pending",
    tier: "approved",
    category: "Sustainability",
    subcategory: "Green Materials",
    tags: ["green", "certified", "renewable"],
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
      products: ["Sustainable Materials", "Eco-Packaging", "Recyclables"],
      services: ["Consulting", "Carbon Footprint Analysis", "Sustainability Audits"],
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
    lastContactDate: new Date("2024-01-05"),
    nextReviewDate: new Date("2024-04-10")
  },
  {
    id: "4",
    name: "Pacific Logistics Corp",
    code: "LOG001",
    status: "inactive",
    tier: "conditional",
    category: "Logistics",
    subcategory: "Freight & Shipping",
    tags: ["logistics", "shipping", "warehousing"],
    contacts: [{
      id: "c4",
      type: "primary",
      name: "David Chen",
      title: "Logistics Manager",
      email: "david@pacificlogistics.com",
      phone: "+1-555-0126",
      isPrimary: true,
      isActive: true
    }],
    addresses: [{
      id: "a4",
      type: "headquarters",
      addressLine1: "321 Harbor Drive",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90015",
      country: "USA",
      isPrimary: true,
      isActive: true
    }],
    businessInfo: {
      legalName: "Pacific Logistics Corporation",
      tradingName: "Pacific Logistics",
      taxId: "77-2468135",
      registrationNumber: "REG901234",
      website: "https://pacificlogistics.com",
      foundedYear: 2008,
      employeeCount: 180,
      annualRevenue: 35000000,
      currency: "USD"
    },
    capabilities: {
      products: ["Shipping", "Warehousing", "Distribution"],
      services: ["Logistics Planning", "Inventory Management", "Supply Chain Optimization"],
      certifications: [],
      leadTime: 14,
      paymentTerms: "Net 60"
    },
    performance: {
      overallRating: 3.8,
      qualityRating: 3.9,
      deliveryRating: 3.6,
      serviceRating: 4.0,
      priceRating: 3.9,
      metrics: {
        onTimeDeliveryRate: 78,
        qualityAcceptanceRate: 87,
        responseTime: 6,
        defectRate: 4.5,
        leadTimeVariance: 18
      },
      kpis: [],
      lastEvaluationDate: new Date("2023-12-20"),
      nextEvaluationDate: new Date("2024-06-20")
    },
    financial: {
      creditRating: "C+",
      paymentTerms: "Net 60",
      currency: "USD"
    },
    createdAt: new Date("2022-03-10"),
    updatedAt: new Date("2023-12-25"),
    createdBy: "admin",
    lastContactDate: new Date("2023-12-18"),
    nextReviewDate: new Date("2024-03-15")
  }
*/

interface SupplierDirectoryProps {}

const SupplierDirectory: React.FC<SupplierDirectoryProps> = () => {
  const [suppliers] = useState<Supplier[]>(sampleSuppliers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<SupplierSortOptions>({
    field: "name",
    direction: "asc"
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<SupplierSearchFilters>({})
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [showFilters, setShowFilters] = useState(false)

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(suppliers.map(s => s.category)))
    const statuses = Array.from(new Set(suppliers.map(s => s.status)))
    const tiers = Array.from(new Set(suppliers.map(s => s.tier)))
    const locations = Array.from(new Set(suppliers.map(s => s.addresses[0]?.country).filter(Boolean)))

    return { categories, statuses, tiers, locations }
  }, [suppliers])

  // Filter and sort suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    const filtered = suppliers.filter(supplier => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesQuery =
          supplier.name.toLowerCase().includes(query) ||
          supplier.code.toLowerCase().includes(query) ||
          supplier.businessInfo.legalName.toLowerCase().includes(query) ||
          supplier.category.toLowerCase().includes(query) ||
          supplier.tags.some(tag => tag.toLowerCase().includes(query))

        if (!matchesQuery) return false
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(supplier.status)) return false
      }

      // Tier filter
      if (filters.tier && filters.tier.length > 0) {
        if (!filters.tier.includes(supplier.tier)) return false
      }

      // Category filter
      if (filters.category && filters.category.length > 0) {
        if (!filters.category.includes(supplier.category)) return false
      }

      // Location filter
      if (filters.location && filters.location.length > 0) {
        const supplierCountry = supplier.addresses[0]?.country
        if (!supplierCountry || !filters.location.includes(supplierCountry)) return false
      }

      // Performance rating filter
      if (filters.performanceRating) {
        const rating = supplier.performance.overallRating
        if (rating < filters.performanceRating.min || rating > filters.performanceRating.max) {
          return false
        }
      }

      return true
    })

    // Sort filtered results
    filtered.sort((a, b) => {
      let aValue: unknown, bValue: unknown

      switch (sortConfig.field) {
        case "name":
          aValue = a.businessInfo.tradingName || a.businessInfo.legalName
          bValue = b.businessInfo.tradingName || b.businessInfo.legalName
          break
        case "code":
          aValue = a.code
          bValue = b.code
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "tier":
          aValue = a.tier
          bValue = b.tier
          break
        case "performanceRating":
          aValue = a.performance.overallRating
          bValue = b.performance.overallRating
          break
        case "lastContactDate":
          aValue = a.lastContactDate || new Date(0)
          bValue = b.lastContactDate || new Date(0)
          break
        case "createdAt":
          aValue = a.createdAt
          bValue = b.createdAt
          break
        default:
          aValue = a.name
          bValue = b.name
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [suppliers, searchQuery, filters, sortConfig])

  // Pagination
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAndSortedSuppliers.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedSuppliers, currentPage, pageSize])

  const totalPages = Math.ceil(filteredAndSortedSuppliers.length / pageSize)

  // Handle sorting
  const handleSort = useCallback((field: SupplierSortOptions["field"]) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }))
  }, [])

  // Handle supplier selection
  const handleSelectSupplier = useCallback((supplierId: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedSuppliers(prev =>
      prev.length === paginatedSuppliers.length
        ? []
        : paginatedSuppliers.map(s => s.id)
    )
  }, [paginatedSuppliers])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchQuery("")
  }, [])

  // Render sort icon
  const renderSortIcon = (field: SupplierSortOptions["field"]) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />
    }
    return sortConfig.direction === "asc"
      ? <SortAsc className="h-4 w-4" />
      : <SortDesc className="h-4 w-4" />
  }

  const breadcrumbs = [
    { label: "Suppliers" }
  ]

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Directory</h1>
            <p className="text-muted-foreground">
              Manage and monitor all your suppliers in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Suppliers</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {suppliers.filter(s => s.status === "active").length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Strategic</p>
                  <p className="text-2xl font-bold">
                    {suppliers.filter(s => s.tier === "strategic").length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">
                    {(suppliers.reduce((sum, s) => sum + s.performance.overallRating, 0) / suppliers.length).toFixed(1)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search suppliers by name, code, category, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(showFilters && "bg-accent")}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {Object.keys(filters).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.keys(filters).length}
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
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2 block">Status</p>
                    <Select
                      value={filters.status?.[0] || ""}
                      onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, status: value ? [value as unknown] : undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {filterOptions.statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">Tier</p>
                    <Select
                      value={filters.tier?.[0] || ""}
                      onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, tier: value ? [value as unknown] : undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Tiers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        {filterOptions.tiers.map(tier => (
                          <SelectItem key={tier} value={tier}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">Category</p>
                    <Select
                      value={filters.category?.[0] || ""}
                      onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, category: value ? [value] : undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {filterOptions.categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">Location</p>
                    <Select
                      value={filters.location?.[0] || ""}
                      onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, location: value ? [value] : undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {filterOptions.locations.map(location => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">View</p>
                    <Select value={viewMode} onValueChange={(value: unknown) => setViewMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table View</SelectItem>
                        <SelectItem value="cards">Card View</SelectItem>
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
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedSuppliers.length} of {filteredAndSortedSuppliers.length} suppliers
            </p>
            {selectedSuppliers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedSuppliers.length} selected
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSuppliers.length === paginatedSuppliers.length && paginatedSuppliers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("name")}
                      className="h-8 p-0 hover:bg-transparent"
                    >
                      Supplier
                      {renderSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("status")}
                      className="h-8 p-0 hover:bg-transparent"
                    >
                      Status
                      {renderSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("tier")}
                      className="h-8 p-0 hover:bg-transparent"
                    >
                      Tier
                      {renderSortIcon("tier")}
                    </Button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("performanceRating")}
                      className="h-8 p-0 hover:bg-transparent"
                    >
                      Performance
                      {renderSortIcon("performanceRating")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("lastContactDate")}
                      className="h-8 p-0 hover:bg-transparent"
                    >
                      Last Contact
                      {renderSortIcon("lastContactDate")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSuppliers.includes(supplier.id)}
                        onCheckedChange={() => handleSelectSupplier(supplier.id)}
                      />
                    </TableCell>
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
                            {supplier.code}
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
                      <div>
                        <div className="font-medium">{supplier.category}</div>
                        {supplier.subcategory && (
                          <div className="text-sm text-muted-foreground">
                            {supplier.subcategory}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {supplier.addresses[0]?.city}, {supplier.addresses[0]?.country}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {supplier.performance.overallRating.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(supplier.performance.metrics.onTimeDeliveryRate)} OTD
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {supplier.lastContactDate
                          ? formatDate(supplier.lastContactDate)
                          : "Never"
                        }
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
                            New Purchase Order
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            View Contracts
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Financial Records
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    
  )
}

export default SupplierDirectory
