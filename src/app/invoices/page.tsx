"use client"

import { useState, useEffect, useMemo } from "react"
import AppLayout from '@/components/layout/AppLayout'
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
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Receipt,
  Target,
  TrendingUp,
  Settings,
  Percent,
  Zap,
  Paperclip,
  MessageSquare,
  History,
  UserCheck,
  Send,
  Ban,
  Copy
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
  DropdownMenuTrigger
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
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { formatCurrency, formatDate, formatDateTime, getStatusColor, cn } from "@/lib/utils"
import type {
  Invoice,
  InvoiceStatus,
  PaymentStatus,
  InvoiceFilters,
  InvoiceMetrics,
  ThreeWayMatchStatus
} from "@/types/invoice"

// Mock data - in real app this would come from API
const mockInvoices: Invoice[] = [
  {
    id: "INV-001",
    number: "INV-2024-001",
    supplierId: "SUP-001",
    supplierName: "TechCorp Solutions",
    supplierCode: "TECH001",
    purchaseOrderId: "PO-001",
    purchaseOrderNumber: "PO-2024-001",
    receiptId: "REC-001",
    receiptNumber: "REC-2024-001",
    invoiceDate: "2024-01-15",
    dueDate: "2024-02-15",
    paymentTerms: "Net 30",
    currency: "ZAR",
    subtotal: 10000,
    taxAmount: 800,
    discountAmount: 500,
    shippingAmount: 200,
    totalAmount: 10500,
    paidAmount: 0,
    remainingAmount: 10500,
    status: "under_review",
    approvalStatus: "pending",
    paymentStatus: "pending",
    matchingStatus: "matched",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-01-15T09:00:00Z",
    ocrProcessed: true,
    ocrConfidence: 95,
    manualReview: false,
    disputed: false,
    lineItems: [],
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
    createdBy: "user1",
    updatedBy: "user1",
    earlyPaymentDiscount: {
      percentage: 2,
      daysEarly: 10,
      discountAmount: 210,
      eligibleUntil: "2024-02-05"
    }
  },
  {
    id: "INV-002",
    number: "INV-2024-002",
    supplierId: "SUP-002",
    supplierName: "Global Supplies Inc",
    supplierCode: "GLOB002",
    invoiceDate: "2024-01-20",
    dueDate: "2024-02-20",
    paymentTerms: "Net 30",
    currency: "ZAR",
    subtotal: 5000,
    taxAmount: 400,
    discountAmount: 0,
    shippingAmount: 100,
    totalAmount: 5500,
    paidAmount: 5500,
    remainingAmount: 0,
    status: "paid",
    approvalStatus: "approved",
    paymentStatus: "paid",
    matchingStatus: "exceptions",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-01-20T10:30:00Z",
    processedDate: "2024-01-21T14:15:00Z",
    approvedDate: "2024-01-22T16:45:00Z",
    paidDate: "2024-01-25T11:20:00Z",
    ocrProcessed: true,
    ocrConfidence: 88,
    manualReview: true,
    disputed: false,
    lineItems: [],
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-25T11:20:00Z",
    createdBy: "user1",
    updatedBy: "user2"
  },
  {
    id: "INV-003",
    number: "INV-2024-003",
    supplierId: "SUP-003",
    supplierName: "Regional Manufacturing",
    supplierCode: "REGI003",
    invoiceDate: "2024-01-25",
    dueDate: "2024-02-10",
    paymentTerms: "Net 15",
    currency: "ZAR",
    subtotal: 15000,
    taxAmount: 1200,
    discountAmount: 750,
    shippingAmount: 300,
    totalAmount: 15750,
    paidAmount: 0,
    remainingAmount: 15750,
    status: "overdue",
    approvalStatus: "approved",
    paymentStatus: "overdue",
    matchingStatus: "manual_review",
    taxCompliant: false,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-01-25T08:45:00Z",
    processedDate: "2024-01-26T12:30:00Z",
    approvedDate: "2024-01-27T10:15:00Z",
    ocrProcessed: false,
    manualReview: true,
    disputed: true,
    disputeReason: "Price variance exceeds tolerance",
    disputeDate: "2024-02-01",
    lineItems: [],
    createdAt: "2024-01-25T08:45:00Z",
    updatedAt: "2024-02-01T14:20:00Z",
    createdBy: "user1",
    updatedBy: "user3"
  }
]

