"use client"

import React, { useState, useMemo } from "react"
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  DollarSign,
  CreditCard,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  Upload,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  Building2,
  Globe,
  ShieldCheck,
  BarChart3,
  FileText,
  Settings,
  RefreshCw,
  CheckSquare,
  ArrowUpDown,
  ArrowRight,
  History,
  Banknote,
  Wallet,
  PiggyBank,
  CreditCardIcon,
} from "lucide-react"
import { format, addDays, isAfter, isBefore } from "date-fns"

// Mock data types
interface PaymentMethod {
  id: string
  type: 'bank_transfer' | 'wire' | 'check' | 'ach' | 'credit_card'
  name: string
  accountNumber: string
  isDefault: boolean
  isActive: boolean
  fees: number
  processingTime: string
}

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber: string
  currency: string
  balance: number
  isActive: boolean
  lastSync: Date
}

interface Payment {
  id: string
  supplierId: string
  supplierName: string
  invoiceNumber: string
  amount: number
  currency: string
  dueDate: Date
  scheduledDate?: Date
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'
  paymentMethod: string
  reference: string
  notes?: string
  createdDate: Date
  processedDate?: Date
  confirmationNumber?: string
  exchangeRate?: number
  fees: number
  netAmount: number
  approvals: {
    level: number
    approver: string
    status: 'pending' | 'approved' | 'rejected'
    date?: Date
    notes?: string
  }[]
}

interface CashFlowProjection {
  date: Date
  inflow: number
  outflow: number
  netFlow: number
  cumulativeBalance: number
}

// Mock data
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: "pm1",
    type: "bank_transfer",
    name: "Primary Business Account",
    accountNumber: "****1234",
    isDefault: true,
    isActive: true,
    fees: 0,
    processingTime: "1-2 business days"
  },
  {
    id: "pm2",
    type: "wire",
    name: "International Wire",
    accountNumber: "****5678",
    isDefault: false,
    isActive: true,
    fees: 25,
    processingTime: "Same day"
  },
  {
    id: "pm3",
    type: "ach",
    name: "ACH Transfer",
    accountNumber: "****9012",
    isDefault: false,
    isActive: true,
    fees: 1.5,
    processingTime: "2-3 business days"
  }
]

const mockBankAccounts: BankAccount[] = [
  {
    id: "ba1",
    bankName: "Chase Business",
    accountName: "MantisNXT Operating",
    accountNumber: "****1234",
    routingNumber: "021000021",
    currency: "USD",
    balance: 485750.00,
    isActive: true,
    lastSync: new Date()
  },
  {
    id: "ba2",
    bankName: "Wells Fargo",
    accountName: "MantisNXT Reserve",
    accountNumber: "****5678",
    routingNumber: "121000248",
    currency: "USD",
    balance: 125000.00,
    isActive: true,
    lastSync: addDays(new Date(), -1)
  }
]

