"use client"

import { useState, useEffect, useMemo } from "react"
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Package,
  Truck,
  Target,
  TrendingUp,
  AlertCircle,
  Users,
  RefreshCw,
  Settings,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Banknote,
  Percent,
  FileCheck,
  FileX,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  BookOpen,
  Paperclip,
  MessageSquare,
  History,
  UserCheck,
  Send,
  Ban,
  Copy,
  ExternalLink,
  Shield,
  Star,
  Receipt,
  CreditCard,
  ShoppingCart,
  Package2,
  Warehouse,
  ClipboardCheck,
  Calculator,
  List,
  Grid3X3,
  SortAsc,
  SortDesc
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"

import { formatCurrency, formatDate, formatDateTime, getStatusColor, cn } from "@/lib/utils"
import type {
  PurchaseOrder,
  POFilters,
  PODashboardMetrics,
  POAnalytics,
  BulkOperation,
  POTemplate,
  ReorderPoint
} from "@/types/purchase-order"

// Mock data - in real app this would come from API
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-001",
    poNumber: "PO-2024-001",
    supplierId: "SUP-001",
    supplierName: "TechCorp Solutions",
    supplierCode: "TECH001",
    status: "approved",
    priority: "high",
    createdDate: new Date("2024-01-15"),
    requestedDeliveryDate: new Date("2024-02-15"),
    confirmedDeliveryDate: new Date("2024-02-20"),
    approvedDate: new Date("2024-01-18"),
    items: [
      {
        id: "item-1",
        lineNumber: 1,
        productCode: "LAPTOP-001",
        description: "Dell Latitude 7420 Laptop",
        specifications: "Intel i7, 16GB RAM, 512GB SSD",
        category: "Hardware",
        subcategory: "Laptops",
        quantity: 10,
        receivedQuantity: 8,
        remainingQuantity: 2,
        unit: "EA",
        unitPrice: 1200,
        totalPrice: 12000,
        discountPercentage: 5,
        taxPercentage: 8,
        requestedDate: new Date("2024-02-15"),
        confirmedDate: new Date("2024-02-20"),
        status: "partially_received",
        qualityRequirements: ["Manufacturer Warranty", "QA Testing"],
        inspectionRequired: true,
        reorderPointTriggered: false
      }
    ],
    subtotal: 12000,
    taxAmount: 960,
    discountAmount: 600,
    shippingCost: 150,
    totalAmount: 12510,
    currency: "USD",
    exchangeRate: 1,
    budgetCode: "IT-2024-Q1",
    budgetAllocated: 50000,
    budgetRemaining: 37490,
    department: "IT",
    costCenter: "CC-001",
    approvalWorkflow: [
      {
        id: "step-1",
        stepNumber: 1,
        approverRole: "Department Manager",
        approverName: "Jane Smith",
        approverEmail: "jane.smith@company.com",
        status: "approved",
        approvalThreshold: 10000,
        required: true,
        approvedDate: new Date("2024-01-17"),
        comments: "Approved for urgent business needs"
      },
      {
        id: "step-2",
        stepNumber: 2,
        approverRole: "Finance Director",
        approverName: "Bob Johnson",
        approverEmail: "bob.johnson@company.com",
        status: "approved",
        approvalThreshold: 50000,
        required: true,
        approvedDate: new Date("2024-01-18"),
        comments: "Budget verified and approved"
      }
    ],
    currentApprovalStep: 2,
    requestedBy: "john.doe",
    requestedByName: "John Doe",
    approvedBy: "bob.johnson",
    approvedByName: "Bob Johnson",
    paymentTerms: "Net 30",
    deliveryTerms: "FOB Destination",
    warrantyTerms: "1 Year Standard Warranty",
    deliveryAddress: {
      id: "addr-1",
      name: "Main Office",
      street: "123 Business St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
      isDefault: true,
      contactName: "Receiving Department",
      contactPhone: "+1-555-0123",
      contactEmail: "receiving@company.com"
    },
    billingAddress: {
      id: "addr-2",
      name: "Corporate Headquarters",
      street: "123 Business St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
      isDefault: true,
      contactName: "Accounts Payable",
      contactPhone: "+1-555-0124",
      contactEmail: "ap@company.com"
    },
    notes: "Urgent requirement for new hires. Please expedite delivery.",
    internalNotes: "Coordinate with HR for setup schedule",
    attachments: [
      {
        id: "att-1",
        fileName: "laptop-specs.pdf",
        originalName: "Dell_Latitude_7420_Specifications.pdf",
        fileType: "application/pdf",
        fileSize: 2048000,
        uploadDate: new Date("2024-01-15"),
        uploadedBy: "john.doe",
        category: "specification",
        url: "/documents/laptop-specs.pdf",
        description: "Detailed technical specifications"
      }
    ],
    trackingNumber: "TRK-789456123",
    carrier: "FedEx",
    receipts: [
      {
        id: "rcpt-1",
        receiptNumber: "RCP-2024-001",
        receivedDate: new Date("2024-02-18"),
        receivedBy: "warehouse.team",
        items: [
          {
            id: "rcpt-item-1",
            poItemId: "item-1",
            receivedQuantity: 8,
            acceptedQuantity: 8,
            rejectedQuantity: 0,
            damagedQuantity: 0,
            location: "WH-A-01-B3",
            batchNumber: "BT-2024-0218",
            qualityGrade: "A",
            notes: "All items received in good condition"
          }
        ],
        status: "completed",
        qualityInspection: {
          id: "qi-1",
          inspectorName: "Quality Control Team",
          inspectionDate: new Date("2024-02-19"),
          status: "passed",
          criteria: [
            {
              id: "crit-1",
              criterion: "Physical Condition",
              required: true,
              result: "pass",
              notes: "No visible damage"
            },
            {
              id: "crit-2",
              criterion: "Functionality Test",
              required: true,
              result: "pass",
              notes: "All systems operational"
            }
          ],
          overallScore: 95,
          certificateNumber: "QC-2024-001"
        },
        attachments: []
      }
    ],
    invoices: [
      {
        id: "inv-1",
        invoiceNumber: "INV-TC-2024-001",
        supplierInvoiceNumber: "TC-789456",
        invoiceDate: new Date("2024-02-20"),
        amount: 12510,
        currency: "USD",
        status: "matched",
        matchingResults: [
          {
            field: "Amount",
            poValue: 12510,
            invoiceValue: 12510,
            matched: true,
            variance: 0,
            toleranceExceeded: false
          },
          {
            field: "Quantity",
            poValue: 10,
            invoiceValue: 10,
            receiptValue: 8,
            matched: false,
            variance: 2,
            toleranceExceeded: false,
            notes: "Partial delivery - remaining items on backorder"
          }
        ]
      }
    ],
    threeWayMatchStatus: "exceptions",
    changeOrders: [],
    riskScore: 15,
    complianceChecks: [
      {
        id: "comp-1",
        checkType: "budget",
        status: "compliant",
        description: "Budget allocation verified",
        details: "Order amount within approved budget limits"
      },
      {
        id: "comp-2",
        checkType: "contract",
        status: "compliant",
        description: "Contract terms verified",
        details: "Supplier has active master service agreement"
      }
    ],
    performanceMetrics: {
      onTimeDeliveryScore: 85,
      qualityScore: 95,
      priceVariancePercentage: 0,
      cycleTimeHours: 72,
      supplierResponseTimeHours: 4,
      changeOrderCount: 0,
      budgetVariancePercentage: 0,
      complianceScore: 100
    },
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2024-02-20T15:30:00Z"),
    version: 3,
    auditTrail: [
      {
        id: "audit-1",
        timestamp: new Date("2024-01-15T09:00:00Z"),
        userId: "john.doe",
        userName: "John Doe",
        action: "created",
        details: "Purchase order created",
        ipAddress: "192.168.1.100"
      },
      {
        id: "audit-2",
        timestamp: new Date("2024-01-18T14:30:00Z"),
        userId: "bob.johnson",
        userName: "Bob Johnson",
        action: "approved",
        details: "Purchase order approved by Finance Director",
        ipAddress: "192.168.1.101"
      }
    ]
  },
  // Add more mock data...
  {
    id: "PO-002",
    poNumber: "PO-2024-002",
    supplierId: "SUP-002",
    supplierName: "Global Supplies Inc",
    supplierCode: "GLOB002",
    status: "pending_approval",
    priority: "medium",
    createdDate: new Date("2024-01-20"),
    requestedDeliveryDate: new Date("2024-03-01"),
    items: [
      {
        id: "item-2",
        lineNumber: 1,
        productCode: "OFFICE-001",
        description: "Office Supplies Bundle",
        category: "Office Supplies",
        quantity: 50,
        receivedQuantity: 0,
        remainingQuantity: 50,
        unit: "SET",
        unitPrice: 45,
        totalPrice: 2250,
        discountPercentage: 10,
        taxPercentage: 8,
        requestedDate: new Date("2024-03-01"),
        status: "pending",
        inspectionRequired: false,
        reorderPointTriggered: true
      }
    ],
    subtotal: 2250,
    taxAmount: 180,
    discountAmount: 225,
    shippingCost: 75,
    totalAmount: 2280,
    currency: "USD",
    exchangeRate: 1,
    budgetCode: "OPS-2024-Q1",
    budgetAllocated: 25000,
    budgetRemaining: 22720,
    department: "Operations",
    costCenter: "CC-002",
    approvalWorkflow: [
      {
        id: "step-1",
        stepNumber: 1,
        approverRole: "Department Manager",
        approverName: "Sarah Wilson",
        approverEmail: "sarah.wilson@company.com",
        status: "pending",
        approvalThreshold: 5000,
        required: true
      }
    ],
    currentApprovalStep: 1,
    requestedBy: "mike.chen",
    requestedByName: "Mike Chen",
    paymentTerms: "Net 15",
    deliveryTerms: "FOB Origin",
    warrantyTerms: "30 Days",
    deliveryAddress: {
      id: "addr-1",
      name: "Main Office",
      street: "123 Business St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
      isDefault: true,
      contactName: "Receiving Department",
      contactPhone: "+1-555-0123",
      contactEmail: "receiving@company.com"
    },
    billingAddress: {
      id: "addr-2",
      name: "Corporate Headquarters",
      street: "123 Business St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
      isDefault: true,
      contactName: "Accounts Payable",
      contactPhone: "+1-555-0124",
      contactEmail: "ap@company.com"
    },
    notes: "Regular office supplies reorder",
    attachments: [],
    receipts: [],
    invoices: [],
    threeWayMatchStatus: "pending",
    changeOrders: [],
    riskScore: 5,
    complianceChecks: [
      {
        id: "comp-3",
        checkType: "budget",
        status: "compliant",
        description: "Budget allocation verified"
      }
    ],
    performanceMetrics: {
      onTimeDeliveryScore: 0,
      qualityScore: 0,
      priceVariancePercentage: 0,
      cycleTimeHours: 0,
      supplierResponseTimeHours: 0,
      changeOrderCount: 0,
      budgetVariancePercentage: 0,
      complianceScore: 100
    },
    createdAt: new Date("2024-01-20T10:00:00Z"),
    updatedAt: new Date("2024-01-20T10:00:00Z"),
    version: 1,
    auditTrail: [
      {
        id: "audit-3",
        timestamp: new Date("2024-01-20T10:00:00Z"),
        userId: "mike.chen",
        userName: "Mike Chen",
        action: "created",
        details: "Purchase order created",
        ipAddress: "192.168.1.102"
      }
    ]
  }
]

