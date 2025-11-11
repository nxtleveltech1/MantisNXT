'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  MapPin,
  DollarSign,
  Star,
  Calendar,
  Edit,
  Save,
  X,
  RefreshCw,
  BarChart3,
  History,
  Users,
  Target
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface DetailedInventoryItem {
  id: string
  sku: string
  name: string
  description: string
  category: string
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderPoint: number
  maxStock: number
  minStock: number
  unitCost: number
  totalValue: number
  currency: string
  location: string
  weight: number
  dimensions: unknown
  status: string
  lastStockUpdate: string
  createdAt: string
  updatedAt: string
  tags: string[]
  notes: string
  customFields: unknown
}

interface SupplierDetails {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  leadTimeDays: number
  minimumOrderQuantity: number
  paymentTerms: string
  preferredSupplier: boolean
  performanceRating: number
  lastOrderDate: string | null
}

interface ProductDetails {
  id: string
  name: string
  description: string
  category: string
  sku: string
  basePrice: number
  supplierSku: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  previousQuantity: number
  newQuantity: number
  unitCost: number
  totalCost: number
  reference: string
  reason: string
  notes: string
  timestamp: string
  createdBy: string
}

interface PredictiveAnalytics {
  dailyConsumptionRate: number
  daysUntilReorder: number
  suggestedReorderPoint: number
  nextRestockDate: string | null
  forecastedDemand: number[]
  stockoutRisk: 'low' | 'medium' | 'high' | 'unknown'
  turnoverRate: number
}

interface DetailedInventoryData {
  item: DetailedInventoryItem
  supplier: SupplierDetails | null
  product: ProductDetails | null
  stockHistory: StockMovement[]
  predictiveAnalytics: PredictiveAnalytics | null
  relatedItems: unknown[]
  documents: unknown[]
  metadata: {
    lastUpdated: string
    dataFreshness: string
    includeHistory: boolean
    includeAnalytics: boolean
    includeRelated: boolean
  }
}

interface DetailedInventoryModalProps {
  itemId: string
  isOpen: boolean
  onClose: () => void
  onUpdate?: (item: DetailedInventoryItem) => void
}