const mockPayments: Payment[] = [
  {
    id: "pay1",
    supplierId: "sup1",
    supplierName: "TechCorp Solutions",
    invoiceNumber: "INV-2024-001",
    amount: 25000,
    currency: "USD",
    dueDate: addDays(new Date(), 3),
    scheduledDate: addDays(new Date(), 1),
    status: "scheduled",
    paymentMethod: "Primary Business Account",
    reference: "REF-001",
    notes: "Q1 Software License",
    createdDate: addDays(new Date(), -5),
    fees: 0,
    netAmount: 25000,
    approvals: [
      { level: 1, approver: "Manager", status: "approved", date: addDays(new Date(), -2) },
      { level: 2, approver: "Director", status: "approved", date: addDays(new Date(), -1) }
    ]
  },
  {
    id: "pay2",
    supplierId: "sup2",
    supplierName: "Global Manufacturing Inc",
    invoiceNumber: "INV-2024-002",
    amount: 45000,
    currency: "USD",
    dueDate: addDays(new Date(), 7),
    status: "pending",
    paymentMethod: "ACH Transfer",
    reference: "REF-002",
    createdDate: addDays(new Date(), -3),
    fees: 1.5,
    netAmount: 45001.5,
    approvals: [
      { level: 1, approver: "Manager", status: "pending" }
    ]
  },
  {
    id: "pay3",
    supplierId: "sup3",
    supplierName: "European Suppliers Ltd",
    invoiceNumber: "INV-2024-003",
    amount: 15750,
    currency: "EUR",
    dueDate: addDays(new Date(), -2),
    status: "processing",
    paymentMethod: "International Wire",
    reference: "REF-003",
    createdDate: addDays(new Date(), -10),
    processedDate: new Date(),
    exchangeRate: 1.08,
    fees: 25,
    netAmount: 17035,
    approvals: [
      { level: 1, approver: "Manager", status: "approved", date: addDays(new Date(), -8) },
      { level: 2, approver: "Director", status: "approved", date: addDays(new Date(), -7) }
    ]
  }
]

const mockCashFlow: CashFlowProjection[] = [
  { date: new Date(), inflow: 125000, outflow: 85000, netFlow: 40000, cumulativeBalance: 485750 },
  { date: addDays(new Date(), 1), inflow: 0, outflow: 25000, netFlow: -25000, cumulativeBalance: 460750 },
  { date: addDays(new Date(), 2), inflow: 75000, outflow: 15000, netFlow: 60000, cumulativeBalance: 520750 },
  { date: addDays(new Date(), 3), inflow: 0, outflow: 45000, netFlow: -45000, cumulativeBalance: 475750 },
  { date: addDays(new Date(), 4), inflow: 50000, outflow: 10000, netFlow: 40000, cumulativeBalance: 515750 },
  { date: addDays(new Date(), 5), inflow: 0, outflow: 30000, netFlow: -30000, cumulativeBalance: 485750 },
  { date: addDays(new Date(), 6), inflow: 100000, outflow: 20000, netFlow: 80000, cumulativeBalance: 565750 }
]

const PaymentMethodIcon = ({ type }: { type: PaymentMethod['type'] }) => {
  switch (type) {
    case 'bank_transfer':
      return <Banknote className="h-4 w-4" />
    case 'wire':
      return <Globe className="h-4 w-4" />
    case 'check':
      return <FileText className="h-4 w-4" />
    case 'ach':
      return <RefreshCw className="h-4 w-4" />
    case 'credit_card':
      return <CreditCard className="h-4 w-4" />
    default:
      return <DollarSign className="h-4 w-4" />
  }
}

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
  const variants = {
    pending: { variant: "secondary" as const, label: "Pending", icon: Clock },
    scheduled: { variant: "default" as const, label: "Scheduled", icon: CalendarIcon },
    processing: { variant: "default" as const, label: "Processing", icon: RefreshCw },
    completed: { variant: "default" as const, label: "Completed", icon: CheckCircle },
    failed: { variant: "destructive" as const, label: "Failed", icon: XCircle },
    cancelled: { variant: "secondary" as const, label: "Cancelled", icon: XCircle }
  }

  const { variant, label, icon: Icon } = variants[status]

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

