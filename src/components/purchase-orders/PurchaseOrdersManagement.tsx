"use client"

import React, { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Package,
  Truck,
  FileText,
  Settings,
  Upload,
  Printer,
  Mail,
  Star,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'

import { cn, formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

import POCreationWizard from './POCreationWizard'
import PODetailsModal from './PODetailsModal'
import ApprovalWorkflow from './ApprovalWorkflow'
import BulkOperations from './BulkOperations'
import POTemplates from './POTemplates'
import CurrencyManager from './CurrencyManager'

// Types
export interface PurchaseOrderItem {
  id: string
  productCode: string
  description: string
  quantity: number
  unitPrice: number
  currency: string
  totalPrice: number
  deliveryDate?: Date
  specifications?: string
  category: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'acknowledged' | 'in_progress' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdDate: Date
  requestedDeliveryDate: Date
  approvedDate?: Date
  sentDate?: Date
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  currency: string
  exchangeRate: number
  budgetCode?: string
  department: string
  requestedBy: string
  approvedBy?: string
  notes?: string
  attachments: string[]
  deliveryAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  billingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  terms: {
    paymentTerms: string
    deliveryTerms: string
    warrantyTerms: string
  }
  trackingNumber?: string
  invoiceNumber?: string
  changeOrders: ChangeOrder[]
  approvalWorkflow: ApprovalStep[]
}

export interface ChangeOrder {
  id: string
  changeNumber: string
  description: string
  reason: string
  originalAmount: number
  newAmount: number
  impact: string
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: string
  requestedDate: Date
  approvedBy?: string
  approvedDate?: Date
}

export interface ApprovalStep {
  id: string
  stepNumber: number
  approverRole: string
  approverName: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  approvedDate?: Date
  comments?: string
  required: boolean
}

// Mock data
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    supplierId: 'SUP001',
    supplierName: 'TechCorp Solutions',
    status: 'approved',
    priority: 'high',
    createdDate: new Date('2024-01-15'),
    requestedDeliveryDate: new Date('2024-02-15'),
    approvedDate: new Date('2024-01-18'),
    items: [
      {
        id: '1-1',
        productCode: 'LAPTOP-001',
        description: 'Dell Latitude 7420 Laptop',
        quantity: 10,
        unitPrice: 1200,
        currency: 'USD',
        totalPrice: 12000,
        category: 'Hardware'
      }
    ],
    subtotal: 12000,
    taxAmount: 1200,
    shippingCost: 150,
    totalAmount: 13350,
    currency: 'USD',
    exchangeRate: 1,
    department: 'IT',
    requestedBy: 'John Doe',
    approvedBy: 'Jane Smith',
    notes: 'Urgent requirement for new hires',
    attachments: ['specs.pdf', 'quote.xlsx'],
    deliveryAddress: {
      street: '123 Business St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    billingAddress: {
      street: '123 Business St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    terms: {
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Destination',
      warrantyTerms: '1 Year Standard'
    },
    changeOrders: [],
    approvalWorkflow: [
      {
        id: 'step-1',
        stepNumber: 1,
        approverRole: 'Department Manager',
        approverName: 'Jane Smith',
        status: 'approved',
        approvedDate: new Date('2024-01-17'),
        required: true
      },
      {
        id: 'step-2',
        stepNumber: 2,
        approverRole: 'Finance Director',
        approverName: 'Bob Johnson',
        status: 'approved',
        approvedDate: new Date('2024-01-18'),
        required: true
      }
    ]
  }
  // Add more mock data as needed
]

const PurchaseOrdersManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [currentView, setCurrentView] = useState<'grid' | 'list'>('list')
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isBulkOperationsOpen, setIsBulkOperationsOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [isCurrencyManagerOpen, setIsCurrencyManagerOpen] = useState(false)

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    return mockPurchaseOrders.filter(order => {
      const matchesSearch =
        order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.department.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter
      const matchesDepartment = departmentFilter === 'all' || order.department === departmentFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesDepartment
    })
  }, [searchTerm, statusFilter, priorityFilter, departmentFilter])

  // Statistics
  const stats = useMemo(() => {
    const total = mockPurchaseOrders.length
    const pending = mockPurchaseOrders.filter(po => po.status === 'pending').length
    const approved = mockPurchaseOrders.filter(po => po.status === 'approved').length
    const inProgress = mockPurchaseOrders.filter(po => ['sent', 'acknowledged', 'in_progress', 'shipped'].includes(po.status)).length
    const totalValue = mockPurchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)

    return { total, pending, approved, inProgress, totalValue }
  }, [])

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId])
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const openOrderDetails = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'sent': return <Send className="h-4 w-4" />
      case 'in_progress': return <Package className="h-4 w-4" />
      case 'shipped': return <Truck className="h-4 w-4" />
      case 'delivered': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-500" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage purchase orders, track approvals, and monitor deliveries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsTemplatesOpen(true)}>
            <Star className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" onClick={() => setIsCurrencyManagerOpen(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Currency
          </Button>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Being processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number, supplier, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedOrders.length} order(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkOperationsOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Bulk Actions
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Purchase Orders ({filteredOrders.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrders.length === filteredOrders.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                        aria-label={`Select ${order.poNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.poNumber}</span>
                        <span className="text-sm text-muted-foreground">
                          by {order.requestedBy}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.supplierName}</span>
                        <span className="text-sm text-muted-foreground">
                          {order.items.length} item(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <Badge
                          variant="outline"
                          className={getStatusColor(order.status)}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(order.priority)}
                        <span className="capitalize">{order.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.department}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </span>
                        {order.currency !== 'USD' && (
                          <span className="text-sm text-muted-foreground">
                            Rate: {order.exchangeRate}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDate(order.createdDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDate(order.requestedDeliveryDate)}
                      </span>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openOrderDetails(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Send className="h-4 w-4 mr-2" />
                            Send to Supplier
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
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
        </CardContent>
      </Card>

      {/* Modals and Dialogs */}
      <POCreationWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      <PODetailsModal
        order={selectedOrder}
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <BulkOperations
        open={isBulkOperationsOpen}
        onClose={() => setIsBulkOperationsOpen(false)}
        selectedOrders={selectedOrders}
        orders={mockPurchaseOrders}
      />

      <POTemplates
        open={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />

      <CurrencyManager
        open={isCurrencyManagerOpen}
        onClose={() => setIsCurrencyManagerOpen(false)}
      />
    </div>
  )
}

// Helper function to calculate order progress
function getOrderProgress(order: PurchaseOrder): number {
  const statusProgress: Record<string, number> = {
    'draft': 10,
    'pending': 20,
    'approved': 40,
    'sent': 50,
    'acknowledged': 60,
    'in_progress': 70,
    'shipped': 85,
    'delivered': 95,
    'completed': 100,
    'cancelled': 0
  }

  return statusProgress[order.status] || 0
}

export default PurchaseOrdersManagement