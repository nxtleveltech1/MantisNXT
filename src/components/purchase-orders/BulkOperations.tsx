"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Settings,
  Send,
  Mail,
  Trash2,
  Copy,
  Edit,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Package,
  User,
  Calendar
} from 'lucide-react'

import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { PurchaseOrder } from './PurchaseOrdersManagement'

interface BulkOperationsProps {
  open: boolean
  onClose: () => void
  selectedOrders: string[]
  orders: PurchaseOrder[]
}

type BulkAction =
  | 'send-to-supplier'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'change-status'
  | 'change-priority'
  | 'export'
  | 'print'
  | 'email'
  | 'duplicate'
  | 'delete'
  | 'add-notes'
  | 'update-delivery-date'

interface BulkActionConfig {
  id: BulkAction
  title: string
  description: string
  icon: React.ReactNode
  category: 'workflow' | 'communication' | 'export' | 'maintenance'
  requiresConfirmation: boolean
  requiresInput?: boolean
  dangerLevel?: 'low' | 'medium' | 'high'
}

const bulkActions: BulkActionConfig[] = [
  {
    id: 'send-to-supplier',
    title: 'Send to Suppliers',
    description: 'Send selected purchase orders to their respective suppliers',
    icon: <Send className="h-4 w-4" />,
    category: 'workflow',
    requiresConfirmation: true
  },
  {
    id: 'approve',
    title: 'Approve Orders',
    description: 'Approve all selected purchase orders',
    icon: <CheckCircle className="h-4 w-4" />,
    category: 'workflow',
    requiresConfirmation: true
  },
  {
    id: 'reject',
    title: 'Reject Orders',
    description: 'Reject all selected purchase orders',
    icon: <XCircle className="h-4 w-4" />,
    category: 'workflow',
    requiresConfirmation: true,
    requiresInput: true,
    dangerLevel: 'medium'
  },
  {
    id: 'cancel',
    title: 'Cancel Orders',
    description: 'Cancel all selected purchase orders',
    icon: <XCircle className="h-4 w-4" />,
    category: 'workflow',
    requiresConfirmation: true,
    requiresInput: true,
    dangerLevel: 'high'
  },
  {
    id: 'change-status',
    title: 'Change Status',
    description: 'Update the status of selected orders',
    icon: <Edit className="h-4 w-4" />,
    category: 'workflow',
    requiresConfirmation: true,
    requiresInput: true
  },
  {
    id: 'change-priority',
    title: 'Change Priority',
    description: 'Update the priority of selected orders',
    icon: <AlertTriangle className="h-4 w-4" />,
    category: 'workflow',
    requiresConfirmation: true,
    requiresInput: true
  },
  {
    id: 'email',
    title: 'Send Email',
    description: 'Send email notifications for selected orders',
    icon: <Mail className="h-4 w-4" />,
    category: 'communication',
    requiresConfirmation: true,
    requiresInput: true
  },
  {
    id: 'export',
    title: 'Export Data',
    description: 'Export selected orders to various formats',
    icon: <Download className="h-4 w-4" />,
    category: 'export',
    requiresConfirmation: false,
    requiresInput: true
  },
  {
    id: 'print',
    title: 'Print Orders',
    description: 'Print selected purchase orders',
    icon: <Printer className="h-4 w-4" />,
    category: 'export',
    requiresConfirmation: false
  },
  {
    id: 'duplicate',
    title: 'Duplicate Orders',
    description: 'Create copies of selected orders',
    icon: <Copy className="h-4 w-4" />,
    category: 'maintenance',
    requiresConfirmation: true
  },
  {
    id: 'add-notes',
    title: 'Add Notes',
    description: 'Add notes to selected orders',
    icon: <FileText className="h-4 w-4" />,
    category: 'maintenance',
    requiresConfirmation: false,
    requiresInput: true
  },
  {
    id: 'update-delivery-date',
    title: 'Update Delivery Date',
    description: 'Change delivery date for selected orders',
    icon: <Calendar className="h-4 w-4" />,
    category: 'maintenance',
    requiresConfirmation: true,
    requiresInput: true
  },
  {
    id: 'delete',
    title: 'Delete Orders',
    description: 'Permanently delete selected orders',
    icon: <Trash2 className="h-4 w-4" />,
    category: 'maintenance',
    requiresConfirmation: true,
    requiresInput: true,
    dangerLevel: 'high'
  }
]