export default function PaymentsPage() {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false)
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  // Filter payments based on search and filters
  const filteredPayments = useMemo(() => {
    return mockPayments.filter(payment => {
      const matchesSearch = payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.reference.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || payment.status === statusFilter

      const matchesDate = !dateRange.from || !dateRange.to ||
                         (isAfter(payment.dueDate, dateRange.from) && isBefore(payment.dueDate, dateRange.to))

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [searchTerm, statusFilter, dateRange])

  // Calculate totals
  const totals = useMemo(() => {
    const pending = filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
    const scheduled = filteredPayments.filter(p => p.status === 'scheduled').reduce((sum, p) => sum + p.amount, 0)
    const processing = filteredPayments.filter(p => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0)
    const overdue = filteredPayments.filter(p => p.status === 'pending' && isAfter(new Date(), p.dueDate)).reduce((sum, p) => sum + p.amount, 0)

    return { pending, scheduled, processing, overdue, total: pending + scheduled + processing }
  }, [filteredPayments])

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayments(prev => [...prev, paymentId])
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayments(filteredPayments.map(p => p.id))
    } else {
      setSelectedPayments([])
    }
  }

  const handleBulkAction = (action: string) => {
    // Implementation would depend on the action
    console.log(`Bulk action: ${action} for payments:`, selectedPayments)
    setSelectedPayments([])
  }

  const breadcrumbs = [
    { label: "Financial", href: "/financial" },
    { label: "Payments" }
  ]

  return (
    <SelfContainedLayout title="Payments" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments Management</h1>
            <p className="text-muted-foreground">
              Manage payment schedules, approvals, and bank transfers
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkPaymentDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Payment Run
            </Button>
            <Button onClick={() => setShowNewPaymentDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Payment
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.pending.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {mockPayments.filter(p => p.status === 'pending').length} payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.scheduled.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {mockPayments.filter(p => p.status === 'scheduled').length} payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.processing.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {mockPayments.filter(p => p.status === 'processing').length} payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">${totals.overdue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {mockPayments.filter(p => p.status === 'pending' && isAfter(new Date(), p.dueDate)).length} payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">Payment Queue</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          {/* Payment Queue Tab */}
          <TabsContent value="payments" className="space-y-4">
            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Queue</CardTitle>
                <CardDescription>
                  Manage and process scheduled payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPayments.length > 0 && (
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            Bulk Actions ({selectedPayments.length})
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkAction('approve')}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve Selected
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('schedule')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Schedule Selected
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('cancel')}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Selected
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payments Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPayments.length === filteredPayments.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayments.includes(payment.id)}
                          onCheckedChange={(checked) => handleSelectPayment(payment.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.supplierName}</div>
                          <div className="text-sm text-muted-foreground">{payment.reference}</div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {payment.currency} {payment.amount.toLocaleString()}
                          </div>
                          {payment.fees > 0 && (
                            <div className="text-sm text-muted-foreground">
                              +${payment.fees} fees
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "text-sm",
                          isAfter(new Date(), payment.dueDate) && payment.status === 'pending' && "text-destructive font-medium"
                        )}>
                          {format(payment.dueDate, 'MMM dd, yyyy')}
                          {isAfter(new Date(), payment.dueDate) && payment.status === 'pending' && (
                            <div className="text-xs">Overdue</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PaymentMethodIcon type={mockPaymentMethods.find(pm => pm.name === payment.paymentMethod)?.type || 'bank_transfer'} />
                          <span className="text-sm">{payment.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {payment.approvals.map((approval, index) => (
                            <div key={index} className="flex items-center gap-1">
                              {approval.status === 'approved' ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : approval.status === 'rejected' ? (
                                <XCircle className="h-3 w-3 text-red-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                              <span className="text-xs">L{approval.level}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedPayment(payment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Process Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Payment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="methods" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Configure and manage payment methods for different suppliers
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Method
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mockPaymentMethods.map((method) => (
                    <Card key={method.id} className={cn("border-2", method.isDefault && "border-primary")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PaymentMethodIcon type={method.type} />
                            <div>
                              <CardTitle className="text-base">{method.name}</CardTitle>
                              <CardDescription>{method.accountNumber}</CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {method.isDefault && (
                              <Badge variant="default" className="text-xs">Default</Badge>
                            )}
                            <Badge variant={method.isActive ? "default" : "secondary"} className="text-xs">
                              {method.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Processing Time:</span>
                            <span>{method.processingTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fees:</span>
                            <span>{method.fees === 0 ? 'Free' : `$${method.fees}`}</span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Settings className="mr-2 h-3 w-3" />
                            Settings
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Bank Accounts</CardTitle>
                  <CardDescription>
                    Manage connected bank accounts and monitor balances
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync All
                  </Button>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockBankAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{account.bankName}</h3>
                              <p className="text-sm text-muted-foreground">{account.accountName}</p>
                              <p className="text-xs text-muted-foreground">
                                {account.accountNumber} • {account.routingNumber}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {account.currency} {account.balance.toLocaleString()}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Last sync: {format(account.lastSync, 'MMM dd, HH:mm')}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={account.isActive ? "default" : "secondary"} className="text-xs">
                                {account.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="mr-2 h-3 w-3" />
                                Sync
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cashflow" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Cash Flow Forecast</CardTitle>
                  <CardDescription>
                    Projected inflows and outflows for the next week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCashFlow.map((flow, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{format(flow.date, 'MMM dd')}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(flow.date, 'EEEE')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-4 text-sm">
                            <div className="text-green-600">
                              +${flow.inflow.toLocaleString()}
                            </div>
                            <div className="text-red-600">
                              -${flow.outflow.toLocaleString()}
                            </div>
                          </div>
                          <div className={cn(
                            "font-medium",
                            flow.netFlow >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {flow.netFlow >= 0 ? '+' : ''}${flow.netFlow.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${flow.cumulativeBalance.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Balance
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Summary</CardTitle>
                  <CardDescription>
                    Weekly totals and projections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">Total Inflows</div>
                          <div className="text-sm text-muted-foreground">Expected receipts</div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        +${mockCashFlow.reduce((sum, f) => sum + f.inflow, 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-red-600 rotate-180" />
                        <div>
                          <div className="font-medium">Total Outflows</div>
                          <div className="text-sm text-muted-foreground">Scheduled payments</div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-red-600">
                        -${mockCashFlow.reduce((sum, f) => sum + f.outflow, 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Net Flow</div>
                          <div className="text-sm text-muted-foreground">Week total</div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        +${mockCashFlow.reduce((sum, f) => sum + f.netFlow, 0).toLocaleString()}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 rounded-lg border-2 border-primary/20">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Projected Balance</div>
                          <div className="text-sm text-muted-foreground">End of period</div>
                        </div>
                      </div>
                      <div className="text-xl font-bold">
                        ${mockCashFlow[mockCashFlow.length - 1].cumulativeBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Volume</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2.4M</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    +12% vs last month
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    156 payments processed
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Processing Time</CardTitle>
                  <CardDescription>Time to complete</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.8 days</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 rotate-180" />
                    -0.3 days improvement
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Faster than target (2 days)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Success Rate</CardTitle>
                  <CardDescription>Successful vs failed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98.7%</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Excellent performance
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    2 failed out of 156
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Payment Methods Usage</CardTitle>
                  <CardDescription>Distribution of payment methods used</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          <span className="text-sm">Bank Transfer</span>
                        </div>
                        <span className="text-sm font-medium">65%</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          <span className="text-sm">ACH</span>
                        </div>
                        <span className="text-sm font-medium">25%</span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="text-sm">Wire Transfer</span>
                        </div>
                        <span className="text-sm font-medium">10%</span>
                      </div>
                      <Progress value={10} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reconciliation Tab */}
          <TabsContent value="reconciliation" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Statement Import</CardTitle>
                  <CardDescription>
                    Upload and reconcile bank statements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop your bank statement file here
                    </p>
                    <Button variant="outline">
                      Choose File
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Supported formats:</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">CSV</Badge>
                      <Badge variant="outline">OFX</Badge>
                      <Badge variant="outline">QIF</Badge>
                      <Badge variant="outline">MT940</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reconciliation Status</CardTitle>
                  <CardDescription>
                    Current reconciliation progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">January 2024</span>
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Reconciled
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">February 2024</span>
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Reconciled
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">March 2024</span>
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        In Progress
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Outstanding Items</h4>
                    <div className="text-sm text-muted-foreground">
                      5 unmatched transactions
                    </div>
                    <div className="text-sm text-muted-foreground">
                      2 missing confirmations
                    </div>
                  </div>

                  <Button className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    View Reconciliation Details
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Unmatched Transactions</CardTitle>
                <CardDescription>
                  Bank transactions that need to be matched with payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{format(addDays(new Date(), -2), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>WIRE TRANSFER FROM TECHCORP</TableCell>
                      <TableCell className="text-green-600">+$25,000.00</TableCell>
                      <TableCell>Credit</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Match Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{format(addDays(new Date(), -3), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>ACH DEBIT GLOBAL MFG</TableCell>
                      <TableCell className="text-red-600">-$1,500.00</TableCell>
                      <TableCell>Debit</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Match Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Payment Dialog */}
        <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Payment</DialogTitle>
              <DialogDescription>
                Create a new payment schedule for a supplier invoice
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sup1">TechCorp Solutions</SelectItem>
                      <SelectItem value="sup2">Global Manufacturing Inc</SelectItem>
                      <SelectItem value="sup3">European Suppliers Ltd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice">Invoice Number</Label>
                  <Input id="invoice" placeholder="INV-2024-004" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD</SelectItem>
                      <SelectItem value="eur">EUR</SelectItem>
                      <SelectItem value="gbp">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Pick a date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPaymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Additional payment notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowNewPaymentDialog(false)}>
                Schedule Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Payment Dialog */}
        <Dialog open={showBulkPaymentDialog} onOpenChange={setShowBulkPaymentDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Bulk Payment Run</DialogTitle>
              <DialogDescription>
                Process multiple payments in a single batch
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  This will process {selectedPayments.length} payments. Please review carefully before proceeding.
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2">Selected Payments:</h4>
                <div className="space-y-2">
                  {mockPayments
                    .filter(p => selectedPayments.includes(p.id))
                    .map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{payment.supplierName}</div>
                          <div className="text-sm text-muted-foreground">{payment.invoiceNumber}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{payment.currency} {payment.amount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{payment.paymentMethod}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Processing Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(new Date(), 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={new Date()} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <div className="p-3 border rounded-md bg-muted">
                    <div className="text-lg font-bold">
                      ${mockPayments
                        .filter(p => selectedPayments.includes(p.id))
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowBulkPaymentDialog(false)}>
                Process Bulk Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Details Dialog */}
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            {selectedPayment && (
              <>
                <DialogHeader>
                  <DialogTitle>Payment Details</DialogTitle>
                  <DialogDescription>
                    {selectedPayment.invoiceNumber} - {selectedPayment.supplierName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                      <p className="text-lg font-bold">
                        {selectedPayment.currency} {selectedPayment.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <StatusBadge status={selectedPayment.status} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Due Date</Label>
                      <p>{format(selectedPayment.dueDate, 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Payment Method</Label>
                      <p>{selectedPayment.paymentMethod}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reference</Label>
                      <p>{selectedPayment.reference}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Fees</Label>
                      <p>${selectedPayment.fees}</p>
                    </div>
                  </div>

                  {selectedPayment.notes && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                        <p className="text-sm">{selectedPayment.notes}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Approval Progress</Label>
                    <div className="space-y-2 mt-2">
                      {selectedPayment.approvals.map((approval, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 border rounded">
                          {approval.status === 'approved' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : approval.status === 'rejected' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">Level {approval.level} - {approval.approver}</div>
                            {approval.date && (
                              <div className="text-sm text-muted-foreground">
                                {format(approval.date, 'PPP')}
                              </div>
                            )}
                          </div>
                          <Badge variant={
                            approval.status === 'approved' ? 'default' :
                            approval.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {approval.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                    Close
                  </Button>
                  <Button>
                    Process Payment
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SelfContainedLayout>
  )
}