const mockMetrics: PODashboardMetrics = {
  totalOrders: 156,
  pendingApprovals: 12,
  inProgress: 34,
  overdueDeliveries: 5,
  totalValue: 2450000,
  budgetUtilization: 68.5,
  averageCycleTime: 72,
  onTimeDeliveryRate: 89.2,
  qualityScore: 94.5,
  costSavings: 125000,
  contractCompliance: 96.8,
  supplierPerformance: 91.3
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders)
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<POFilters>({})
  const [sortField, setSortField] = useState<keyof PurchaseOrder>("createdDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Filter and sort orders
  useEffect(() => {
    let filtered = purchaseOrders.filter(order => {
      const matchesSearch = searchQuery === "" ||
        order.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.department.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = !filters.status?.length ||
        filters.status.includes(order.status)

      const matchesPriority = !filters.priority?.length ||
        filters.priority.includes(order.priority)

      const matchesDepartment = !filters.department?.length ||
        filters.department.includes(order.department)

      const matchesSupplier = !filters.supplier?.length ||
        filters.supplier.includes(order.supplierId)

      const matchesAmount = !filters.amountRange ||
        (order.totalAmount >= filters.amountRange.min &&
         order.totalAmount <= filters.amountRange.max)

      return matchesSearch && matchesStatus && matchesPriority &&
             matchesDepartment && matchesSupplier && matchesAmount
    })

    // Apply tab-based filtering
    if (activeTab !== "all") {
      switch (activeTab) {
        case "pending":
          filtered = filtered.filter(order =>
            ["draft", "pending_approval"].includes(order.status)
          )
          break
        case "approved":
          filtered = filtered.filter(order => order.status === "approved")
          break
        case "in_progress":
          filtered = filtered.filter(order =>
            ["sent", "acknowledged", "in_progress", "shipped"].includes(order.status)
          )
          break
        case "received":
          filtered = filtered.filter(order =>
            ["received", "completed"].includes(order.status)
          )
          break
        case "exceptions":
          filtered = filtered.filter(order =>
            order.threeWayMatchStatus === "exceptions" ||
            order.complianceChecks.some(check => check.status === "non_compliant") ||
            order.riskScore > 50
          )
          break
        case "overdue":
          filtered = filtered.filter(order => {
            const today = new Date()
            return order.requestedDeliveryDate < today &&
                   !["received", "completed", "cancelled"].includes(order.status)
          })
          break
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      return 0
    })

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [purchaseOrders, searchQuery, filters, sortField, sortDirection, activeTab])

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredOrders, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  const handleSort = (field: keyof PurchaseOrder) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === paginatedOrders.length
        ? []
        : paginatedOrders.map(order => order.id)
    )
  }

  const getStatusBadge = (status: PurchaseOrder["status"]) => {
    const colors = getStatusColor(status)
    return (
      <Badge className={colors}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: PurchaseOrder["priority"]) => {
    const colorMap: Record<string, string> = {
      low: "bg-gray-100 text-gray-800 border-gray-200",
      medium: "bg-blue-100 text-blue-800 border-blue-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200"
    }

    return (
      <Badge className={colorMap[priority]}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const getRiskBadge = (riskScore: number) => {
    let level = "Low"
    let color = "bg-green-100 text-green-800 border-green-200"

    if (riskScore > 70) {
      level = "High"
      color = "bg-red-100 text-red-800 border-red-200"
    } else if (riskScore > 40) {
      level = "Medium"
      color = "bg-yellow-100 text-yellow-800 border-yellow-200"
    }

    return <Badge className={color}>{level} Risk</Badge>
  }

  const getOrderProgress = (order: PurchaseOrder): number => {
    const statusProgress: Record<string, number> = {
      'draft': 10,
      'pending_approval': 20,
      'approved': 40,
      'sent': 50,
      'acknowledged': 60,
      'in_progress': 70,
      'shipped': 80,
      'received': 90,
      'completed': 100,
      'cancelled': 0
    }
    return statusProgress[order.status] || 0
  }

  const getThreeWayMatchIcon = (status: PurchaseOrder["threeWayMatchStatus"]) => {
    switch (status) {
      case "matched":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "exceptions":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "manual_review":
        return <Eye className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const TabCountBadge = ({ count }: { count: number }) => (
    <Badge variant="secondary" className="ml-2 text-xs">
      {count}
    </Badge>
  )

  return (
    <SelfContainedLayout title="Purchase Orders" breadcrumbs={[]}>
      <TooltipProvider>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Purchase Orders Management</h2>
            <p className="text-muted-foreground">
              Complete PO lifecycle management with approval workflows, receiving, and analytics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Star className="mr-2 h-4 w-4" />
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  IT Equipment
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Package className="mr-2 h-4 w-4" />
                  Office Supplies
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Building2 className="mr-2 h-4 w-4" />
                  Services
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Create a new purchase order with multi-step approval workflow
                  </DialogDescription>
                </DialogHeader>
                <PurchaseOrderCreationForm onClose={() => setShowCreateDialog(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMetrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(mockMetrics.totalValue)} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMetrics.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMetrics.budgetUtilization}%</div>
              <div className="mt-1">
                <Progress value={mockMetrics.budgetUtilization} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMetrics.onTimeDeliveryRate}%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Metrics */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{mockMetrics.qualityScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cost Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(mockMetrics.costSavings)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Cycle Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{mockMetrics.averageCycleTime}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contract Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{mockMetrics.contractCompliance}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Supplier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{mockMetrics.supplierPerformance}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overdue Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">{mockMetrics.overdueDeliveries}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Purchase Order Overview</CardTitle>
                <CardDescription>
                  Manage purchase orders with comprehensive workflow controls
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-80"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <PurchaseOrderFilters
                      filters={filters}
                      onFiltersChange={setFilters}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Grid3X3 className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as "table" | "grid")}>
                      <DropdownMenuRadioItem value="table">
                        <List className="mr-2 h-4 w-4" />
                        Table View
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="grid">
                        <Grid3X3 className="mr-2 h-4 w-4" />
                        Grid View
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs for different order views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="all">
                  All
                  <TabCountBadge count={filteredOrders.length} />
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  <TabCountBadge count={
                    purchaseOrders.filter(order =>
                      ["draft", "pending_approval"].includes(order.status)
                    ).length
                  } />
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                  <TabCountBadge count={
                    purchaseOrders.filter(order => order.status === "approved").length
                  } />
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress
                  <TabCountBadge count={
                    purchaseOrders.filter(order =>
                      ["sent", "acknowledged", "in_progress", "shipped"].includes(order.status)
                    ).length
                  } />
                </TabsTrigger>
                <TabsTrigger value="received">
                  Received
                  <TabCountBadge count={
                    purchaseOrders.filter(order =>
                      ["received", "completed"].includes(order.status)
                    ).length
                  } />
                </TabsTrigger>
                <TabsTrigger value="exceptions">
                  Exceptions
                  <TabCountBadge count={
                    purchaseOrders.filter(order =>
                      order.threeWayMatchStatus === "exceptions" ||
                      order.complianceChecks.some(check => check.status === "non_compliant")
                    ).length
                  } />
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Overdue
                  <TabCountBadge count={
                    purchaseOrders.filter(order => {
                      const today = new Date()
                      return order.requestedDeliveryDate < today &&
                             !["received", "completed", "cancelled"].includes(order.status)
                    }).length
                  } />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Bulk Actions */}
            {selectedOrders.length > 0 && (
              <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedOrders.length} order(s) selected
                </span>
                <div className="flex items-center space-x-2">
                  <Button size="sm">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Bulk Approve
                  </Button>
                  <Button size="sm" variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Send to Suppliers
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Bulk Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate Orders
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Calculator className="mr-2 h-4 w-4" />
                        Budget Analysis
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Performance Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Ban className="mr-2 h-4 w-4" />
                        Cancel Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {/* Purchase Orders Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedOrders.length === paginatedOrders.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("poNumber")}
                    >
                      <div className="flex items-center">
                        PO Number
                        {sortField === "poNumber" && (
                          sortDirection === "asc" ?
                          <ArrowUp className="ml-2 h-4 w-4" /> :
                          <ArrowDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("supplierName")}
                    >
                      <div className="flex items-center">
                        Supplier
                        {sortField === "supplierName" && (
                          sortDirection === "asc" ?
                          <ArrowUp className="ml-2 h-4 w-4" /> :
                          <ArrowDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("totalAmount")}
                    >
                      <div className="flex items-center justify-end">
                        Amount
                        {sortField === "totalAmount" && (
                          sortDirection === "asc" ?
                          <ArrowUp className="ml-2 h-4 w-4" /> :
                          <ArrowDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("requestedDeliveryDate")}
                    >
                      <div className="flex items-center">
                        Delivery Date
                        {sortField === "requestedDeliveryDate" && (
                          sortDirection === "asc" ?
                          <ArrowUp className="ml-2 h-4 w-4" /> :
                          <ArrowDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>3-Way Match</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => handleSelectOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.poNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            by {order.requestedByName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.supplierName}</span>
                          <span className="text-xs text-muted-foreground">
                            {order.supplierCode} • {order.items.length} item(s)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {getStatusBadge(order.status)}
                          {order.status === "pending_approval" && (
                            <Badge variant="outline" className="text-xs">
                              Step {order.currentApprovalStep}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(order.priority)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Budget: {order.budgetCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "text-sm",
                          new Date(order.requestedDeliveryDate) < new Date() &&
                          !["received", "completed", "cancelled"].includes(order.status) &&
                          "text-red-600 font-medium"
                        )}>
                          {formatDate(order.requestedDeliveryDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Progress value={getOrderProgress(order)} className="w-20" />
                          <span className="text-xs text-muted-foreground">
                            {getOrderProgress(order)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(order.riskScore)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            {getThreeWayMatchIcon(order.threeWayMatchStatus)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{order.threeWayMatchStatus.replace("_", " ")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowOrderDetail(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status === "pending_approval" && (
                              <DropdownMenuItem>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Send to Supplier
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Receipt className="mr-2 h-4 w-4" />
                              Receiving
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Target className="mr-2 h-4 w-4" />
                              3-Way Match
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Add Note
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <History className="mr-2 h-4 w-4" />
                              Audit Trail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </p>
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows per page</p>
                  <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => setItemsPerPage(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ArrowUp className="h-4 w-4 rotate-180" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ArrowUp className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ArrowUp className="h-4 w-4 -rotate-90" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Order Detail Dialog */}
        <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
              <DialogDescription>
                Complete purchase order information and workflow status
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <PurchaseOrderDetailView
                order={selectedOrder}
                onClose={() => setShowOrderDetail(false)}
              />
            )}
          </DialogContent>
        </Dialog>
        </div>
      </TooltipProvider>
    </SelfContainedLayout>
  )
}