const mockMetrics: InvoiceMetrics = {
  totalInvoices: 156,
  totalValue: 2450000,
  averageProcessingTime: 2.5,
  approvalRate: 94.2,
  disputeRate: 3.8,
  onTimePaymentRate: 89.1,
  earlyPaymentSavings: 48500,
  exceptionRate: 12.5,
  automationRate: 87.3
}

const getMatchingStatusIcon = (status: ThreeWayMatchStatus) => {
  switch (status) {
    case "matched":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "exceptions":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case "manual_review":
      return <Eye className="h-4 w-4 text-blue-600" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "in_progress":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "not_started":
      return <Clock className="h-4 w-4 text-muted-foreground" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(mockInvoices)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [sortField, setSortField] = useState<keyof Invoice>("invoiceDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Filter and sort invoices
  useEffect(() => {
    let filtered = invoices.filter(invoice => {
      const matchesSearch = searchQuery === "" ||
        invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.supplierCode.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = !filters.status?.length ||
        filters.status.includes(invoice.status)

      const matchesPaymentStatus = !filters.paymentStatus?.length ||
        filters.paymentStatus.includes(invoice.paymentStatus)

      const matchesApprovalStatus = !filters.approvalStatus?.length ||
        filters.approvalStatus.includes(invoice.approvalStatus)

      const matchesSupplier = !filters.supplierId?.length ||
        filters.supplierId.includes(invoice.supplierId)

      const matchesCurrency = !filters.currency?.length ||
        filters.currency.includes(invoice.currency)

      const matchesAmount = !filters.amountRange ||
        (invoice.totalAmount >= filters.amountRange.min &&
         invoice.totalAmount <= filters.amountRange.max)

      return matchesSearch && matchesStatus && matchesPaymentStatus &&
             matchesApprovalStatus && matchesSupplier && matchesCurrency &&
             matchesAmount
    })

    // Apply tab-based filtering
    if (activeTab !== "all") {
      switch (activeTab) {
        case "pending":
          filtered = filtered.filter(inv =>
            inv.approvalStatus === "pending" || inv.status === "under_review"
          )
          break
        case "approved":
          filtered = filtered.filter(inv => inv.approvalStatus === "approved")
          break
        case "paid":
          filtered = filtered.filter(inv => inv.paymentStatus === "paid")
          break
        case "overdue":
          filtered = filtered.filter(inv =>
            inv.status === "overdue" || inv.paymentStatus === "overdue"
          )
          break
        case "disputed":
          filtered = filtered.filter(inv => inv.disputed)
          break
        case "exceptions":
          filtered = filtered.filter(inv =>
            inv.matchingStatus === "exceptions" || inv.matchingStatus === "manual_review"
          )
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

      return 0
    })

    setFilteredInvoices(filtered)
    setCurrentPage(1)
  }, [invoices, searchQuery, filters, sortField, sortDirection, activeTab])

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredInvoices, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)

  const handleSort = (field: keyof Invoice) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const handleSelectAll = () => {
    setSelectedInvoices(
      selectedInvoices.length === paginatedInvoices.length
        ? []
        : paginatedInvoices.map(invoice => invoice.id)
    )
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    const colors = getStatusColor(status)
    return (
      <Badge className={colors}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const colors = getStatusColor(status)
    return (
      <Badge className={colors}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const handleBulkApprove = async () => {
    // Implement bulk approval logic
    console.log("Bulk approve:", selectedInvoices)
  }

  const handleBulkReject = async () => {
    // Implement bulk rejection logic
    console.log("Bulk reject:", selectedInvoices)
  }

  const handleBulkExport = async () => {
    // Implement bulk export logic
    console.log("Bulk export:", selectedInvoices)
  }

  const handleOCRProcess = async (invoiceId: string) => {
    // Implement OCR processing logic
    console.log("OCR process:", invoiceId)
  }

  const handleThreeWayMatch = async (invoiceId: string) => {
    // Implement three-way matching logic
    console.log("Three-way match:", invoiceId)
  }

  const TabCountBadge = ({ count }: { count: number }) => (
    <Badge variant="secondary" className="ml-2 text-xs">
      {count}
    </Badge>
  )

  return (
    <AppLayout title="Invoices" breadcrumbs={[{ label: "Invoice Management" }]}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoice Management</h2>
          <p className="text-muted-foreground">
            Comprehensive invoice processing, approval, and payment management
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
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Create a new invoice or upload invoice documents for processing
                </DialogDescription>
              </DialogHeader>
              <InvoiceCreationForm onClose={() => setShowCreateDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(mockMetrics.totalValue)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.averageProcessingTime} days</div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.automationRate}% automated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.disputeRate}% dispute rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Early Payment Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockMetrics.earlyPaymentSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.onTimePaymentRate}% on-time payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice Overview</CardTitle>
              <CardDescription>
                Manage and track all invoice processing activities
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
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
                  <InvoiceFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                View Options
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs for different invoice views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">
                All
                <TabCountBadge count={filteredInvoices.length} />
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                <TabCountBadge count={
                  invoices.filter(inv =>
                    inv.approvalStatus === "pending" || inv.status === "under_review"
                  ).length
                } />
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved
                <TabCountBadge count={
                  invoices.filter(inv => inv.approvalStatus === "approved").length
                } />
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid
                <TabCountBadge count={
                  invoices.filter(inv => inv.paymentStatus === "paid").length
                } />
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue
                <TabCountBadge count={
                  invoices.filter(inv =>
                    inv.status === "overdue" || inv.paymentStatus === "overdue"
                  ).length
                } />
              </TabsTrigger>
              <TabsTrigger value="disputed">
                Disputed
                <TabCountBadge count={
                  invoices.filter(inv => inv.disputed).length
                } />
              </TabsTrigger>
              <TabsTrigger value="exceptions">
                Exceptions
                <TabCountBadge count={
                  invoices.filter(inv =>
                    inv.matchingStatus === "exceptions" ||
                    inv.matchingStatus === "manual_review"
                  ).length
                } />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Bulk Actions */}
          {selectedInvoices.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedInvoices.length} invoice(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={handleBulkApprove}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkReject}>
                  <Ban className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button size="sm" variant="outline">
                  <Send className="mr-2 h-4 w-4" />
                  Send for Payment
                </Button>
              </div>
            </div>
          )}

          {/* Invoice Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedInvoices.length === paginatedInvoices.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("number")}
                  >
                    <div className="flex items-center">
                      Invoice #
                      {sortField === "number" && (
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
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("invoiceDate")}
                  >
                    <div className="flex items-center">
                      Date
                      {sortField === "invoiceDate" && (
                        sortDirection === "asc" ?
                        <ArrowUp className="ml-2 h-4 w-4" /> :
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center">
                      Due Date
                      {sortField === "dueDate" && (
                        sortDirection === "asc" ?
                        <ArrowUp className="ml-2 h-4 w-4" /> :
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>3-Way Match</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={() => handleSelectInvoice(invoice.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.number}</span>
                        {invoice.purchaseOrderNumber && (
                          <span className="text-xs text-muted-foreground">
                            PO: {invoice.purchaseOrderNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.supplierName}</span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.supplierCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "font-medium",
                          new Date(invoice.dueDate) < new Date() &&
                            invoice.paymentStatus !== "paid" &&
                            "text-red-600"
                        )}
                      >
                        {formatDate(invoice.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </span>
                        {invoice.remainingAmount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Remaining: {formatCurrency(invoice.remainingAmount, invoice.currency)}
                          </span>
                        )}
                        {invoice.earlyPaymentDiscount &&
                         new Date(invoice.earlyPaymentDiscount.eligibleUntil) > new Date() && (
                          <span className="text-xs text-green-600">
                            Early discount available
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {getStatusBadge(invoice.status)}
                        {invoice.disputed && (
                          <Badge variant="destructive" className="text-xs">
                            Disputed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(invoice.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          {getMatchingStatusIcon(invoice.matchingStatus)}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{invoice.matchingStatus.replace("_", " ")}</p>
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
                              setSelectedInvoice(invoice)
                              setShowInvoiceDetail(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.matchingStatus !== "matched" && (
                            <DropdownMenuItem
                              onClick={() => handleThreeWayMatch(invoice.id)}
                            >
                              <Target className="mr-2 h-4 w-4" />
                              3-Way Match
                            </DropdownMenuItem>
                          )}
                          {!invoice.ocrProcessed && (
                            <DropdownMenuItem
                              onClick={() => handleOCRProcess(invoice.id)}
                            >
                              <Zap className="mr-2 h-4 w-4" />
                              Process OCR
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Send for Approval
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Add Comment
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
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
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
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

      {/* Invoice Detail Dialog */}
      <Dialog open={showInvoiceDetail} onOpenChange={setShowInvoiceDetail}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete invoice information and processing history
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceDetailView
              invoice={selectedInvoice}
              onClose={() => setShowInvoiceDetail(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  )
}

