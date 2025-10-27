"use client"

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Eye,
  Trash2,
  Plus,
  Calendar,
  DollarSign,
  Package,
  Building2
} from 'lucide-react'

interface PricelistItem {
  id: string
  sku: string
  supplierSku?: string
  name: string
  description?: string
  unitPrice: number
  minimumQuantity?: number
  maximumQuantity?: number
  leadTimeDays?: number
  notes?: string
  category?: string
  isActive: boolean
}

interface PricelistUploadProps {
  supplierId?: string
  onUploadComplete?: (pricelist: any) => void
  onCancel?: () => void
}

const SupplierPricelistUpload: React.FC<PricelistUploadProps> = ({
  supplierId,
  onUploadComplete,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  
  // Manual entry state
  const [manualItems, setManualItems] = useState<PricelistItem[]>([])
  const [newItem, setNewItem] = useState<Partial<PricelistItem>>({
    sku: '',
    name: '',
    unitPrice: 0,
    isActive: true
  })

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setErrors([])
      setWarnings([])
      setValidationResults(null)
    }
  }, [])

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (supplierId) {
        formData.append('supplierId', supplierId)
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/suppliers/pricelists/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        setValidationResults(result.data)
        setActiveTab('validation')
        if (onUploadComplete) {
          onUploadComplete(result.data)
        }
      } else {
        setErrors([result.message || 'Upload failed'])
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed'])
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleManualAdd = () => {
    if (!newItem.sku || !newItem.name || !newItem.unitPrice) {
      setErrors(['Please fill in all required fields'])
      return
    }

    const item: PricelistItem = {
      id: `manual_${Date.now()}`,
      sku: newItem.sku,
      supplierSku: newItem.supplierSku,
      name: newItem.name,
      description: newItem.description,
      unitPrice: newItem.unitPrice,
      minimumQuantity: newItem.minimumQuantity,
      maximumQuantity: newItem.maximumQuantity,
      leadTimeDays: newItem.leadTimeDays,
      notes: newItem.notes,
      category: newItem.category,
      isActive: true
    }

    setManualItems(prev => [...prev, item])
    setNewItem({
      sku: '',
      name: '',
      unitPrice: 0,
      isActive: true
    })
    setErrors([])
  }

  const handleRemoveManualItem = (id: string) => {
    setManualItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSavePricelist = async () => {
    try {
      const items = validationResults?.items || manualItems
      
      const response = await fetch('/api/suppliers/pricelists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplierId,
          name: `Pricelist ${new Date().toLocaleDateString()}`,
          items,
          isActive: true
        })
      })

      const result = await response.json()

      if (result.success) {
        if (onUploadComplete) {
          onUploadComplete(result.data)
        }
      } else {
        setErrors([result.message || 'Failed to save pricelist'])
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to save pricelist'])
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Supplier Pricelist Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">File Upload</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Supported formats: Excel (.xlsx, .xls) or CSV files
                  </p>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">{selectedFile.name}</span>
                    <Badge variant="secondary">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Validate
                  </Button>
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={newItem.sku || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier-sku">Supplier SKU</Label>
                  <Input
                    id="supplier-sku"
                    value={newItem.supplierSku || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, supplierSku: e.target.value }))}
                    placeholder="Enter supplier SKU"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="unit-price">Unit Price *</Label>
                  <Input
                    id="unit-price"
                    type="number"
                    step="0.01"
                    value={newItem.unitPrice || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newItem.category || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <Label htmlFor="min-qty">Minimum Quantity</Label>
                  <Input
                    id="min-qty"
                    type="number"
                    value={newItem.minimumQuantity || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, minimumQuantity: parseInt(e.target.value) || undefined }))}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="lead-time">Lead Time (Days)</Label>
                  <Input
                    id="lead-time"
                    type="number"
                    value={newItem.leadTimeDays || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) || undefined }))}
                    placeholder="7"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter product description"
                  />
                </div>
              </div>

              <Button onClick={handleManualAdd} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              {manualItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Added Items ({manualItems.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {manualItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku} | Price: ${item.unitPrice}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManualItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {(validationResults || manualItems.length > 0) && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSavePricelist} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Pricelist
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SupplierPricelistUpload