// Purchase Order Creation Form Component
function PurchaseOrderCreationForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech001">TechCorp Solutions</SelectItem>
                  <SelectItem value="glob002">Global Supplies Inc</SelectItem>
                  <SelectItem value="regi003">Regional Manufacturing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetCode">Budget Code</Label>
              <Input id="budgetCode" placeholder="e.g., IT-2024-Q1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Requested Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net30">Net 30</SelectItem>
                  <SelectItem value="net15">Net 15</SelectItem>
                  <SelectItem value="net60">Net 60</SelectItem>
                  <SelectItem value="2/10net30">2/10 Net 30</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Additional notes or requirements..." />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Add Line Items</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Add products or services to this purchase order
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Delivery Address</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryName">Address Name</Label>
                  <Input id="deliveryName" placeholder="e.g., Main Office" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryStreet">Street Address</Label>
                  <Input id="deliveryStreet" placeholder="123 Business St" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCity">City</Label>
                    <Input id="deliveryCity" placeholder="New York" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryState">State</Label>
                    <Input id="deliveryState" placeholder="NY" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryZip">ZIP Code</Label>
                    <Input id="deliveryZip" placeholder="10001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCountry">Country</Label>
                    <Input id="deliveryCountry" placeholder="USA" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Billing Address</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="sameAsDelivery" />
                  <Label htmlFor="sameAsDelivery">Same as delivery address</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingName">Address Name</Label>
                  <Input id="billingName" placeholder="e.g., Corporate HQ" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingStreet">Street Address</Label>
                  <Input id="billingStreet" placeholder="123 Business St" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="billingCity">City</Label>
                    <Input id="billingCity" placeholder="New York" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingState">State</Label>
                    <Input id="billingState" placeholder="NY" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="billingZip">ZIP Code</Label>
                    <Input id="billingZip" placeholder="10001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCountry">Country</Label>
                    <Input id="billingCountry" placeholder="USA" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <div className="text-center py-8">
            <UserCheck className="mx-auto h-12 w-12 text-blue-500" />
            <h3 className="mt-4 text-lg font-medium">Approval Workflow</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Configure the approval process for this purchase order
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Department Manager</p>
                    <p className="text-sm text-muted-foreground">Up to $10,000</p>
                  </div>
                </div>
                <Badge variant="outline">Required</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Finance Director</p>
                    <p className="text-sm text-muted-foreground">Above $10,000</p>
                  </div>
                </div>
                <Badge variant="outline">Auto-triggered</Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <div className="text-center py-8">
            <ClipboardCheck className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Review & Submit</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Review all details before submitting for approval
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="outline">
          Save as Draft
        </Button>
        <Button>
          Submit for Approval
        </Button>
      </DialogFooter>
    </div>
  )
}