export default function DetailedInventoryModal({
  itemId,
  isOpen,
  onClose,
  onUpdate
}: DetailedInventoryModalProps) {
  const [data, setData] = useState<DetailedInventoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<Partial<DetailedInventoryItem>>({})

  const loadDetailedData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/inventory/detailed/${itemId}?includeHistory=true&includeAnalytics=true&includeRelated=true`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load inventory details')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    if (isOpen && itemId) {
      loadDetailedData()
    }
  }, [isOpen, itemId, loadDetailedData])

  const handleSave = async () => {
    if (!data) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/inventory/detailed/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save changes')
      }

      // Update local data
      setData(prevData => {
        if (!prevData) return null
        return {
          ...prevData,
          item: {
            ...prevData.item,
            ...editData
          }
        }
      })

      setEditMode(false)
      setEditData({})

      if (onUpdate) {
        onUpdate({
          ...data.item,
          ...editData
        })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_stock: { variant: 'default' as const, className: 'bg-green-100 text-green-800', label: 'In Stock' },
      low_stock: { variant: 'outline' as const, className: 'border-orange-500 text-orange-700', label: 'Low Stock' },
      out_of_stock: { variant: 'destructive' as const, className: '', label: 'Out of Stock' },
      overstocked: { variant: 'secondary' as const, className: '', label: 'Overstocked' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_stock
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getRiskBadge = (risk: string) => {
    const riskConfig = {
      low: { variant: 'default' as const, className: 'bg-green-100 text-green-800', label: 'Low Risk' },
      medium: { variant: 'outline' as const, className: 'border-yellow-500 text-yellow-700', label: 'Medium Risk' },
      high: { variant: 'destructive' as const, className: '', label: 'High Risk' },
      unknown: { variant: 'secondary' as const, className: '', label: 'Unknown' }
    }

    const config = riskConfig[risk as keyof typeof riskConfig] || riskConfig.unknown
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number, currency = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">{data?.item?.name || 'Loading...'}</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  SKU: {data?.item?.sku} • {data?.item?.location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMode(false)
                      setEditData({})
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading detailed information...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                      <p className="text-2xl font-bold">{data.item.currentStock}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-2">
                    {getStatusBadge(data.item.status)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(data.item.totalValue)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    @ {formatCurrency(data.item.unitCost)} per unit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reorder Point</p>
                      <p className="text-2xl font-bold">{data.item.reorderPoint}</p>
                    </div>
                    <Target className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.item.currentStock <= data.item.reorderPoint ? 'Reorder needed' : 'Above reorder point'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Lead Time</p>
                      <p className="text-2xl font-bold">{data.supplier?.leadTimeDays || 14}</p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Days</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="supplier">Supplier</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="related">Related</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Item Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Item Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <Label>Name</Label>
                          {editMode ? (
                            <Input
                              value={editData.name ?? data.item.name}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                            />
                          ) : (
                            <p className="text-sm font-medium">{data.item.name}</p>
                          )}
                        </div>

                        <div>
                          <Label>Description</Label>
                          {editMode ? (
                            <Textarea
                              value={editData.description ?? data.item.description}
                              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">{data.item.description || 'No description'}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Category</Label>
                            <p className="text-sm">{data.item.category}</p>
                          </div>
                          <div>
                            <Label>Location</Label>
                            {editMode ? (
                              <Input
                                value={editData.location ?? data.item.location}
                                onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                              />
                            ) : (
                              <p className="text-sm flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {data.item.location}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Reorder Point</Label>
                            {editMode ? (
                              <Input
                                type="number"
                                value={editData.reorderPoint ?? data.item.reorderPoint}
                                onChange={(e) => setEditData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                              />
                            ) : (
                              <p className="text-sm">{data.item.reorderPoint}</p>
                            )}
                          </div>
                          <div>
                            <Label>Max Stock</Label>
                            {editMode ? (
                              <Input
                                type="number"
                                value={editData.maxStock ?? data.item.maxStock}
                                onChange={(e) => setEditData(prev => ({ ...prev, maxStock: parseInt(e.target.value) || 0 }))}
                              />
                            ) : (
                              <p className="text-sm">{data.item.maxStock || 'Not set'}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label>Notes</Label>
                          {editMode ? (
                            <Textarea
                              value={editData.notes ?? data.item.notes}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              placeholder="Add notes about this item..."
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">{data.item.notes || 'No notes'}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stock Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Stock Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Current Stock</span>
                            <span className="text-lg font-semibold">{data.item.currentStock}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Reserved Stock</span>
                            <span className="text-sm">{data.item.reservedStock}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Available Stock</span>
                            <span className="text-sm font-medium">{data.item.availableStock}</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Unit Cost</span>
                            <span className="text-sm font-medium">{formatCurrency(data.item.unitCost)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Value</span>
                            <span className="text-lg font-semibold">{formatCurrency(data.item.totalValue)}</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Last Updated</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(data.item.lastStockUpdate), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status</span>
                            {getStatusBadge(data.item.status)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="supplier" className="space-y-4">
                {data.supplier ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Supplier Information
                        {data.supplier.preferredSupplier && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Preferred
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-lg font-semibold">{data.supplier.name}</h4>
                            <p className="text-sm text-muted-foreground">{data.supplier.contactPerson}</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Email:</span>
                              <span className="text-sm">{data.supplier.email || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Phone:</span>
                              <span className="text-sm">{data.supplier.phone || 'Not provided'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-muted-foreground">Lead Time</Label>
                              <p className="text-lg font-semibold">{data.supplier.leadTimeDays} days</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">MOQ</Label>
                              <p className="text-lg font-semibold">{data.supplier.minimumOrderQuantity}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm text-muted-foreground">Payment Terms</Label>
                            <p className="text-sm">{data.supplier.paymentTerms}</p>
                          </div>

                          {data.supplier.performanceRating > 0 && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Performance Rating</Label>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < data.supplier!.performanceRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-medium">{data.supplier.performanceRating.toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No supplier information available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                {data.predictiveAnalytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Consumption Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Daily Rate</Label>
                            <p className="text-lg font-semibold">{data.predictiveAnalytics.dailyConsumptionRate.toFixed(2)}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Turnover Rate</Label>
                            <p className="text-lg font-semibold">{(data.predictiveAnalytics.turnoverRate * 100).toFixed(1)}%</p>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <Label className="text-sm text-muted-foreground">Days Until Reorder</Label>
                          <p className="text-2xl font-bold text-orange-600">{data.predictiveAnalytics.daysUntilReorder}</p>
                        </div>

                        <div>
                          <Label className="text-sm text-muted-foreground">Stockout Risk</Label>
                          <div className="mt-1">
                            {getRiskBadge(data.predictiveAnalytics.stockoutRisk)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Suggested Reorder Point</Label>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold">{data.predictiveAnalytics.suggestedReorderPoint}</p>
                            {data.predictiveAnalytics.suggestedReorderPoint !== data.item.reorderPoint && (
                              <Badge variant="outline" className="text-xs">
                                Current: {data.item.reorderPoint}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {data.predictiveAnalytics.nextRestockDate && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Next Restock Date</Label>
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(data.predictiveAnalytics.nextRestockDate), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">AI Recommendations</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {data.predictiveAnalytics.stockoutRisk === 'high' && (
                              <li>• Consider placing an order immediately</li>
                            )}
                            {data.predictiveAnalytics.suggestedReorderPoint > data.item.reorderPoint && (
                              <li>• Increase reorder point to {data.predictiveAnalytics.suggestedReorderPoint}</li>
                            )}
                            {data.predictiveAnalytics.turnoverRate < 0.1 && (
                              <li>• Low turnover - consider reducing stock levels</li>
                            )}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Analytics data is being calculated...</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Stock Movement History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.stockHistory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Before</TableHead>
                            <TableHead className="text-right">After</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.stockHistory.map((movement) => (
                            <TableRow key={movement.id}>
                              <TableCell className="text-sm">
                                {format(new Date(movement.timestamp), 'MMM dd, yyyy HH:mm')}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {movement.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                <span className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono">{movement.previousQuantity}</TableCell>
                              <TableCell className="text-right font-mono">{movement.newQuantity}</TableCell>
                              <TableCell className="text-sm">{movement.reference || '-'}</TableCell>
                              <TableCell className="text-sm">{movement.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No stock movement history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="related" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Related Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.relatedItems.length > 0 ? (
                      <div className="space-y-4">
                        {data.relatedItems.map((relatedItem) => (
                          <div key={relatedItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{relatedItem.name}</p>
                                <p className="text-sm text-muted-foreground">SKU: {relatedItem.sku}</p>
                                <Badge variant="outline" size="sm" className="mt-1">
                                  {relatedItem.relationshipType.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{relatedItem.currentStock} units</p>
                              <p className="text-sm text-muted-foreground">{formatCurrency(relatedItem.totalValue)}</p>
                              {getStatusBadge(relatedItem.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No related items found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
