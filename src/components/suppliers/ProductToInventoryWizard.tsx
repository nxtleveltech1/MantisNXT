'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Target,
  Warehouse,
  ClipboardCheck,
  Zap,
  Building2,
  Clock,
  ShoppingCart,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  category: string
  sku: string
  supplierSku: string
  basePrice: number
  currency: string
  active: boolean
}

interface InventoryConfiguration {
  productId: string
  initialStock: number
  reorderPoint: number
  maxStock: number
  unitCost: number
  location: string
  notes: string
  autoReorderEnabled: boolean
}

interface Warehouse {
  id: string
  name: string
  code: string
  locations: WarehouseLocation[]
}

interface WarehouseLocation {
  id: string
  code: string
  name: string
  zone: string
  aisle: string
  shelf: string
  available: boolean
}

interface SupplierConfiguration {
  leadTimeDays: number
  minimumOrderQuantity: number
  preferredOrderMultiple: number
  autoReorderEnabled: boolean
  qualityRating: number
}

interface PromotionResult {
  productId: string
  inventoryItemId: string
  status: 'success' | 'error' | 'warning'
  message: string
}

interface ProductToInventoryWizardProps {
  isOpen: boolean
  onClose: () => void
  supplierId: string
  supplierName: string
  productIds: string[]
  onComplete?: (results: PromotionResult[]) => void
}

const STEPS = [
  { id: 'products', title: 'Product Selection', description: 'Review products to promote' },
  { id: 'inventory', title: 'Inventory Setup', description: 'Configure stock parameters' },
  { id: 'locations', title: 'Location Assignment', description: 'Assign warehouse locations' },
  { id: 'supplier', title: 'Supplier Settings', description: 'Configure supplier-specific settings' },
  { id: 'review', title: 'Review & Confirm', description: 'Review and execute promotion' }
]