// Purchase Order Filters Component
function PurchaseOrderFilters({
  filters,
  onFiltersChange
}: {
  filters: POFilters
  onFiltersChange: (filters: POFilters) => void
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <Label className="text-sm font-medium">Status</Label>
        <div className="mt-2 space-y-2">
          {["draft", "pending_approval", "approved", "sent", "in_progress", "received", "completed", "cancelled"].map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={status}
                checked={filters.status?.includes(status)}
                onCheckedChange={(checked) => {
                  const currentStatuses = filters.status || []
                  const newStatuses = checked
                    ? [...currentStatuses, status]
                    : currentStatuses.filter(s => s !== status)
                  onFiltersChange({
                    ...filters,
                    status: newStatuses.length > 0 ? newStatuses : undefined
                  })
                }}
              />
              <Label htmlFor={status} className="text-sm capitalize">
                {status.replace("_", " ")}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">Priority</Label>
        <div className="mt-2 space-y-2">
          {["low", "medium", "high", "urgent"].map((priority) => (
            <div key={priority} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${priority}`}
                checked={filters.priority?.includes(priority)}
                onCheckedChange={(checked) => {
                  const currentPriorities = filters.priority || []
                  const newPriorities = checked
                    ? [...currentPriorities, priority]
                    : currentPriorities.filter(p => p !== priority)
                  onFiltersChange({
                    ...filters,
                    priority: newPriorities.length > 0 ? newPriorities : undefined
                  })
                }}
              />
              <Label htmlFor={`priority-${priority}`} className="text-sm capitalize">
                {priority}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">Amount Range</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input
            placeholder="Min amount"
            type="number"
            value={filters.amountRange?.min || ""}
            onChange={(e) => {
              const min = parseFloat(e.target.value) || 0
              onFiltersChange({
                ...filters,
                amountRange: {
                  min,
                  max: filters.amountRange?.max || 999999
                }
              })
            }}
          />
          <Input
            placeholder="Max amount"
            type="number"
            value={filters.amountRange?.max || ""}
            onChange={(e) => {
              const max = parseFloat(e.target.value) || 999999
              onFiltersChange({
                ...filters,
                amountRange: {
                  min: filters.amountRange?.min || 0,
                  max
                }
              })
            }}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersChange({})}
        >
          Clear Filters
        </Button>
        <Button size="sm">
          Apply Filters
        </Button>
      </div>
    </div>
  )
}

// Purchase Order Detail View Component
function PurchaseOrderDetailView({
  order,
  onClose
}: {
  order: PurchaseOrder
  onClose: () => void
}) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
          <TabsTrigger value="matching">3-Way Match</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">PO Number</Label>
                    <p className="font-medium">{order.poNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <p className="font-medium capitalize">{order.priority}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{order.department}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Budget Code</Label>
                    <p className="font-medium">{order.budgetCode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Risk Score</Label>
                    <p className="font-medium">{order.riskScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supplier Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Supplier Name</Label>
                    <p className="font-medium">{order.supplierName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supplier Code</Label>
                    <p className="font-medium">{order.supplierCode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Terms</Label>
                    <p className="font-medium">{order.paymentTerms}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Delivery Terms</Label>
                    <p className="font-medium">{order.deliveryTerms}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(order.subtotal, order.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(order.taxAmount, order.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Tax</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(order.shippingCost, order.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Shipping</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Budget Utilization
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Budget: {order.budgetCode} •
                  Remaining: {formatCurrency(order.budgetRemaining, order.currency)}
                </p>
                <div className="mt-2">
                  <Progress
                    value={((order.budgetAllocated - order.budgetRemaining) / order.budgetAllocated) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Line Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">#{item.lineNumber}</Badge>
                          <span className="font-medium">{item.productCode}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                        {item.specifications && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Specs: {item.specifications}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(item.totalPrice, order.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × {formatCurrency(item.unitPrice, order.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <div className="mt-1">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Received</Label>
                        <p>{item.receivedQuantity} / {item.quantity} {item.unit}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Delivery Date</Label>
                        <p>{formatDate(item.requestedDate)}</p>
                      </div>
                    </div>

                    {item.qualityRequirements && item.qualityRequirements.length > 0 && (
                      <div className="mt-3">
                        <Label className="text-muted-foreground text-xs">Quality Requirements</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.qualityRequirements.map((req, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>
                Track the approval process and current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.approvalWorkflow.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      step.status === "approved" ? "bg-green-100 text-green-700" :
                      step.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      step.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{step.approverRole}</p>
                          <p className="text-sm text-muted-foreground">{step.approverName}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(step.status)}>
                            {step.status.toUpperCase()}
                          </Badge>
                          {step.approvedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(step.approvedDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      {step.comments && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{step.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receiving History</CardTitle>
              <CardDescription>
                Track received quantities and quality inspections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.receipts.length > 0 ? (
                <div className="space-y-4">
                  {order.receipts.map((receipt) => (
                    <div key={receipt.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">{receipt.receiptNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Received on {formatDate(receipt.receivedDate)} by {receipt.receivedBy}
                          </p>
                        </div>
                        <Badge className={getStatusColor(receipt.status)}>
                          {receipt.status.toUpperCase()}
                        </Badge>
                      </div>

                      {receipt.qualityInspection && (
                        <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-800">
                              Quality Inspection Passed
                            </span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Score: {receipt.qualityInspection.overallScore}% •
                            Inspector: {receipt.qualityInspection.inspectorName}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {receipt.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span>Line {item.poItemId}</span>
                            <div className="text-right">
                              <span className="font-medium">{item.receivedQuantity} received</span>
                              <span className="text-muted-foreground ml-2">
                                ({item.acceptedQuantity} accepted, {item.rejectedQuantity} rejected)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Receipts Yet</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Items will appear here once they are received
                  </p>
                  <Button className="mt-4">
                    <Receipt className="mr-2 h-4 w-4" />
                    Record Receipt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Three-Way Matching</CardTitle>
              <CardDescription>
                Compare purchase order, receipt, and invoice data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Matching Status</span>
                  <div className="flex items-center space-x-2">
                    {getThreeWayMatchIcon(order.threeWayMatchStatus)}
                    <Badge className={getStatusColor(order.threeWayMatchStatus)}>
                      {order.threeWayMatchStatus.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Purchase Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Amount</span>
                          <span className="font-medium">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Items</span>
                          <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Receipt</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {order.receipts.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Received</span>
                            <span>{order.items.reduce((sum, item) => sum + item.receivedQuantity, 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status</span>
                            <span className="text-green-600">Partial</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No receipts</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Invoice</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {order.invoices.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Amount</span>
                            <span className="font-medium">
                              {formatCurrency(order.invoices[0].amount, order.invoices[0].currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status</span>
                            <span className="text-green-600">Matched</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No invoices</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {order.threeWayMatchStatus === "exceptions" && order.invoices.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="text-sm text-yellow-800">
                        Matching Exceptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.invoices[0].matchingResults
                          .filter(result => !result.matched)
                          .map((result, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span>
                                {result.field}: Expected {result.poValue},
                                Invoice shows {result.invoiceValue}
                                {result.receiptValue && `, Receipt shows ${result.receiptValue}`}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attached Documents</CardTitle>
              <CardDescription>
                View and manage purchase order documents and attachments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Document
                </Button>

                {order.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {order.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{attachment.originalName}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(attachment.fileSize / 1024)} KB •
                              Uploaded {formatDate(attachment.uploadDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Documents</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      No documents have been attached to this order
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Complete history of purchase order changes and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.auditTrail.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{entry.action}</p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entry.details} by {entry.userName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button>
          <Edit className="mr-2 h-4 w-4" />
          Edit Order
        </Button>
      </DialogFooter>
    </div>
  )
}