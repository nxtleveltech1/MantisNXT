"use client"

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  X,
  Download,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUploadPricelist, useMergeUpload } from '@/hooks/useNeonSpp'
import { useQuery } from '@tanstack/react-query'
import type {
  PricelistUploadRequest,
  PricelistValidationResult,
  MergeResult,
  Supplier,
} from '@/types/nxt-spp'

// Step definitions
const STEPS = [
  { id: 1, name: 'Upload', description: 'Select file and supplier' },
  { id: 2, name: 'Validate', description: 'Validate data quality' },
  { id: 3, name: 'Review', description: 'Review validation results' },
  { id: 4, name: 'Merge', description: 'Merge to catalog' },
  { id: 5, name: 'Complete', description: 'Upload complete' },
]

interface EnhancedPricelistUploadProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onComplete: (result: MergeResult) => Promise<void>
  defaultSupplierId?: string
  autoValidate?: boolean
  autoMerge?: boolean
}

export function EnhancedPricelistUpload({
  open = false,
  onOpenChange,
  onComplete,
  defaultSupplierId,
  autoValidate = false,
  autoMerge = false,
}: EnhancedPricelistUploadProps) {
  // Hooks
  const { toast } = useToast()
  const uploadMutation = useUploadPricelist()
  const mergeMutation = useMergeUpload()

  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [supplierId, setSupplierId] = useState<string>(defaultSupplierId || '')
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<PricelistValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationProgress, setValidationProgress] = useState(0)
  // Selection integration removed from NXT-SPP workflow

  // Load suppliers query
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: async () => {
      // Use /api/suppliers with status=active filter (v3 API)
      const response = await fetch('/api/suppliers?status=active&limit=1000')
      if (!response.ok) {
        console.error('Failed to fetch suppliers:', response.status)
        throw new Error('Failed to fetch suppliers')
      }
      const data = await response.json()
      // Handle v3 API response format with pagination: {success, data, pagination}
      const supplierList = data.success && data.data 
        ? data.data 
        : Array.isArray(data?.data) 
        ? data.data 
        : Array.isArray(data) 
        ? data 
        : []
      // Map supplier data to match expected format (id instead of supplier_id)
      return supplierList.map((s: any) => ({
        ...s,
        id: s.id || s.supplier_id, // Ensure id field exists
        supplier_id: s.supplier_id || s.id, // Keep supplier_id for compatibility
        code: s.code || s.supplier_code,
        active: s.active ?? s.status === 'active',
      })) as Supplier[]
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const suppliers = suppliersData || []
  const loading = uploadMutation.isPending || mergeMutation.isPending

  // Selections list no longer needed here

  // Reset state
  const resetState = useCallback(() => {
    setCurrentStep(1)
    setFile(null)
    setSupplierId(defaultSupplierId || '')
    setUploadId(null)
    setValidationResult(null)
    setError(null)
    setValidationProgress(0)
    uploadMutation.reset()
    mergeMutation.reset()
  }, [defaultSupplierId, uploadMutation, mergeMutation])

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file')
    }
  }, [])

  const isValidFileType = (file: File) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ]
    return validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i);
  }

  // Step 1: Upload file
  const handleUpload = async () => {
    if (!file || !supplierId) {
      setError('Please select both a file and a supplier')
      return
    }

    setError(null)

    try {
      // Get supplier's default currency or fall back to ZAR
      const selectedSupplier = suppliers.find(s => s.id === supplierId)
      const currency = selectedSupplier?.default_currency || 
                       (selectedSupplier as any)?.currency || 
                       'ZAR'
      
      const newUploadId = await uploadMutation.mutateAsync({
        file,
        supplier_id: supplierId,
        filename: file.name,
        currency: currency,
      })

      setUploadId(newUploadId)
      setCurrentStep(2)

      toast({
        title: 'Upload successful',
        description: 'Pricelist uploaded successfully',
      })

      // Auto-validate if enabled
      if (autoValidate) {
        await handleValidate(newUploadId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Step 2: Validate
  const handleValidate = async (uploadIdToValidate?: string) => {
    const idToUse = uploadIdToValidate || uploadId
    if (!idToUse) return

    setError(null)
    setValidationProgress(0)

    try {
      // Simulate progressive validation
      const progressInterval = setInterval(() => {
        setValidationProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/spp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: idToUse }),
      })

      clearInterval(progressInterval)
      setValidationProgress(100)

      if (!response.ok) {
        throw new Error('Validation failed')
      }

      const result = await response.json()
      setValidationResult(result.data)
      setCurrentStep(3)

      toast({
        title: 'Validation complete',
        description: `Validated ${result.data.valid_rows} of ${result.data.total_rows} rows`,
      })

      // Auto-merge if enabled and validation passed
      if (autoMerge && result.data.status === 'valid') {
        await handleMerge()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed'
      setError(message)
      toast({
        title: 'Validation failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Step 4: Merge
  const handleMerge = async (skipInvalidRows?: boolean) => {
    if (!uploadId) return

    setError(null)
    setCurrentStep(4) // Show loading state

    try {
      const result = await mergeMutation.mutateAsync(skipInvalidRows ? { uploadId, skipInvalidRows: true } : uploadId)
      setCurrentStep(5)

      toast({
        title: 'Merge successful',
        description: `Created ${result.products_created} products, updated ${result.products_updated} products`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Merge failed'
      setError(message)
      setCurrentStep(3) // Go back to review step
      toast({
        title: 'Merge failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Handle close
  const handleClose = () => {
    if (currentStep === 5 && mergeMutation.data) {
      onComplete(mergeMutation.data)
    }
    onOpenChange?.(false)
    setTimeout(resetState, 300)
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Pricelist File</Label>
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  file ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
                )}
              >
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div className="mt-4">
                      <Label htmlFor="file-input" className="cursor-pointer">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
                          Click to upload or drag and drop
                        </div>
                      </Label>
                      <Input
                        id="file-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="text-xs text-muted-foreground mt-2">
                        Excel (.xlsx, .xls) or CSV files only
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={supplierId || undefined} onValueChange={setSupplierId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length > 0 ? (
                    suppliers.map((supplier) => (
                      <SelectItem
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name} {supplier.code && `(${supplier.code})`}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No suppliers found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {supplierId ? (
                  (() => {
                    const selectedSupplier = suppliers.find(s => s.id === supplierId)
                    const currency = selectedSupplier?.default_currency || 
                                     (selectedSupplier as any)?.currency || 
                                     'ZAR'
                    return `Prices will be imported in ${currency}. The system will automatically map columns and validate data.`
                  })()
                ) : (
                  'Prices will be imported in ZAR (South African Rand). The system will automatically map columns and validate data.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
              <div className="mt-4 font-medium text-lg">Validating Upload...</div>
              <div className="text-sm text-muted-foreground mt-2">
                Checking data quality and mapping fields
              </div>
              <Progress value={validationProgress} className="mt-4 max-w-md mx-auto" />
              <div className="text-xs text-muted-foreground mt-2">
                {validationProgress}% complete
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {validationResult && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Rows
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{validationResult.total_rows}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Valid Rows
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {validationResult.valid_rows}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {validationResult.invalid_rows}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Validation Status */}
                <Alert className={cn(
                  validationResult.status === 'valid' && "border-green-200 bg-green-50",
                  validationResult.status === 'invalid' && "border-red-200 bg-red-50",
                  validationResult.status === 'warning' && "border-yellow-200 bg-yellow-50"
                )}>
                  {validationResult.status === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {validationResult.status === 'invalid' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {validationResult.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                  <AlertDescription>
                    {validationResult.status === 'valid' && 'All data validated successfully. Ready to merge.'}
                    {validationResult.status === 'invalid' && `Found ${validationResult.errors.length} errors that must be fixed before merging.`}
                    {validationResult.status === 'warning' && `Validation passed with ${validationResult.warnings.length} warnings.`}
                  </AlertDescription>
                </Alert>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">New Products</div>
                      <div className="font-medium">{validationResult.summary.new_products}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Price Updates</div>
                      <div className="font-medium">{validationResult.summary.updated_prices}</div>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Validation Errors ({validationResult.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {validationResult.errors.slice(0, 10).map((error, idx) => (
                            <div key={idx} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                              <span className="font-medium">Row {error.row_num}:</span> {error.message}
                              {error.field && <span className="text-muted-foreground"> (field: {error.field})</span>}
                            </div>
                          ))}
                          {validationResult.errors.length > 10 && (
                            <div className="text-sm text-muted-foreground text-center py-2">
                              + {validationResult.errors.length - 10} more errors
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <Button variant="outline" size="sm" className="mt-3">
                        <Download className="h-4 w-4 mr-2" />
                        Download Error Report
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Warnings ({validationResult.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {validationResult.warnings.slice(0, 5).map((warning, idx) => (
                            <div key={idx} className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <span className="font-medium">Row {warning.row_num}:</span> {warning.message}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
              <div className="mt-4 font-medium text-lg">Merging to Catalog...</div>
              <div className="text-sm text-muted-foreground mt-2">
                Creating supplier products and updating price history
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            {mergeMutation.data && (
              <>
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="mt-4 font-medium text-lg">Upload Complete!</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Successfully merged pricelist to catalog
                  </div>
                </div>

                {/* Merge Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Products Created
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {mergeMutation.data.products_created}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Products Updated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {mergeMutation.data.products_updated}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Prices Updated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {mergeMutation.data.prices_updated}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Next Steps */}
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Step:</strong> Review updated products in the catalog. This upload updated pricing and created any missing products.
                  </AlertDescription>
                </Alert>

              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Upload Supplier Pricelist</DialogTitle>
          <DialogDescription>
            The single canonical system for uploading all supplier pricelists
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                    currentStep > step.id && "bg-green-600 text-white",
                    currentStep === step.id && "bg-blue-600 text-white",
                    currentStep < step.id && "bg-gray-200 text-gray-600"
                  )}>
                    {currentStep > step.id ? <CheckCircle2 className="h-6 w-6" /> : step.id}
                  </div>
                  <div className="mt-2 text-xs font-medium text-center">
                    {step.name}
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2 transition-colors",
                    currentStep > step.id ? "bg-green-600" : "bg-gray-200"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {currentStep === 5 ? 'Close' : 'Cancel'}
          </Button>

          <div className="flex gap-2">
            {currentStep === 1 && (
              <Button onClick={handleUpload} disabled={!file || !supplierId || loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload & Validate
              </Button>
            )}
            {currentStep === 3 && validationResult && (
              <>
                {validationResult.status === 'invalid' ? (
                  <>
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      Fix & Re-upload
                    </Button>
                    <Button onClick={() => handleMerge(true)} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Proceed with {validationResult.valid_rows} of {validationResult.total_rows}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleMerge(false)} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Merge to Catalog
                  </Button>
                )}
              </>
            )}
            {currentStep === 5 && (
              <Button onClick={handleClose}>
                Close
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