export default function ProductToInventoryWizard({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  productIds,
  onComplete
}: ProductToInventoryWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [inventoryConfigs, setInventoryConfigs] = useState<Map<string, InventoryConfiguration>>(new Map())
  const [supplierConfig, setSupplierConfig] = useState<SupplierConfiguration>({
    leadTimeDays: 14,
    minimumOrderQuantity: 1,
    preferredOrderMultiple: 1,
    autoReorderEnabled: false,
    qualityRating: 0
  })
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [promotionResults, setPromotionResults] = useState<PromotionResult[]>([])

  useEffect(() => {
    if (isOpen && productIds.length > 0) {
      loadInitialData()
    }
  }, [isOpen, productIds])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load products and warehouses in parallel
      const [productsResponse, warehousesResponse] = await Promise.all([
        fetch(`/api/suppliers/${supplierId}/products?ids=${productIds.join(',')}`),
        fetch('/api/warehouses')
      ])

      if (!productsResponse.ok) {
        throw new Error('Failed to load products')
      }

      const productsData = await productsResponse.json()
      if (!productsData.success) {
        throw new Error(productsData.error || 'Failed to load products')
      }

      const warehousesData = warehousesResponse.ok ? await warehousesResponse.json() : { success: true, data: [] }

      setProducts(productsData.data)
      setWarehouses(warehousesData.data || [])

      // Initialize selections
      setSelectedProducts(new Set(productsData.data.map((p: Product) => p.id)))

      // Initialize inventory configurations with defaults
      const configs = new Map()
      productsData.data.forEach((product: Product) => {
        configs.set(product.id, {
          productId: product.id,
          initialStock: 0,
          reorderPoint: 10,
          maxStock: 100,
          unitCost: product.basePrice,
          location: '',
          notes: '',
          autoReorderEnabled: false
        })
      })
      setInventoryConfigs(configs)

      // Set default warehouse if available
      if (warehousesData.data && warehousesData.data.length > 0) {
        setSelectedWarehouse(warehousesData.data[0].id)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const updateInventoryConfig = (productId: string, updates: Partial<InventoryConfiguration>) => {
    setInventoryConfigs(prev => {
      const newConfigs = new Map(prev)
      const existing = newConfigs.get(productId) || { productId } as InventoryConfiguration
      newConfigs.set(productId, { ...existing, ...updates })
      return newConfigs
    })
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const executePromotion = async () => {
    try {
      setProcessing(true)
      setError(null)

      const selectedProductsList = Array.from(selectedProducts)
      const promotionPayload = {
        supplierId,
        warehouseId: selectedWarehouse,
        supplierConfiguration: supplierConfig,
        productPromotions: selectedProductsList.map(productId => {
          const config = inventoryConfigs.get(productId)!
          const product = products.find(p => p.id === productId)!

          return {
            productId,
            sku: product.sku,
            name: product.name,
            description: product.description,
            category: product.category,
            initialStock: config.initialStock,
            reorderPoint: config.reorderPoint,
            maxStock: config.maxStock,
            unitCost: config.unitCost,
            location: config.location,
            notes: config.notes,
            autoReorderEnabled: config.autoReorderEnabled
          }
        })
      }

      const response = await fetch(`/api/suppliers/${supplierId}/inventory/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promotionPayload)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Promotion failed')
      }

      setPromotionResults(result.data.results)

      if (onComplete) {
        onComplete(result.data.results)
      }

      // Auto-advance to final step to show results
      setCurrentStep(STEPS.length - 1)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promotion failed')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number, currency = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getSelectedProducts = () => {
    return products.filter(p => selectedProducts.has(p.id))
  }

  const getTotalValue = () => {
    return Array.from(selectedProducts).reduce((total, productId) => {
      const config = inventoryConfigs.get(productId)
      return total + (config ? config.initialStock * config.unitCost : 0)
    }, 0)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Product selection
        return selectedProducts.size > 0
      case 1: // Inventory setup
        return Array.from(selectedProducts).every(productId => {
          const config = inventoryConfigs.get(productId)
          return config && config.reorderPoint >= 0 && config.unitCost > 0
        })
      case 2: // Location assignment
        return selectedWarehouse !== '' && Array.from(selectedProducts).every(productId => {
          const config = inventoryConfigs.get(productId)
          return config && config.location !== ''
        })
      case 3: // Supplier settings
        return supplierConfig.leadTimeDays > 0 && supplierConfig.minimumOrderQuantity > 0
      default:
        return true
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">Promote Products to Inventory</h2>
              <p className="text-sm font-normal text-muted-foreground">
                {supplierName} • {selectedProducts.size} products selected
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Configure inventory parameters and promote selected products to your main inventory system.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading products and warehouses...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    index <= currentStep
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-muted'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold">{STEPS[currentStep].title}</h3>
              <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {currentStep === 0 && ( // Product Selection
                (<Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Select Products to Promote
                    </CardTitle>
                    <CardDescription>
                      Choose which products to add to your inventory system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Base Price</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.has(product.id)}
                                onCheckedChange={(checked) => {
                                  const newSelection = new Set(selectedProducts)
                                  if (checked) {
                                    newSelection.add(product.id)
                                  } else {
                                    newSelection.delete(product.id)
                                  }
                                  setSelectedProducts(newSelection)
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                                {product.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {product.description.length > 60
                                      ? `${product.description.substring(0, 60)}...`
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
                            <TableCell className="text-right">
                              {formatCurrency(product.basePrice, product.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.active ? 'default' : 'secondary'}>
                                {product.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>)
              )}

              {currentStep === 1 && ( // Inventory Setup
                (<div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Inventory Parameters
                      </CardTitle>
                      <CardDescription>
                        Configure stock levels and costs for each product
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {getSelectedProducts().map((product) => {
                          const config = inventoryConfigs.get(product.id) || {} as InventoryConfiguration
                          return (
                            <Card key={product.id} className="border-muted">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">{product.name}</CardTitle>
                                <CardDescription>SKU: {product.sku}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <Label htmlFor={`initialStock-${product.id}`}>Initial Stock</Label>
                                    <Input
                                      id={`initialStock-${product.id}`}
                                      type="number"
                                      min="0"
                                      value={config.initialStock || 0}
                                      onChange={(e) => updateInventoryConfig(product.id, {
                                        initialStock: parseInt(e.target.value) || 0
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`reorderPoint-${product.id}`}>Reorder Point *</Label>
                                    <Input
                                      id={`reorderPoint-${product.id}`}
                                      type="number"
                                      min="0"
                                      value={config.reorderPoint || 10}
                                      onChange={(e) => updateInventoryConfig(product.id, {
                                        reorderPoint: parseInt(e.target.value) || 0
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`maxStock-${product.id}`}>Max Stock</Label>
                                    <Input
                                      id={`maxStock-${product.id}`}
                                      type="number"
                                      min="0"
                                      value={config.maxStock || 100}
                                      onChange={(e) => updateInventoryConfig(product.id, {
                                        maxStock: parseInt(e.target.value) || 0
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`unitCost-${product.id}`}>Unit Cost *</Label>
                                    <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        id={`unitCost-${product.id}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="pl-9"
                                        value={config.unitCost || product.basePrice}
                                        onChange={(e) => updateInventoryConfig(product.id, {
                                          unitCost: parseFloat(e.target.value) || 0
                                        })}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <Label htmlFor={`notes-${product.id}`}>Notes</Label>
                                  <Textarea
                                    id={`notes-${product.id}`}
                                    placeholder="Add any notes about this product..."
                                    rows={2}
                                    value={config.notes || ''}
                                    onChange={(e) => updateInventoryConfig(product.id, {
                                      notes: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="mt-4 flex items-center space-x-2">
                                  <Checkbox
                                    id={`autoReorder-${product.id}`}
                                    checked={config.autoReorderEnabled || false}
                                    onCheckedChange={(checked) => updateInventoryConfig(product.id, {
                                      autoReorderEnabled: checked as boolean
                                    })}
                                  />
                                  <Label htmlFor={`autoReorder-${product.id}`}>
                                    Enable auto-reorder when stock reaches reorder point
                                  </Label>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Products</p>
                          <p className="text-lg font-semibold">{selectedProducts.size}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Initial Stock Value</p>
                          <p className="text-lg font-semibold">{formatCurrency(getTotalValue())}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Average Unit Cost</p>
                          <p className="text-lg font-semibold">
                            {selectedProducts.size > 0 ? formatCurrency(getTotalValue() / Array.from(selectedProducts).reduce((sum, id) => {
                              const config = inventoryConfigs.get(id)
                              return sum + (config?.initialStock || 0)
                            }, 0) || 0) : formatCurrency(0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>)
              )}

              {currentStep === 2 && ( // Location Assignment
                (<div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        Warehouse Selection
                      </CardTitle>
                      <CardDescription>
                        Choose the warehouse for these products
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="warehouse">Warehouse</Label>
                          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name} ({warehouse.code})
                                </SelectItem>
                              ))}
                              {warehouses.length === 0 && (
                                <SelectItem value="default">Main Warehouse</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location Assignment
                      </CardTitle>
                      <CardDescription>
                        Assign specific locations for each product
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {getSelectedProducts().map((product) => {
                          const config = inventoryConfigs.get(product.id) || {} as InventoryConfiguration
                          return (
                            <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                              </div>
                              <div className="w-48">
                                <Input
                                  placeholder="e.g., A-1-2-B"
                                  value={config.location || ''}
                                  onChange={(e) => updateInventoryConfig(product.id, {
                                    location: e.target.value
                                  })}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Location Format</h4>
                        <p className="text-sm text-muted-foreground">
                          Use format: Zone-Aisle-Shelf-Bin (e.g., A-1-2-B for Zone A, Aisle 1, Shelf 2, Bin B)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>)
              )}

              {currentStep === 3 && ( // Supplier Settings
                (<Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Supplier Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure supplier-specific settings for these products
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="leadTimeDays">Lead Time (Days) *</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="leadTimeDays"
                              type="number"
                              min="1"
                              className="pl-9"
                              value={supplierConfig.leadTimeDays}
                              onChange={(e) => setSupplierConfig(prev => ({
                                ...prev,
                                leadTimeDays: parseInt(e.target.value) || 1
                              }))}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="minimumOrderQuantity">Minimum Order Quantity *</Label>
                          <Input
                            id="minimumOrderQuantity"
                            type="number"
                            min="1"
                            value={supplierConfig.minimumOrderQuantity}
                            onChange={(e) => setSupplierConfig(prev => ({
                              ...prev,
                              minimumOrderQuantity: parseInt(e.target.value) || 1
                            }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="preferredOrderMultiple">Preferred Order Multiple</Label>
                          <Input
                            id="preferredOrderMultiple"
                            type="number"
                            min="1"
                            value={supplierConfig.preferredOrderMultiple}
                            onChange={(e) => setSupplierConfig(prev => ({
                              ...prev,
                              preferredOrderMultiple: parseInt(e.target.value) || 1
                            }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Orders will be rounded to multiples of this number
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="qualityRating">Quality Rating (0-5)</Label>
                          <Input
                            id="qualityRating"
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={supplierConfig.qualityRating}
                            onChange={(e) => setSupplierConfig(prev => ({
                              ...prev,
                              qualityRating: parseFloat(e.target.value) || 0
                            }))}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="globalAutoReorder"
                            checked={supplierConfig.autoReorderEnabled}
                            onCheckedChange={(checked) => setSupplierConfig(prev => ({
                              ...prev,
                              autoReorderEnabled: checked as boolean
                            }))}
                          />
                          <Label htmlFor="globalAutoReorder">
                            Enable auto-reorder for all products from this supplier
                          </Label>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">Settings Summary</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Orders will be placed {supplierConfig.leadTimeDays} days before stock runs out</li>
                            <li>• Minimum order: {supplierConfig.minimumOrderQuantity} units</li>
                            {supplierConfig.preferredOrderMultiple > 1 && (
                              <li>• Orders rounded to multiples of {supplierConfig.preferredOrderMultiple}</li>
                            )}
                            <li>• Auto-reorder: {supplierConfig.autoReorderEnabled ? 'Enabled' : 'Disabled'}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>)
              )}

              {currentStep === 4 && ( // Review & Confirm
                (<div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5" />
                        Review Configuration
                      </CardTitle>
                      <CardDescription>
                        Review all settings before promoting products to inventory
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{selectedProducts.size}</p>
                            <p className="text-sm text-muted-foreground">Products</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalValue())}</p>
                            <p className="text-sm text-muted-foreground">Initial Value</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">{supplierConfig.leadTimeDays}</p>
                            <p className="text-sm text-muted-foreground">Lead Time (Days)</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">
                              {warehouses.find(w => w.id === selectedWarehouse)?.name || 'Main Warehouse'}
                            </p>
                            <p className="text-sm text-muted-foreground">Warehouse</p>
                          </div>
                        </div>

                        {/* Products to Promote */}
                        <div>
                          <h4 className="font-medium mb-3">Products to Promote</h4>
                          <div className="space-y-2">
                            {getSelectedProducts().map((product) => {
                              const config = inventoryConfigs.get(product.id)!
                              return (
                                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {product.sku} • {config.location}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {config.initialStock} units @ {formatCurrency(config.unitCost)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Reorder at: {config.reorderPoint}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Execution Results */}
                        {promotionResults.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Promotion Results</h4>
                            <div className="space-y-2">
                              {promotionResults.map((result, index) => (
                                <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
                                  result.status === 'success' ? 'border-green-200 bg-green-50' :
                                  result.status === 'error' ? 'border-red-200 bg-red-50' :
                                  'border-yellow-200 bg-yellow-50'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    {result.status === 'success' ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : result.status === 'error' ? (
                                      <AlertTriangle className="h-5 w-5 text-red-600" />
                                    ) : (
                                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    )}
                                    <div>
                                      <p className="font-medium">
                                        {products.find(p => p.id === result.productId)?.name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">{result.message}</p>
                                    </div>
                                  </div>
                                  <Badge variant={
                                    result.status === 'success' ? 'default' :
                                    result.status === 'error' ? 'destructive' : 'secondary'
                                  }>
                                    {result.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>)
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentStep < STEPS.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : promotionResults.length === 0 ? (
                  <Button
                    onClick={executePromotion}
                    disabled={!canProceed() || processing}
                  >
                    {processing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {processing ? 'Promoting...' : 'Promote to Inventory'}
                  </Button>
                ) : (
                  <Button onClick={onClose}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}