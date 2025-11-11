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

import { formatCurrency, getStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'

import POCreationWizard from './POCreationWizard'
import PODetailsModal from './PODetailsModal'
import BulkOperations from './BulkOperations'
import POTemplates from './POTemplates'
import CurrencyManager from './CurrencyManager'
import { usePurchaseOrders, usePurchaseOrderMetrics } from '@/hooks/usePurchaseOrders'

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
  const [selectedOrder, setSelectedOrder] = useState<unknown | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isBulkOperationsOpen, setIsBulkOperationsOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [isCurrencyManagerOpen, setIsCurrencyManagerOpen] = useState(false)

  // Real API data hooks
  const {
    orders: databaseOrders,
    loading: ordersLoading,
    error: ordersError,
    fetchPurchaseOrders,
    deletePurchaseOrders
  } = usePurchaseOrders()

  const {
    metrics: databaseMetrics,
    loading: metricsLoading,
    error: metricsError
  } = usePurchaseOrderMetrics()

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    if (!databaseOrders || ordersLoading) return []

    return databaseOrders.filter(order => {
      const matchesSearch =
        order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.supplier_name && order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      // Note: priority filter disabled for now since our database schema doesn't have priority field
      // const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter
      // const matchesDepartment = departmentFilter === 'all' || order.department === departmentFilter

      return matchesSearch && matchesStatus
    })
  }, [databaseOrders, searchTerm, statusFilter, ordersLoading])

  // Statistics from API metrics
  const stats = useMemo(() => {
    if (databaseMetrics) {
      return {
        total: databaseMetrics.totalOrders || 0,
        pending: databaseMetrics.pendingApprovals || 0,
        approved: databaseMetrics.statusBreakdown?.approved || 0,
        inProgress: databaseMetrics.inProgress || 0,
        totalValue: databaseMetrics.totalValue || 0
      }
    }

    // Fallback calculation from orders data if metrics not available
    if (databaseOrders && databaseOrders.length > 0) {
      const total = databaseOrders.length
      const pending = databaseOrders.filter(po => po.status === 'pending_approval').length
      const approved = databaseOrders.filter(po => po.status === 'approved').length
      const inProgress = databaseOrders.filter(po => ['sent', 'acknowledged', 'in_progress', 'shipped'].includes(po.status)).length
      const totalValue = databaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0)

      return { total, pending, approved, inProgress, totalValue }
    }

    return { total: 0, pending: 0, approved: 0, inProgress: 0, totalValue: 0 }
  }, [databaseMetrics, databaseOrders])

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

  const openOrderDetails = (order: unknown) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  const handleDeleteOrders = async (orderIds: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${orderIds.length} order(s)?`)) {
      try {
        await deletePurchaseOrders(orderIds)
        setSelectedOrders(prev => prev.filter(id => !orderIds.includes(id)))
      } catch (error) {
        console.error('Error deleting orders:', error)
        alert('Failed to delete orders. Please try again.')
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />
      case 'pending_approval': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'sent': return <Send className="h-4 w-4" />
      case 'acknowledged': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Package className="h-4 w-4" />
      case 'shipped': return <Truck className="h-4 w-4" />
      case 'received': return <CheckCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      // Legacy support
      case 'pending': return <Clock className="h-4 w-4" />
      case 'delivered': return <CheckCircle className="h-4 w-4" />
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
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading purchase orders...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : ordersError ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-red-600">
                      Error loading purchase orders: {ordersError}
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                          aria-label={`Select ${order.po_number}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.po_number}</span>
                          <span className="text-sm text-muted-foreground">
                            Created: {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.supplier_name || 'Unknown Supplier'}</span>
                          <span className="text-sm text-muted-foreground">
                            Code: {order.supplier_code || 'N/A'}
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
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="capitalize">Medium</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">General</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCurrency(order.total_amount, order.currency)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Tax: {formatCurrency(order.tax_amount, order.currency)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {order.required_date
                            ? new Date(order.required_date).toLocaleDateString()
                            : 'Not specified'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Progress value={getOrderProgressFromStatus(order.status)} className="w-20" />
                          <span className="text-xs text-muted-foreground">
                            {getOrderProgressFromStatus(order.status)}%
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
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteOrders([order.id])}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
        orders={databaseOrders || []}
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

// Helper function to calculate order progress from database status
function getOrderProgressFromStatus(status: string): number {
  const statusProgress: Record<string, number> = {
    'draft': 10,
    'pending_approval': 20,
    'approved': 40,
    'sent': 50,
    'acknowledged': 60,
    'in_progress': 70,
    'shipped': 85,
    'received': 95,
    'completed': 100,
    'cancelled': 0
  }

  return statusProgress[status] || 0
}

// Helper function to calculate order progress (legacy support)
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