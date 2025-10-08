"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowRight,
  ArrowLeft,
  Package,
  Building2,
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  Truck,
  Star,
  Target,
  BarChart3,
  Settings,
  RefreshCw,
  X,
  Check,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Info,
  Zap,
  FileText,
  Archive,
  Sparkles,
  Shield,
  Globe,
  TrendingUp,
  Award,
  Activity,
  Layers,
  MousePointer,
  ChevronRight,
  HelpCircle
} from 'lucide-react'
import { useInventoryStore } from '@/lib/stores/inventory-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import type { Product, Supplier, InventoryItem } from '@/lib/types/inventory'
import { format } from 'date-fns'

// Enhanced Workflow Components
const WorkflowProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="relative">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="absolute -top-1 transition-all duration-500" style={{ left: `${progress}%` }}>
        <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2" />
      </div>
    </div>
  )
}

const StepIndicator = ({ step, index, isActive, isCompleted }: {
  step: WorkflowStep
  index: number
  isActive: boolean
  isCompleted: boolean
}) => {
  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'select_supplier': return Building2
      case 'upload_pricelist': return Upload
      case 'review_products': return Package
      case 'configure_inventory': return Settings
      case 'approve_changes': return Shield
      case 'execute': return Zap
      default: return Circle
    }
  }

  const Icon = getStepIcon(step.id)

  return (
    <div className="flex flex-col items-center relative">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
        isCompleted
          ? 'bg-green-600 border-green-600 text-white'
          : isActive
          ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
          : 'bg-white border-gray-300 text-gray-400'
      }`}>
        {isCompleted ? (
          <Check className="h-6 w-6" />
        ) : (
          <Icon className="h-6 w-6" />
        )}
      </div>
      <div className="mt-3 text-center max-w-24">
        <p className={`text-xs font-medium ${
          isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
        }`}>
          {step.title}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {step.estimatedTime}m
        </p>
      </div>
    </div>
  )
}

const SupplierCard = ({ supplier, isSelected, onClick }: {
  supplier: Supplier
  isSelected: boolean
  onClick: () => void
}) => (
  <Card
    className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
      isSelected
        ? 'ring-2 ring-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50'
        : 'hover:shadow-md'
    }`}
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {supplier.name.charAt(0)}
            </div>
            {supplier.preferred_supplier && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Star className="h-3 w-3 text-white fill-current" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">{supplier.name}</h4>
            <div className="flex items-center gap-2">
              <Badge
                variant={supplier.status === 'active' ? 'default' : 'outline'}
                className={supplier.status === 'active' ? 'bg-green-100 text-green-800' : ''}
              >
                {supplier.status?.toUpperCase()}
              </Badge>
              {supplier.performance_tier && (
                <Badge variant="outline" className="border-purple-300 text-purple-700">
                  <Award className="h-3 w-3 mr-1" />
                  {supplier.performance_tier?.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span>Products available</span>
              </div>
              {supplier.quality_rating && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{supplier.quality_rating}/10 rating</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {isSelected && (
          <div className="text-blue-600">
            <CheckCircle className="h-6 w-6" />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)

interface WorkflowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  required: boolean
  estimatedTime: number // minutes
}

interface ProductWorkflowData {
  supplier: Supplier
  products: Product[]
  selectedProducts: Set<string>
  currentStep: number
  steps: WorkflowStep[]
  metadata: {
    uploadedFile?: File
    processingResults?: any
    approvalNotes?: string
    inventorySettings?: {
      defaultLocation: string
      defaultReorderPoint: number
      defaultMaxStock: number
      autoCreateInventory: boolean
    }
  }
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'select_supplier',
    title: 'Select Supplier',
    description: 'Choose the supplier for this product workflow',
    status: 'pending',
    required: true,
    estimatedTime: 2
  },
  {
    id: 'upload_pricelist',
    title: 'Upload Pricelist',
    description: 'Upload and validate supplier pricelist data',
    status: 'pending',
    required: false,
    estimatedTime: 10
  },
  {
    id: 'review_products',
    title: 'Review Products',
    description: 'Review and validate product information',
    status: 'pending',
    required: true,
    estimatedTime: 15
  },
  {
    id: 'configure_inventory',
    title: 'Configure Inventory',
    description: 'Set up inventory parameters and locations',
    status: 'pending',
    required: true,
    estimatedTime: 10
  },
  {
    id: 'approve_changes',
    title: 'Approve Changes',
    description: 'Review and approve all changes before execution',
    status: 'pending',
    required: true,
    estimatedTime: 5
  },
  {
    id: 'execute',
    title: 'Execute',
    description: 'Apply all changes to the inventory system',
    status: 'pending',
    required: true,
    estimatedTime: 3
  }
]

export default function SupplierProductWorkflow() {
  const {
    products,
    suppliers,
    items,
    loading,
    fetchProducts,
    fetchSuppliers,
    fetchItems,
  } = useInventoryStore()

  const { addNotification } = useNotificationStore()

  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false)
  const [workflowData, setWorkflowData] = useState<ProductWorkflowData>({
    supplier: {} as Supplier,
    products: [],
    selectedProducts: new Set(),
    currentStep: 0,
    steps: workflowSteps.map(step => ({ ...step })),
    metadata: {}
  })

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all_categories')

  const availableSuppliers = suppliers.filter(s => s.status === 'active')

  const filteredProducts = useMemo(() => {
    if (!workflowData.supplier.id) return []

    return workflowData.products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = !categoryFilter || categoryFilter === 'all_categories' || product.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [workflowData.products, searchTerm, categoryFilter])

  const categories = [...new Set(workflowData.products.map(p => p.category))].sort()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < workflowData.currentStep) return 'completed'
    if (stepIndex === workflowData.currentStep) return 'in_progress'
    return 'pending'
  }

  const canProceedToNext = () => {
    const currentStep = workflowData.steps[workflowData.currentStep]
    if (!currentStep) return false

    switch (currentStep.id) {
      case 'select_supplier':
        return !!workflowData.supplier.id
      case 'upload_pricelist':
        return true // Optional step
      case 'review_products':
        return workflowData.selectedProducts.size > 0
      case 'configure_inventory':
        return !!workflowData.metadata.inventorySettings
      case 'approve_changes':
        return true
      default:
        return true
    }
  }

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    if (!supplier) return

    // Get products for this supplier
    const supplierProducts = products.filter(p => p.supplier_id === supplierId)

    setWorkflowData(prev => ({
      ...prev,
      supplier,
      products: supplierProducts,
      selectedProducts: new Set()
    }))
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setIsProcessing(true)
    setUploadedFile(file)

    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock processed products
      const processedProducts: Product[] = [
        // This would come from actual file processing
        ...workflowData.products,
        {
          id: `new-${Date.now()}`,
          supplier_id: workflowData.supplier.id,
          name: 'New Product from Upload',
          description: 'Product imported from pricelist',
          category: 'components',
          sku: 'NEW-001',
          unit_of_measure: 'pieces',
          unit_cost_zar: 25.00,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Product
      ]

      setWorkflowData(prev => ({
        ...prev,
        products: processedProducts,
        metadata: {
          ...prev.metadata,
          uploadedFile: file,
          processingResults: {
            totalRows: 100,
            successRows: 95,
            errorRows: 5,
            newProducts: 1,
            updatedProducts: 94
          }
        }
      }))

      addNotification({
        type: 'success',
        title: 'File processed successfully',
        message: '95 products processed, 5 errors found'
      })

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'File processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProductSelection = (productId: string, selected: boolean) => {
    const newSelection = new Set(workflowData.selectedProducts)
    if (selected) {
      newSelection.add(productId)
    } else {
      newSelection.delete(productId)
    }

    setWorkflowData(prev => ({
      ...prev,
      selectedProducts: newSelection
    }))
  }

  const handleInventoryConfiguration = (settings: any) => {
    setWorkflowData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        inventorySettings: settings
      }
    }))
  }

  const handleNextStep = () => {
    if (workflowData.currentStep < workflowData.steps.length - 1) {
      const newSteps = [...workflowData.steps]
      newSteps[workflowData.currentStep].status = 'completed'
      if (workflowData.currentStep + 1 < newSteps.length) {
        newSteps[workflowData.currentStep + 1].status = 'in_progress'
      }

      setWorkflowData(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        steps: newSteps
      }))
    }
  }

  const handlePreviousStep = () => {
    if (workflowData.currentStep > 0) {
      const newSteps = [...workflowData.steps]
      newSteps[workflowData.currentStep].status = 'pending'
      newSteps[workflowData.currentStep - 1].status = 'in_progress'

      setWorkflowData(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        steps: newSteps
      }))
    }
  }

  const handleExecuteWorkflow = async () => {
    setIsProcessing(true)

    try {
      // Execute the workflow
      const selectedProductIds = Array.from(workflowData.selectedProducts)

      // Here you would implement the actual workflow execution
      // 1. Create/update products
      // 2. Create inventory items
      // 3. Set up stock levels
      // 4. Configure reorder points

      await new Promise(resolve => setTimeout(resolve, 3000)) // Simulate processing

      addNotification({
        type: 'success',
        title: 'Workflow completed successfully',
        message: `${selectedProductIds.length} products processed and added to inventory`
      })

      // Reset workflow
      setWorkflowData({
        supplier: {} as Supplier,
        products: [],
        selectedProducts: new Set(),
        currentStep: 0,
        steps: workflowSteps.map(step => ({ ...step })),
        metadata: {}
      })

      setIsWorkflowOpen(false)

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderStepContent = () => {
    const currentStep = workflowData.steps[workflowData.currentStep]
    if (!currentStep) return null

    switch (currentStep.id) {
      case 'select_supplier':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Select Supplier</h3>
              <p className="text-muted-foreground mb-6">
                Choose the supplier for this product management workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  isSelected={workflowData.supplier.id === supplier.id}
                  onClick={() => handleSupplierSelect(supplier.id)}
                />
              ))}
            </div>

            {/* Selection Summary */}
            {workflowData.supplier.id && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        Selected: {workflowData.supplier.name}
                      </p>
                      <p className="text-sm text-green-600">
                        {products.filter(p => p.supplier_id === workflowData.supplier.id).length} products available for processing
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 'upload_pricelist':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Upload Pricelist (Optional)</h3>
              <p className="text-muted-foreground mb-6">
                Upload a CSV or Excel file with updated product information and pricing.
              </p>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
              <div className="text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">Upload Pricelist File</h4>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer" disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </Label>
              </div>
            </div>

            {uploadedFile && workflowData.metadata.processingResults && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Processing Results</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Rows:</span>
                      <span className="ml-2 font-medium">
                        {workflowData.metadata.processingResults.totalRows}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Successful:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {workflowData.metadata.processingResults.successRows}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Errors:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {workflowData.metadata.processingResults.errorRows}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">New Products:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {workflowData.metadata.processingResults.newProducts}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Button variant="ghost" onClick={handleNextStep}>
                Skip this step
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 'review_products':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Review Products</h3>
                <p className="text-muted-foreground">
                  Review and select products to add to inventory for {workflowData.supplier.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                {categories.length > 0 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_categories">All categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={workflowData.selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setWorkflowData(prev => ({
                                ...prev,
                                selectedProducts: new Set(filteredProducts.map(p => p.id))
                              }))
                            } else {
                              setWorkflowData(prev => ({
                                ...prev,
                                selectedProducts: new Set()
                              }))
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>In Inventory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const inventoryItem = items.find(item => item.product_id === product.id)
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={workflowData.selectedProducts.has(product.id)}
                              onCheckedChange={(checked) =>
                                handleProductSelection(product.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.sku && (
                                <code className="text-sm text-muted-foreground">{product.sku}</code>
                              )}
                              {product.description && (
                                <p className="text-sm text-muted-foreground">
                                  {product.description.length > 50
                                    ? `${product.description.substring(0, 50)}...`
                                    : product.description
                                  }
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(product.unit_cost_zar)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={product.status === 'active' ? 'default' : 'secondary'}
                            >
                              {product.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {inventoryItem ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                In Stock ({inventoryItem.current_stock})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-500 text-gray-700">
                                Not in Inventory
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Selected: {workflowData.selectedProducts.size} products
                </span>
                <span className="text-muted-foreground">
                  {filteredProducts.filter(p => !items.find(item => item.product_id === p.id)).length} new to inventory
                </span>
              </div>
            </div>
          </div>
        )

      case 'configure_inventory':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Configure Inventory Settings</h3>
              <p className="text-muted-foreground mb-6">
                Set up inventory parameters for the selected products.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Default Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">Default Location</Label>
                    <Select
                      value={workflowData.metadata.inventorySettings?.defaultLocation || ''}
                      onValueChange={(value) =>
                        handleInventoryConfiguration({
                          ...workflowData.metadata.inventorySettings,
                          defaultLocation: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WAREHOUSE-A">Warehouse A</SelectItem>
                        <SelectItem value="WAREHOUSE-B">Warehouse B</SelectItem>
                        <SelectItem value="STORE-FRONT">Store Front</SelectItem>
                        <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reorderPoint">Default Reorder Point</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      min="0"
                      value={workflowData.metadata.inventorySettings?.defaultReorderPoint || ''}
                      onChange={(e) =>
                        handleInventoryConfiguration({
                          ...workflowData.metadata.inventorySettings,
                          defaultReorderPoint: parseInt(e.target.value) || 0
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxStock">Default Max Stock Level</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      min="0"
                      value={workflowData.metadata.inventorySettings?.defaultMaxStock || ''}
                      onChange={(e) =>
                        handleInventoryConfiguration({
                          ...workflowData.metadata.inventorySettings,
                          defaultMaxStock: parseInt(e.target.value) || 0
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoCreate"
                      checked={workflowData.metadata.inventorySettings?.autoCreateInventory || false}
                      onCheckedChange={(checked) =>
                        handleInventoryConfiguration({
                          ...workflowData.metadata.inventorySettings,
                          autoCreateInventory: checked as boolean
                        })
                      }
                    />
                    <Label htmlFor="autoCreate">Auto-create inventory items</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected products:</span>
                      <span className="font-medium">{workflowData.selectedProducts.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New to inventory:</span>
                      <span className="font-medium">
                        {Array.from(workflowData.selectedProducts).filter(id =>
                          !items.find(item => item.product_id === id)
                        ).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Default location:</span>
                      <span className="font-medium">
                        {workflowData.metadata.inventorySettings?.defaultLocation || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reorder point:</span>
                      <span className="font-medium">
                        {workflowData.metadata.inventorySettings?.defaultReorderPoint || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max stock:</span>
                      <span className="font-medium">
                        {workflowData.metadata.inventorySettings?.defaultMaxStock || 'Not set'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'approve_changes':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Review and Approve Changes</h3>
              <p className="text-muted-foreground mb-6">
                Review all changes before executing the workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workflow Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="font-medium">{workflowData.supplier.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products to process:</span>
                      <span className="font-medium">{workflowData.selectedProducts.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New inventory items:</span>
                      <span className="font-medium">
                        {Array.from(workflowData.selectedProducts).filter(id =>
                          !items.find(item => item.product_id === id)
                        ).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Default location:</span>
                      <span className="font-medium">
                        {workflowData.metadata.inventorySettings?.defaultLocation}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actions to Execute</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Create inventory items for new products</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Set up reorder points and stock levels</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Configure storage locations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Update product information</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Label htmlFor="approvalNotes">Approval Notes (Optional)</Label>
              <Textarea
                id="approvalNotes"
                placeholder="Add any notes about this workflow execution..."
                value={workflowData.metadata.approvalNotes || ''}
                onChange={(e) =>
                  setWorkflowData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      approvalNotes: e.target.value
                    }
                  }))
                }
              />
            </div>
          </div>
        )

      case 'execute':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-medium mb-2">Ready to Execute</h3>
              <p className="text-muted-foreground mb-6">
                All steps are complete. Click the button below to execute the workflow.
              </p>

              <Button
                size="lg"
                onClick={handleExecuteWorkflow}
                disabled={isProcessing}
                className="min-w-48"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Execute Workflow
                  </>
                )}
              </Button>
            </div>

            {isProcessing && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <Progress value={50} className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Processing {workflowData.selectedProducts.size} products...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white via-blue-50 to-purple-50 -mx-6 -mt-6 px-6 pt-8 pb-10 mb-8 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl">
                <Layers className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-700 to-purple-700 bg-clip-text text-transparent">
                  Supplier Product Workflow
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Comprehensive 6-step workflow for managing supplier products and inventory integration
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Sparkles className="h-4 w-4" />
                <span>Guided process</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Shield className="h-4 w-4" />
                <span>Data validation</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Activity className="h-4 w-4" />
                <span>Real-time feedback</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <Globe className="h-4 w-4" />
                <span>Bulk operations</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="hover:bg-blue-50 border-2 border-blue-200"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Tutorial
            </Button>
            <Button
              onClick={() => setIsWorkflowOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl transition-all hover:scale-105"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Start New Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for workflow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              In product catalog
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Inventory</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">
              Items stocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length - items.length}</div>
            <p className="text-xs text-muted-foreground">
              Not in inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workflows */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-4">
              Start your first supplier product workflow to manage inventory efficiently.
            </p>
            <Button onClick={() => setIsWorkflowOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start First Workflow
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Dialog */}
      <Sheet open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen}>
        <SheetContent className="sm:max-w-6xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Supplier Product Workflow</SheetTitle>
            <SheetDescription>
              Complete workflow for managing supplier products and inventory integration
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Enhanced Progress Stepper */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Step {workflowData.currentStep + 1} of {workflowData.steps.length}
                      </span>
                      <span className="text-gray-500">
                        {Math.round(((workflowData.currentStep + 1) / workflowData.steps.length) * 100)}% complete
                      </span>
                    </div>
                    <WorkflowProgressBar
                      currentStep={workflowData.currentStep}
                      totalSteps={workflowData.steps.length}
                    />
                  </div>

                  {/* Step Indicators */}
                  <div className="flex items-center justify-between relative">
                    {workflowData.steps.map((step, index) => (
                      <React.Fragment key={step.id}>
                        <StepIndicator
                          step={step}
                          index={index}
                          isActive={workflowData.currentStep === index}
                          isCompleted={index < workflowData.currentStep}
                        />
                        {index < workflowData.steps.length - 1 && (
                          <div className="flex-1 px-4">
                            <div className={`h-0.5 transition-all duration-500 ${
                              index < workflowData.currentStep
                                ? 'bg-gradient-to-r from-green-500 to-blue-500'
                                : 'bg-gray-200'
                            }`} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Current Step Info */}
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {workflowData.steps[workflowData.currentStep]?.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {workflowData.steps[workflowData.currentStep]?.description}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>~{workflowData.steps[workflowData.currentStep]?.estimatedTime} minutes</span>
                      </div>
                      {workflowData.steps[workflowData.currentStep]?.required && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          <span>Required step</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step Content */}
            <div className="min-h-96">
              {renderStepContent()}
            </div>

            {/* Enhanced Navigation */}
            <div className="bg-white border-t border-gray-200 p-6 -mx-6 -mb-6 mt-6 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Est. {workflowData.steps[workflowData.currentStep]?.estimatedTime || 0} minutes remaining
                    </span>
                  </div>

                  {/* Step Counter */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: workflowData.steps.length }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i <= workflowData.currentStep
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-500 ml-2">
                      {workflowData.currentStep + 1}/{workflowData.steps.length}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={workflowData.currentStep === 0}
                    className="transition-all hover:scale-105"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  {workflowData.currentStep === workflowData.steps.length - 1 ? (
                    <Button
                      onClick={handleExecuteWorkflow}
                      disabled={!canProceedToNext() || isProcessing}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg transition-all hover:scale-105"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Executing Workflow...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Execute Workflow
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextStep}
                      disabled={!canProceedToNext()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all hover:scale-105"
                      size="lg"
                    >
                      Continue to Next Step
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Help Text */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Step {workflowData.currentStep + 1}: {workflowData.steps[workflowData.currentStep]?.title}</p>
                    <p className="text-blue-600">{workflowData.steps[workflowData.currentStep]?.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Label({ children, htmlFor, className }: { children: React.ReactNode, htmlFor?: string, className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}>
      {children}
    </label>
  )
}