// Invoice Creation Form Component
function InvoiceCreationForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="ocr">OCR Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
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
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input id="invoiceNumber" placeholder="INV-2024-001" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input id="invoiceDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount</Label>
              <Input id="amount" type="number" placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZAR">ZAR</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Drop your invoice files here, or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports PDF, PNG, JPG files up to 10MB
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ocr" className="space-y-4">
          <div className="text-center py-8">
            <Zap className="mx-auto h-12 w-12 text-blue-500" />
            <h3 className="mt-4 text-lg font-medium">OCR Processing</h3>
            <p className="text-sm text-gray-600 mt-2">
              Upload invoice documents for automatic data extraction using OCR technology
            </p>
            <Button className="mt-4">
              <Upload className="mr-2 h-4 w-4" />
              Upload for OCR
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button>
          Create Invoice
        </Button>
      </DialogFooter>
    </div>
  )
}

// Invoice Filters Component
function InvoiceFilters({
  filters,
  onFiltersChange
}: {
  filters: InvoiceFilters
  onFiltersChange: (filters: InvoiceFilters) => void
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <Label className="text-sm font-medium">Status</Label>
        <div className="mt-2 space-y-2">
          {["draft", "submitted", "under_review", "approved", "rejected", "paid", "overdue"].map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={status}
                checked={filters.status?.includes(status as InvoiceStatus)}
                onCheckedChange={(checked) => {
                  const currentStatuses = filters.status || []
                  const newStatuses = checked
                    ? [...currentStatuses, status as InvoiceStatus]
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
        <Label className="text-sm font-medium">Payment Status</Label>
        <div className="mt-2 space-y-2">
          {["pending", "paid", "partially_paid", "overdue", "failed"].map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`payment-${status}`}
                checked={filters.paymentStatus?.includes(status as PaymentStatus)}
                onCheckedChange={(checked) => {
                  const currentStatuses = filters.paymentStatus || []
                  const newStatuses = checked
                    ? [...currentStatuses, status as PaymentStatus]
                    : currentStatuses.filter(s => s !== status)
                  onFiltersChange({
                    ...filters,
                    paymentStatus: newStatuses.length > 0 ? newStatuses : undefined
                  })
                }}
              />
              <Label htmlFor={`payment-${status}`} className="text-sm capitalize">
                {status.replace("_", " ")}
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

// Invoice Detail View Component
function InvoiceDetailView({
  invoice,
  onClose
}: {
  invoice: Invoice
  onClose: () => void
}) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="matching">3-Way Match</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Invoice Number</Label>
                    <p className="font-medium">{invoice.number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Invoice Date</Label>
                    <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Terms</Label>
                    <p className="font-medium">{invoice.paymentTerms}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Currency</Label>
                    <p className="font-medium">{invoice.currency}</p>
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
                    <p className="font-medium">{invoice.supplierName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supplier Code</Label>
                    <p className="font-medium">{invoice.supplierCode}</p>
                  </div>
                  {invoice.purchaseOrderNumber && (
                    <div>
                      <Label className="text-muted-foreground">Purchase Order</Label>
                      <p className="font-medium">{invoice.purchaseOrderNumber}</p>
                    </div>
                  )}
                  {invoice.receiptNumber && (
                    <div>
                      <Label className="text-muted-foreground">Receipt Number</Label>
                      <p className="font-medium">{invoice.receiptNumber}</p>
                    </div>
                  )}
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
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(invoice.taxAmount, invoice.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Tax</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatCurrency(invoice.remainingAmount, invoice.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
              </div>

              {invoice.earlyPaymentDiscount && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Percent className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      Early Payment Discount Available
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Save {formatCurrency(invoice.earlyPaymentDiscount.discountAmount, invoice.currency)}
                    ({invoice.earlyPaymentDiscount.percentage}%) if paid by{" "}
                    {formatDate(invoice.earlyPaymentDiscount.eligibleUntil)}
                  </p>
                </div>
              )}
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
                <div className="flex items-center justify-between">
                  <span>Current Status</span>
                  <Badge className={getStatusColor(invoice.approvalStatus)}>
                    {invoice.approvalStatus.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Document Received</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(invoice.receivedDate)}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>

                  {invoice.processedDate && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Document Processed</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(invoice.processedDate)}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      invoice.approvalStatus === "approved" ? "bg-green-500" : "bg-yellow-500"
                    )}></div>
                    <div className="flex-1">
                      <p className="font-medium">Approval Review</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.approvedDate ?
                          formatDateTime(invoice.approvedDate) :
                          "Pending approval"
                        }
                      </p>
                    </div>
                    {invoice.approvedDate ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Three-Way Matching</CardTitle>
              <CardDescription>
                Compare invoice, purchase order, and receipt data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Matching Status</span>
                  <div className="flex items-center space-x-2">
                    {getMatchingStatusIcon(invoice.matchingStatus)}
                    <Badge className={getStatusColor(invoice.matchingStatus)}>
                      {invoice.matchingStatus.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Invoice</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Amount</span>
                          <span className="font-medium">
                            {formatCurrency(invoice.totalAmount, invoice.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date</span>
                          <span>{formatDate(invoice.invoiceDate)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Purchase Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoice.purchaseOrderNumber ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Amount</span>
                            <span className="font-medium">
                              {formatCurrency(invoice.totalAmount, invoice.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>PO #</span>
                            <span>{invoice.purchaseOrderNumber}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No PO linked</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Receipt</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoice.receiptNumber ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Receipt #</span>
                            <span>{invoice.receiptNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status</span>
                            <span className="text-green-600">Matched</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No receipt linked</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {invoice.matchingStatus === "exceptions" && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="text-sm text-yellow-800">
                        Matching Exceptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span>Price variance exceeds tolerance (5%)</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span>Quantity discrepancy found</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>
                Payment status, schedule, and transaction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Payment Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(invoice.paymentStatus)}>
                        {invoice.paymentStatus.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <p className="font-medium">Electronic Transfer</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount Paid</Label>
                    <p className="font-medium">
                      {formatCurrency(invoice.paidAmount, invoice.currency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Remaining</Label>
                    <p className="font-medium">
                      {formatCurrency(invoice.remainingAmount, invoice.currency)}
                    </p>
                  </div>
                </div>

                {invoice.remainingAmount > 0 && (
                  <div className="flex space-x-2">
                    <Button>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Schedule Payment
                    </Button>
                    <Button variant="outline">
                      <Send className="mr-2 h-4 w-4" />
                      Send to Payments
                    </Button>
                  </div>
                )}

                {invoice.paidDate && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">
                        Payment Completed
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Paid on {formatDateTime(invoice.paidDate)}
                    </p>
                  </div>
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
                View and manage invoice documents and attachments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Document
                </Button>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Original Invoice.pdf</p>
                        <p className="text-sm text-muted-foreground">Uploaded 2 hours ago</p>
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

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Receipt className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Delivery Receipt.pdf</p>
                        <p className="text-sm text-muted-foreground">Uploaded 1 day ago</p>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Complete history of invoice processing and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Invoice created</p>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(invoice.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created by {invoice.createdBy}
                    </p>
                  </div>
                </div>

                {invoice.processedDate && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">OCR processing completed</p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(invoice.processedDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {invoice.ocrConfidence}%
                      </p>
                    </div>
                  </div>
                )}

                {invoice.approvedDate && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Invoice approved</p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(invoice.approvedDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Approved by finance team
                      </p>
                    </div>
                  </div>
                )}

                {invoice.paidDate && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Payment processed</p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(invoice.paidDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(invoice.totalAmount, invoice.currency)} paid
                      </p>
                    </div>
                  </div>
                )}

                {invoice.disputed && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Dispute raised</p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(invoice.disputeDate!)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Reason: {invoice.disputeReason}
                      </p>
                    </div>
                  </div>
                )}
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
          Edit Invoice
        </Button>
      </DialogFooter>
    </div>
  )
}