const BulkOperations: React.FC<BulkOperationsProps> = ({
  open,
  onClose,
  selectedOrders,
  orders
}) => {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null)
  const [inputData, setInputData] = useState<Record<string, any>>({})
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))
  const totalValue = selectedOrdersData.reduce((sum, order) => sum + order.totalAmount, 0)

  const resetState = () => {
    setSelectedAction(null)
    setInputData({})
    setProcessing(false)
    setProgress(0)
    setResults(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const getActionsByCategory = (category: string) => {
    return bulkActions.filter(action => action.category === category)
  }

  const validateAction = (action: BulkActionConfig): string[] => {
    const errors: string[] = []

    // Check if action is valid for selected orders
    selectedOrdersData.forEach(order => {
      switch (action.id) {
        case 'send-to-supplier':
          if (order.status !== 'approved') {
            errors.push(`${order.poNumber}: Order must be approved before sending`)
          }
          break
        case 'approve':
          if (!['draft', 'pending'].includes(order.status)) {
            errors.push(`${order.poNumber}: Order is not in approvable state`)
          }
          break
        case 'cancel':
          if (['completed', 'cancelled'].includes(order.status)) {
            errors.push(`${order.poNumber}: Cannot cancel completed or already cancelled order`)
          }
          break
      }
    })

    // Check required inputs
    if (action.requiresInput) {
      switch (action.id) {
        case 'reject':
        case 'cancel':
          if (!inputData.reason) {
            errors.push('Reason is required')
          }
          break
        case 'change-status':
          if (!inputData.newStatus) {
            errors.push('New status is required')
          }
          break
        case 'change-priority':
          if (!inputData.newPriority) {
            errors.push('New priority is required')
          }
          break
        case 'add-notes':
          if (!inputData.notes) {
            errors.push('Notes are required')
          }
          break
        case 'update-delivery-date':
          if (!inputData.newDeliveryDate) {
            errors.push('New delivery date is required')
          }
          break
      }
    }

    return errors
  }

  const executeAction = async (action: BulkActionConfig) => {
    const errors = validateAction(action)
    if (errors.length > 0) {
      setResults({ success: 0, failed: selectedOrders.length, errors })
      return
    }

    setProcessing(true)
    setProgress(0)

    // Simulate processing
    let successCount = 0
    let failedCount = 0
    const processingErrors: string[] = []

    for (let i = 0; i < selectedOrdersData.length; i++) {
      const order = selectedOrdersData[i]

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        // Mock processing logic
        console.log(`Processing ${action.id} for order ${order.poNumber}`)

        // Simulate some failures
        if (Math.random() < 0.1) {
          throw new Error(`Failed to process ${order.poNumber}`)
        }

        successCount++
      } catch (error) {
        failedCount++
        processingErrors.push(error instanceof Error ? error.message : 'Unknown error')
      }

      setProgress(((i + 1) / selectedOrdersData.length) * 100)
    }

    setResults({
      success: successCount,
      failed: failedCount,
      errors: processingErrors
    })
    setProcessing(false)
  }

  const renderActionInputs = (action: BulkActionConfig) => {
    if (!action.requiresInput) return null

    switch (action.id) {
      case 'reject':
      case 'cancel':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection/cancellation..."
                value={inputData.reason || ''}
                onChange={(e) => setInputData(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
        )

      case 'change-status':
        return (
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select
              value={inputData.newStatus || ''}
              onValueChange={(value) => setInputData(prev => ({ ...prev, newStatus: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )

      case 'change-priority':
        return (
          <div>
            <Label htmlFor="priority">New Priority</Label>
            <Select
              value={inputData.newPriority || ''}
              onValueChange={(value) => setInputData(prev => ({ ...prev, newPriority: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )

      case 'add-notes':
        return (
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter notes to add to selected orders..."
              value={inputData.notes || ''}
              onChange={(e) => setInputData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        )

      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="emailSubject">Email Subject</Label>
              <Input
                id="emailSubject"
                placeholder="Purchase Order Update"
                value={inputData.emailSubject || ''}
                onChange={(e) => setInputData(prev => ({ ...prev, emailSubject: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="emailMessage">Message</Label>
              <Textarea
                id="emailMessage"
                placeholder="Enter email message..."
                value={inputData.emailMessage || ''}
                onChange={(e) => setInputData(prev => ({ ...prev, emailMessage: e.target.value }))}
              />
            </div>
          </div>
        )

      case 'export':
        return (
          <div>
            <Label htmlFor="exportFormat">Export Format</Label>
            <Select
              value={inputData.exportFormat || 'xlsx'}
              onValueChange={(value) => setInputData(prev => ({ ...prev, exportFormat: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )

      case 'update-delivery-date':
        return (
          <div>
            <Label htmlFor="deliveryDate">New Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={inputData.newDeliveryDate || ''}
              onChange={(e) => setInputData(prev => ({ ...prev, newDeliveryDate: e.target.value }))}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk Operations
          </DialogTitle>
          <DialogDescription>
            Perform actions on {selectedOrders.length} selected purchase orders
          </DialogDescription>
        </DialogHeader>

        {/* Selected Orders Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selected Orders Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedOrders.length}</div>
                <div className="text-sm text-muted-foreground">Orders Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Set(selectedOrdersData.map(o => o.supplierId)).size}
                </div>
                <div className="text-sm text-muted-foreground">Suppliers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedAction && !processing && !results && (
          <div className="space-y-6">
            {/* Action Categories */}
            {['workflow', 'communication', 'export', 'maintenance'].map(category => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 capitalize">{category} Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getActionsByCategory(category).map(action => (
                    <Card
                      key={action.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        action.dangerLevel === 'high' && "border-red-200 hover:bg-red-50",
                        action.dangerLevel === 'medium' && "border-yellow-200 hover:bg-yellow-50"
                      )}
                      onClick={() => setSelectedAction(action.id)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            action.dangerLevel === 'high' && "bg-red-100 text-red-600",
                            action.dangerLevel === 'medium' && "bg-yellow-100 text-yellow-600",
                            !action.dangerLevel && "bg-blue-100 text-blue-600"
                          )}>
                            {action.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{action.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {action.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {action.requiresConfirmation && (
                                <Badge variant="secondary" className="text-xs">
                                  Requires Confirmation
                                </Badge>
                              )}
                              {action.dangerLevel && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    action.dangerLevel === 'high' && "border-red-200 text-red-600",
                                    action.dangerLevel === 'medium' && "border-yellow-200 text-yellow-600"
                                  )}
                                >
                                  {action.dangerLevel.charAt(0).toUpperCase() + action.dangerLevel.slice(1)} Risk
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Configuration */}
        {selectedAction && !processing && !results && (
          <div className="space-y-6">
            {(() => {
              const action = bulkActions.find(a => a.id === selectedAction)!
              return (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {action.icon}
                        {action.title}
                      </CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderActionInputs(action)}
                    </CardContent>
                  </Card>

                  {action.dangerLevel && (
                    <Alert className={cn(
                      action.dangerLevel === 'high' && "border-red-200 bg-red-50",
                      action.dangerLevel === 'medium' && "border-yellow-200 bg-yellow-50"
                    )}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {action.dangerLevel === 'high' &&
                          "This is a high-risk operation that cannot be undone. Please proceed with caution."
                        }
                        {action.dangerLevel === 'medium' &&
                          "This operation may affect order workflows. Please review before proceeding."
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Affected Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Affected Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedOrdersData.map(order => (
                          <div key={order.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{order.poNumber}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {order.supplierName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                              <span className="text-sm font-medium">
                                {formatCurrency(order.totalAmount, order.currency)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </div>
        )}

        {/* Processing */}
        {processing && (
          <div className="space-y-6 text-center">
            <div>
              <Package className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold">Processing Orders</h3>
              <p className="text-muted-foreground">
                Please wait while we process your bulk operation...
              </p>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold">Operation Complete</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-600">{results.success}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
            </div>

            {results.errors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-sm text-red-800">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          {!selectedAction && !processing && !results && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}

          {selectedAction && !processing && !results && (
            <>
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button
                onClick={() => {
                  const action = bulkActions.find(a => a.id === selectedAction)!
                  executeAction(action)
                }}
              >
                Execute Action
              </Button>
            </>
          )}

          {results && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkOperations