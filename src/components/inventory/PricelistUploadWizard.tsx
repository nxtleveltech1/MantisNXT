"use client"

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Brain,
  MapPin,
  Settings,
  Download,
  Eye,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Clock,
  FileText,
  User,
  Shield,
  Zap,
  ArrowRight,
  X,
  Info,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Save,
  Send
} from 'lucide-react'

// Enhanced interfaces for production use
export interface SupplierInfo {
  id: string
  name: string
  code: string
  email: string
  phone?: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  paymentTerms: {
    method: string
    termsDays: number
    discountPercent?: number
  }
  leadTimeDays: number
  currency: string
  isActive: boolean
  performance: {
    onTimeDeliveryRate: number
    qualityRating: number
    overallRating: number
    totalOrders: number
  }
}

export interface PricelistItem {
  sku: string
  supplierSku?: string
  description: string
  brand: string
  category: string
  unitPrice: number
  minimumQuantity?: number
  maximumQuantity?: number
  leadTimeDays?: number
  vatRate: number
  stockQuantity: number
  isActive: boolean
  lastUpdated: Date
  notes?: string
}

export interface ValidationIssue {
  row: number
  field: string
  value: any
  message: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
  autoFixAvailable?: boolean
}

export interface PricelistValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
    duplicateRows: number
    emptyRows: number
    estimatedValue: number
    uniqueCategories: number
    uniqueBrands: number
    averagePrice: number
  }
  processedItems: PricelistItem[]
  recommendations: string[]
}

export interface UploadProgress {
  stage: 'idle' | 'uploading' | 'processing' | 'validating' | 'saving' | 'complete' | 'error'
  percentage: number
  message: string
  timeRemaining?: number
  estimatedCompletion?: Date
}

export interface PricelistUploadWizardProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onComplete: (result: PricelistValidationResult) => Promise<void>
  allowedFileTypes?: string[]
  maxFileSize?: number
  requiredFields?: string[]
  autoSelectSupplier?: string
  enableBulkOperations?: boolean
}

// Enhanced semantic mapping engine
class AdvancedSemanticMapper {
  private static readonly FIELD_MAPPINGS = {
    sku: {
      patterns: ['sku', 'item_code', 'product_code', 'part_number', 'item_id', 'product_id', 'code', 'article_number', 'barcode', 'upc', 'model'],
      required: true,
      weight: 1.0
    },
    supplierSku: {
      patterns: ['supplier_sku', 'vendor_sku', 'supplier_code', 'vendor_code', 'supplier_part', 'vendor_part', 'mfg_part'],
      required: false,
      weight: 0.8
    },
    description: {
      patterns: ['description', 'product_description', 'item_description', 'name', 'product_name', 'item_name', 'title', 'product_title', 'details'],
      required: true,
      weight: 1.0
    },
    brand: {
      patterns: ['brand', 'make', 'manufacturer', 'label', 'trademark', 'brand_name', 'product_brand', 'mfg_brand'],
      required: true,
      weight: 0.9
    },
    category: {
      patterns: ['category', 'type', 'class', 'group', 'segment', 'classification', 'product_category', 'item_category', 'cat', 'product_type'],
      required: true,
      weight: 0.9
    },
    unitPrice: {
      patterns: ['price', 'unit_price', 'cost', 'unit_cost', 'amount', 'value', 'list_price', 'retail_price', 'selling_price'],
      required: true,
      weight: 1.0
    },
    minimumQuantity: {
      patterns: ['min_qty', 'minimum_quantity', 'min_order', 'minimum_order', 'moq', 'min_order_qty'],
      required: false,
      weight: 0.6
    },
    maximumQuantity: {
      patterns: ['max_qty', 'maximum_quantity', 'max_order', 'maximum_order', 'max_order_qty'],
      required: false,
      weight: 0.5
    },
    leadTimeDays: {
      patterns: ['lead_time', 'leadtime', 'delivery_time', 'lead_days', 'delivery_days', 'lead_time_days'],
      required: false,
      weight: 0.7
    },
    vatRate: {
      patterns: ['vat', 'vat_rate', 'tax', 'tax_rate', 'gst', 'gst_rate', 'sales_tax', 'value_added_tax', 'tax_percentage'],
      required: false,
      weight: 0.8
    },
    stockQuantity: {
      patterns: ['stock', 'quantity', 'qty', 'inventory', 'available', 'on_hand', 'stock_quantity', 'current_stock', 'in_stock'],
      required: false,
      weight: 0.7
    }
  }

  static generateMapping(headers: string[]): { mappings: Record<string, string>, confidence: number, suggestions: string[] } {
    const mappings: Record<string, string> = {}
    const confidenceScores: number[] = []
    const suggestions: string[] = []

    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'))

    for (const [targetField, config] of Object.entries(this.FIELD_MAPPINGS)) {
      let bestMatch = { header: '', confidence: 0, index: -1 }

      normalizedHeaders.forEach((normalizedHeader, index) => {
        const confidence = this.calculateFieldConfidence(normalizedHeader, config.patterns)
        if (confidence > bestMatch.confidence) {
          bestMatch = { header: headers[index], confidence, index }
        }
      })

      if (bestMatch.confidence > 0.3) {
        mappings[targetField] = bestMatch.header
        confidenceScores.push(bestMatch.confidence * config.weight)
      } else if (config.required) {
        suggestions.push(`Required field '${targetField}' could not be automatically mapped`)
      }
    }

    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0

    // Add additional suggestions
    if (overallConfidence < 0.7) {
      suggestions.push('Low mapping confidence - please review field mappings manually')
    }

    const unmappedHeaders = headers.filter(header => !Object.values(mappings).includes(header))
    if (unmappedHeaders.length > 3) {
      suggestions.push(`${unmappedHeaders.length} columns will be ignored in import`)
    }

    return { mappings, confidence: overallConfidence, suggestions }
  }

  private static calculateFieldConfidence(normalizedHeader: string, patterns: string[]): number {
    // Exact match
    if (patterns.includes(normalizedHeader)) return 1.0

    // Partial matches with scoring
    let maxScore = 0
    for (const pattern of patterns) {
      // Contains pattern
      if (normalizedHeader.includes(pattern)) {
        maxScore = Math.max(maxScore, 0.9)
      } else if (pattern.includes(normalizedHeader)) {
        maxScore = Math.max(maxScore, 0.8)
      } else {
        // Fuzzy matching using Levenshtein distance
        const similarity = this.calculateSimilarity(normalizedHeader, pattern)
        if (similarity > 0.7) {
          maxScore = Math.max(maxScore, similarity * 0.7)
        }
      }
    }

    return maxScore
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(str1, str2)
    return (longer.length - editDistance) / longer.length
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  static validateAndCleanData(
    rawData: any[][],
    headers: string[],
    mappings: Record<string, string>,
    selectedSupplier?: SupplierInfo
  ): PricelistValidationResult {
    const issues: ValidationIssue[] = []
    const processedItems: PricelistItem[] = []
    const seenSkus = new Set<string>()
    const categories = new Set<string>()
    const brands = new Set<string>()
    let totalValue = 0
    let validRows = 0
    let errorRows = 0
    let warningRows = 0
    let duplicateRows = 0
    let emptyRows = 0

    rawData.forEach((row, index) => {
      const rowNumber = index + 2 // Account for 1-based indexing and header row
      let hasErrors = false
      let hasWarnings = false

      // Check for empty rows
      if (row.every(cell => !cell || cell.toString().trim() === '')) {
        emptyRows++
        return
      }

      const item: Partial<PricelistItem> = {
        isActive: true,
        lastUpdated: new Date()
      }

      // Process each mapped field
      for (const [targetField, sourceField] of Object.entries(mappings)) {
        if (!sourceField || !headers.includes(sourceField)) continue

        const columnIndex = headers.indexOf(sourceField)
        const cellValue = row[columnIndex]

        try {
          switch (targetField) {
            case 'sku':
              if (!cellValue || cellValue.toString().trim() === '') {
                issues.push({
                  row: rowNumber,
                  field: 'sku',
                  value: cellValue,
                  message: 'SKU is required',
                  severity: 'error'
                })
                hasErrors = true
              } else {
                const sku = cellValue.toString().trim().toUpperCase()
                if (seenSkus.has(sku)) {
                  duplicateRows++
                  issues.push({
                    row: rowNumber,
                    field: 'sku',
                    value: sku,
                    message: 'Duplicate SKU found',
                    severity: 'warning',
                    suggestion: 'Consider using a unique identifier or merging duplicate entries'
                  })
                  hasWarnings = true
                }
                seenSkus.add(sku)
                item.sku = sku
              }
              break

            case 'description':
              if (!cellValue || cellValue.toString().trim() === '') {
                issues.push({
                  row: rowNumber,
                  field: 'description',
                  value: cellValue,
                  message: 'Description is required',
                  severity: 'error'
                })
                hasErrors = true
              } else {
                item.description = cellValue.toString().trim()
              }
              break

            case 'unitPrice':
              const price = this.parseNumericValue(cellValue)
              if (isNaN(price) || price < 0) {
                issues.push({
                  row: rowNumber,
                  field: 'unitPrice',
                  value: cellValue,
                  message: 'Invalid price value',
                  severity: 'error',
                  suggestion: 'Price must be a positive number'
                })
                hasErrors = true
              } else {
                item.unitPrice = price
                totalValue += price
              }
              break

            case 'brand':
              if (cellValue && cellValue.toString().trim()) {
                const brand = cellValue.toString().trim()
                item.brand = brand
                brands.add(brand)
              }
              break

            case 'category':
              if (cellValue && cellValue.toString().trim()) {
                const category = cellValue.toString().trim()
                item.category = category
                categories.add(category)
              }
              break

            case 'vatRate':
              const vat = this.parseNumericValue(cellValue)
              if (!isNaN(vat)) {
                if (vat < 0 || vat > 100) {
                  issues.push({
                    row: rowNumber,
                    field: 'vatRate',
                    value: cellValue,
                    message: 'VAT rate should be between 0 and 100',
                    severity: 'warning',
                    suggestion: 'Check if this is a percentage or decimal value'
                  })
                  hasWarnings = true
                }
                item.vatRate = vat
              } else {
                item.vatRate = selectedSupplier?.paymentTerms?.discountPercent || 0
              }
              break

            case 'stockQuantity':
              const stock = parseInt(cellValue?.toString() || '0')
              item.stockQuantity = isNaN(stock) ? 0 : Math.max(0, stock)
              break

            case 'minimumQuantity':
              const minQty = parseInt(cellValue?.toString() || '1')
              item.minimumQuantity = isNaN(minQty) ? 1 : Math.max(1, minQty)
              break

            case 'maximumQuantity':
              const maxQty = parseInt(cellValue?.toString() || '0')
              if (!isNaN(maxQty) && maxQty > 0) {
                item.maximumQuantity = maxQty
              }
              break

            case 'leadTimeDays':
              const leadTime = parseInt(cellValue?.toString() || '0')
              item.leadTimeDays = isNaN(leadTime) ? selectedSupplier?.leadTimeDays || 7 : Math.max(0, leadTime)
              break

            case 'supplierSku':
              if (cellValue && cellValue.toString().trim()) {
                item.supplierSku = cellValue.toString().trim()
              }
              break
          }
        } catch (error) {
          issues.push({
            row: rowNumber,
            field: targetField,
            value: cellValue,
            message: `Error processing field: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
          })
          hasErrors = true
        }
      }

      // Apply defaults and business rules
      if (!hasErrors) {
        // Set defaults
        if (!item.brand) item.brand = 'Unknown'
        if (!item.category) item.category = 'General'
        if (!item.vatRate) item.vatRate = 0
        if (!item.stockQuantity) item.stockQuantity = 0
        if (!item.minimumQuantity) item.minimumQuantity = 1
        if (!item.leadTimeDays) item.leadTimeDays = selectedSupplier?.leadTimeDays || 7

        // Business rule validations
        if (item.minimumQuantity && item.maximumQuantity && item.minimumQuantity > item.maximumQuantity) {
          issues.push({
            row: rowNumber,
            field: 'quantity',
            value: `Min: ${item.minimumQuantity}, Max: ${item.maximumQuantity}`,
            message: 'Minimum quantity cannot be greater than maximum quantity',
            severity: 'warning',
            autoFixAvailable: true
          })
          hasWarnings = true
        }

        processedItems.push(item as PricelistItem)
        validRows++
      } else {
        errorRows++
      }

      if (hasWarnings) warningRows++
    })

    // Generate recommendations
    const recommendations: string[] = []

    if (categories.size > 20) {
      recommendations.push('Consider consolidating categories - you have many unique categories')
    }

    if (brands.size > 50) {
      recommendations.push('Large number of brands detected - consider brand standardization')
    }

    if (duplicateRows > 0) {
      recommendations.push(`${duplicateRows} duplicate SKUs found - review for data consistency`)
    }

    if (validRows > 0 && totalValue / validRows > 1000) {
      recommendations.push('High-value items detected - ensure pricing accuracy')
    }

    const averagePrice = validRows > 0 ? totalValue / validRows : 0

    return {
      isValid: errorRows === 0,
      issues,
      summary: {
        totalRows: rawData.length,
        validRows,
        errorRows,
        warningRows,
        duplicateRows,
        emptyRows,
        estimatedValue: totalValue,
        uniqueCategories: categories.size,
        uniqueBrands: brands.size,
        averagePrice
      },
      processedItems,
      recommendations
    }
  }

  private static parseNumericValue(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      // Remove currency symbols and spaces, then parse
      const cleaned = value.replace(/[^\d.-]/g, '')
      return parseFloat(cleaned)
    }
    return NaN
  }
}

const PricelistUploadWizard: React.FC<PricelistUploadWizardProps> = ({
  open,
  onOpenChange,
  onComplete,
  allowedFileTypes = ['.xlsx', '.xls', '.csv'],
  maxFileSize = 25,
  requiredFields = ['sku', 'description', 'unitPrice'],
  autoSelectSupplier,
  enableBulkOperations = true
}) => {
  // State management
  const [localOpen, setLocalOpen] = useState(false)
  const isOpen = open ?? localOpen
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setLocalOpen(v))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [rawData, setRawData] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierInfo | null>(null)
  const [availableSuppliers, setAvailableSuppliers] = useState<SupplierInfo[]>([])
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [validationResult, setValidationResult] = useState<PricelistValidationResult | null>(null)
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    percentage: 0,
    message: 'Ready to upload'
  })
  const [autoFixIssues, setAutoFixIssues] = useState(true)
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set())

  // Load suppliers on component mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers?isActive=true&limit=100')
        const data = await response.json()
        if (data.success) {
          setAvailableSuppliers(data.data)

          // Auto-select supplier if provided
          if (autoSelectSupplier) {
            const supplier = data.data.find((s: SupplierInfo) =>
              s.id === autoSelectSupplier || s.code === autoSelectSupplier
            )
            if (supplier) {
              setSelectedSupplier(supplier)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load suppliers:', error)
      }
    }

    if (isOpen) {
      loadSuppliers()
    }
  }, [isOpen, autoSelectSupplier])

  // Reset state when dialog closes
  const resetState = useCallback(() => {
    setCurrentStep(1)
    setFile(null)
    setRawData([])
    setHeaders([])
    setSelectedSupplier(null)
    setFieldMappings({})
    setValidationResult(null)
    setProgress({ stage: 'idle', percentage: 0, message: 'Ready to upload' })
    setSelectedIssues(new Set())
  }, [])

  // File upload handler
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!uploadedFile) return

    setProgress({ stage: 'uploading', percentage: 10, message: 'Validating file...' })

    // File validation
    if (uploadedFile.size > maxFileSize * 1024 * 1024) {
      setProgress({ stage: 'error', percentage: 0, message: `File size exceeds ${maxFileSize}MB limit` })
      return
    }

    const fileExt = uploadedFile.name.toLowerCase().split('.').pop()
    if (!allowedFileTypes.some(type => type.includes(fileExt || ''))) {
      setProgress({ stage: 'error', percentage: 0, message: `File type not supported. Allowed: ${allowedFileTypes.join(', ')}` })
      return
    }

    try {
      setProgress({ stage: 'processing', percentage: 30, message: 'Reading file contents...' })

      const arrayBuffer = await uploadedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[worksheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (data.length < 2) {
        setProgress({ stage: 'error', percentage: 0, message: 'File must contain header row and at least one data row' })
        return
      }

      setProgress({ stage: 'processing', percentage: 60, message: 'Analyzing data structure...' })

      const fileHeaders = data[0] as string[]
      const fileData = data.slice(1) as any[][]

      // Generate automatic field mappings
      const { mappings, confidence, suggestions } = AdvancedSemanticMapper.generateMapping(fileHeaders)

      setFile(uploadedFile)
      setHeaders(fileHeaders)
      setRawData(fileData)
      setFieldMappings(mappings)

      setProgress({
        stage: 'complete',
        percentage: 100,
        message: `File processed successfully. Mapping confidence: ${Math.round(confidence * 100)}%`
      })

      // Auto-advance to next step if mappings are confident
      if (confidence > 0.8) {
        setTimeout(() => setCurrentStep(2), 1500)
      } else {
        setTimeout(() => setCurrentStep(2), 500)
      }

    } catch (error) {
      console.error('File processing error:', error)
      setProgress({
        stage: 'error',
        percentage: 0,
        message: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }, [maxFileSize, allowedFileTypes])

  // Validation handler
  const handleValidation = useCallback(async () => {
    if (!rawData.length || !headers.length || !selectedSupplier) return

    setProgress({ stage: 'validating', percentage: 20, message: 'Validating data...' })

    try {
      const result = AdvancedSemanticMapper.validateAndCleanData(
        rawData,
        headers,
        fieldMappings,
        selectedSupplier
      )

      setValidationResult(result)
      setProgress({
        stage: 'complete',
        percentage: 100,
        message: `Validation complete. ${result.summary.validRows} valid items found.`
      })

      setCurrentStep(4)

    } catch (error) {
      console.error('Validation error:', error)
      setProgress({
        stage: 'error',
        percentage: 0,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }, [rawData, headers, fieldMappings, selectedSupplier])

  // Save to backend
  const handleSave = useCallback(async () => {
    if (!validationResult || !selectedSupplier) return

    setProgress({ stage: 'saving', percentage: 10, message: 'Preparing data for save...' })

    try {
      // Create pricelist payload
      const pricelistPayload = {
        supplierId: selectedSupplier.id,
        name: `${selectedSupplier.name} Pricelist - ${new Date().toLocaleDateString()}`,
        description: `Imported from ${file?.name || 'uploaded file'}`,
        effectiveFrom: new Date().toISOString(),
        currency: selectedSupplier.currency,
        items: validationResult.processedItems.map(item => ({
          sku: item.sku,
          supplierSku: item.supplierSku,
          unitPrice: item.unitPrice,
          minimumQuantity: item.minimumQuantity,
          maximumQuantity: item.maximumQuantity,
          leadTimeDays: item.leadTimeDays,
          notes: item.notes
        }))
      }

      setProgress({ stage: 'saving', percentage: 50, message: 'Saving pricelist...' })

      // Save to backend (implement actual API call)
      const response = await fetch('/api/suppliers/pricelists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricelistPayload)
      })

      if (!response.ok) {
        throw new Error('Failed to save pricelist')
      }

      setProgress({ stage: 'saving', percentage: 80, message: 'Updating inventory...' })

      // Update inventory items if needed
      if (enableBulkOperations) {
        const inventoryPayload = {
          items: validationResult.processedItems.map(item => ({
            sku: item.sku,
            name: item.description,
            description: item.description,
            category: item.category,
            subcategory: item.brand,
            unitCost: item.unitPrice,
            currency: selectedSupplier.currency,
            supplierId: selectedSupplier.id,
            supplierName: selectedSupplier.name,
            supplierSku: item.supplierSku,
            tags: [item.brand, item.category]
          }))
        }

        await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inventoryPayload)
        })
      }

      setProgress({
        stage: 'complete',
        percentage: 100,
        message: 'Upload completed successfully!'
      })

      // Call completion handler
      await onComplete(validationResult)

      // Close dialog and reset
      setTimeout(() => {
        setOpen(false)
        resetState()
      }, 2000)

    } catch (error) {
      console.error('Save error:', error)
      setProgress({
        stage: 'error',
        percentage: 0,
        message: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }, [validationResult, selectedSupplier, file, enableBulkOperations, onComplete, setOpen, resetState])

  // Step navigation
  const canAdvanceToStep = useCallback((step: number): boolean => {
    switch (step) {
      case 2: return file !== null
      case 3: return selectedSupplier !== null && Object.keys(fieldMappings).length >= requiredFields.length
      case 4: return validationResult !== null
      default: return true
    }
  }, [file, selectedSupplier, fieldMappings, requiredFields, validationResult])

  const stepTitles = [
    'Upload File',
    'Select Supplier',
    'Map Fields',
    'Review & Validate',
    'Complete'
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import Pricelist
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Pricelist Upload Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {stepTitles.map((title, index) => {
            const stepNumber = index + 1
            const isActive = currentStep === stepNumber
            const isCompleted = currentStep > stepNumber
            const canAccess = canAdvanceToStep(stepNumber)

            return (
              <div key={stepNumber} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-medium
                  ${isActive ? 'bg-primary text-primary-foreground border-primary' : ''}
                  ${isCompleted ? 'bg-green-100 text-green-800 border-green-300' : ''}
                  ${!isActive && !isCompleted && canAccess ? 'border-muted-foreground/30 text-muted-foreground' : ''}
                  ${!canAccess ? 'border-muted-foreground/20 text-muted-foreground/50' : ''}
                `}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : stepNumber}
                </div>
                <div className="ml-2 text-sm">
                  <div className={`font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-800' : 'text-muted-foreground'}`}>
                    {title}
                  </div>
                </div>
                {index < stepTitles.length - 1 && (
                  <ArrowRight className="h-4 w-4 mx-4 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>

        {/* Progress Indicator */}
        {progress.stage !== 'idle' && progress.stage !== 'complete' && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{progress.message}</span>
              </div>
              <Progress value={progress.percentage} className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {progress.stage === 'error' && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {progress.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-auto">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Pricelist File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Upload your supplier pricelist</p>
                    <p className="text-sm text-muted-foreground">
                      Supports Excel (.xlsx, .xls) and CSV files up to {maxFileSize}MB
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {allowedFileTypes.map(type => (
                        <Badge key={type} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={allowedFileTypes.join(',')}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6"
                    disabled={progress.stage === 'uploading' || progress.stage === 'processing'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>

                {file && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(file.size / 1024)}KB • {rawData.length} data rows • {headers.length} columns
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Required Columns:</p>
                  <div className="flex flex-wrap gap-2">
                    {requiredFields.map(field => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Supplier Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Select Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supplier-select">Choose Supplier for this Pricelist</Label>
                      <Select
                        value={selectedSupplier?.id || ''}
                        onValueChange={(value) => {
                          const supplier = availableSuppliers.find(s => s.id === value)
                          setSelectedSupplier(supplier || null)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a supplier..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSuppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-medium">{supplier.name}</div>
                                  <div className="text-sm text-muted-foreground">{supplier.code}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={supplier.isActive ? "default" : "secondary"}>
                                    {supplier.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground">
                                    {supplier.performance.overallRating.toFixed(1)}★
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSupplier && (
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Supplier Details</h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Code:</span> {selectedSupplier.code}</div>
                                <div><span className="font-medium">Email:</span> {selectedSupplier.email}</div>
                                <div><span className="font-medium">Phone:</span> {selectedSupplier.phone || 'N/A'}</div>
                                <div><span className="font-medium">Currency:</span> {selectedSupplier.currency}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Performance & Terms</h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Lead Time:</span> {selectedSupplier.leadTimeDays} days</div>
                                <div><span className="font-medium">Payment Terms:</span> {selectedSupplier.paymentTerms.termsDays} days</div>
                                <div><span className="font-medium">Performance:</span> {selectedSupplier.performance.overallRating.toFixed(1)}/5.0</div>
                                <div><span className="font-medium">Total Orders:</span> {selectedSupplier.performance.totalOrders}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={!selectedSupplier}
                >
                  Continue to Field Mapping
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Map Data Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Field Mappings</h4>
                      {Object.entries(AdvancedSemanticMapper['FIELD_MAPPINGS']).map(([targetField, config]) => (
                        <div key={targetField} className="space-y-1">
                          <Label className="flex items-center gap-2">
                            {targetField.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            {config.required && <span className="text-red-500">*</span>}
                            {fieldMappings[targetField] && (
                              <Badge variant="secondary" className="text-xs">
                                Auto-mapped
                              </Badge>
                            )}
                          </Label>
                          <Select
                            value={fieldMappings[targetField] || ''}
                            onValueChange={(value) => {
                              setFieldMappings(prev => ({ ...prev, [targetField]: value }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- None --</SelectItem>
                              {headers.map(header => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium mb-4">Data Preview</h4>
                      <ScrollArea className="h-80 border rounded">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {headers.slice(0, 4).map(header => (
                                <TableHead key={header} className="text-xs font-medium">
                                  {header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rawData.slice(0, 10).map((row, i) => (
                              <TableRow key={i}>
                                {row.slice(0, 4).map((cell, j) => (
                                  <TableCell key={j} className="text-xs">
                                    {cell?.toString().slice(0, 30)}...
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleValidation}
                  disabled={!canAdvanceToStep(3)}
                >
                  Validate Data
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Validate */}
          {currentStep === 4 && validationResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">{validationResult.summary.validRows}</div>
                    <div className="text-xs text-muted-foreground">Valid Items</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-red-600">{validationResult.summary.errorRows}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{validationResult.summary.warningRows}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">{validationResult.summary.uniqueCategories}</div>
                    <div className="text-xs text-muted-foreground">Categories</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ${validationResult.summary.estimatedValue.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Est. Value</div>
                  </CardContent>
                </Card>
              </div>

              {/* Issues */}
              {validationResult.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Issues Found ({validationResult.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {validationResult.issues.map((issue, i) => (
                          <div key={i} className={`p-3 rounded border ${
                            issue.severity === 'error' ? 'border-red-200 bg-red-50' :
                            issue.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                            'border-blue-200 bg-blue-50'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  Row {issue.row}: {issue.field}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {issue.message}
                                </div>
                                {issue.suggestion && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    💡 {issue.suggestion}
                                  </div>
                                )}
                              </div>
                              <Badge variant={
                                issue.severity === 'error' ? 'destructive' :
                                issue.severity === 'warning' ? 'secondary' : 'default'
                              }>
                                {issue.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {validationResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {validationResult.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Processed Data Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult.processedItems.slice(0, 10).map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-xs">{item.description.slice(0, 40)}...</TableCell>
                            <TableCell className="text-xs">{item.brand}</TableCell>
                            <TableCell className="text-xs">{item.category}</TableCell>
                            <TableCell className="text-xs">${item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">{item.stockQuantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back to Mapping
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={validationResult.summary.errorRows > 0 || progress.stage === 'saving'}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Pricelist ({validationResult.summary.validRows} items)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PricelistUploadWizard