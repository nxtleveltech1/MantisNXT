"use client"

import React, { useState, useRef, useCallback, useMemo } from 'react'
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
import {
  Upload,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
  Brain,
  MapPin,
  Settings,
  Download
} from 'lucide-react'

// Enhanced types for advanced functionality
export interface SupplierDataRow {
  supplier_name: string
  brand: string
  category: string
  sku: string
  description: string
  price: number
  vat_rate: number
  stock_qty: number
  [key: string]: string | number | boolean | undefined
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  confidence: number
  isRequired: boolean
  transformation?: string
}

export interface SemanticMapping {
  mappings: FieldMapping[]
  confidence: number
  suggestions: string[]
}

export interface DataValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  cleanedData: SupplierDataRow[]
  summary: {
    total: number
    valid: number
    invalid: number
    duplicates: number
    emptyRows: number
  }
}

export interface ValidationError {
  row: number
  field: string
  value: unknown
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  row: number
  field: string
  value: unknown
  message: string
  suggestion?: string
}

export interface NextJsXlsxConverterProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDataProcessed: (result: DataValidationResult) => Promise<void> | void
  supplierFilter?: string
  requiredFields?: string[]
  allowedFileTypes?: string[]
  maxFileSize?: number // in MB
}

// Semantic field mapping engine
class SemanticMapper {
  private static requiredFields = [
    'supplier_name', 'brand', 'category', 'sku',
    'description', 'price', 'vat_rate', 'stock_qty'
  ]

  private static fieldPatterns: Record<string, string[]> = {
    supplier_name: [
      'supplier', 'vendor', 'company', 'manufacturer', 'provider',
      'supplier_name', 'vendor_name', 'company_name', 'mfg', 'brand_owner'
    ],
    brand: [
      'brand', 'make', 'manufacturer', 'label', 'trademark',
      'brand_name', 'product_brand', 'mfg_brand', 'brandname'
    ],
    category: [
      'category', 'type', 'class', 'group', 'segment', 'classification',
      'product_category', 'item_category', 'cat', 'product_type'
    ],
    sku: [
      'sku', 'item_code', 'product_code', 'part_number', 'item_id',
      'product_id', 'code', 'article_number', 'barcode', 'upc'
    ],
    description: [
      'description', 'product_description', 'item_description', 'name',
      'product_name', 'item_name', 'title', 'product_title', 'details'
    ],
    price: [
      'price', 'cost', 'unit_price', 'unit_cost', 'amount', 'value',
      'list_price', 'retail_price', 'selling_price', 'cost_price'
    ],
    vat_rate: [
      'vat', 'vat_rate', 'tax', 'tax_rate', 'gst', 'gst_rate',
      'sales_tax', 'value_added_tax', 'tax_percentage', 'vat_percent'
    ],
    stock_qty: [
      'stock', 'quantity', 'qty', 'inventory', 'available', 'on_hand',
      'stock_quantity', 'current_stock', 'in_stock', 'inventory_qty'
    ]
  }

  static generateMapping(headers: string[]): SemanticMapping {
    const mappings: FieldMapping[] = []
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

    for (const targetField of this.requiredFields) {
      const patterns = this.fieldPatterns[targetField]
      let bestMatch = { field: '', confidence: 0, index: -1 }

      normalizedHeaders.forEach((header, index) => {
        const confidence = this.calculateConfidence(header, patterns)
        if (confidence > bestMatch.confidence) {
          bestMatch = { field: headers[index], confidence, index }
        }
      })

      if (bestMatch.confidence > 0.3) {
        mappings.push({
          sourceField: bestMatch.field,
          targetField,
          confidence: bestMatch.confidence,
          isRequired: true
        })
      }
    }

    const overallConfidence = mappings.length / this.requiredFields.length
    const suggestions = this.generateSuggestions(mappings, headers)

    return { mappings, confidence: overallConfidence, suggestions }
  }

  private static calculateConfidence(header: string, patterns: string[]): number {
    const headerNorm = header.toLowerCase()

    // Exact match
    if (patterns.includes(headerNorm)) return 1.0

    // Partial match scoring
    let maxScore = 0
    for (const pattern of patterns) {
      const score = this.fuzzyMatch(headerNorm, pattern)
      maxScore = Math.max(maxScore, score)
    }

    return maxScore
  }

  private static fuzzyMatch(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0
    if (longer.includes(shorter)) return 0.8
    if (shorter.includes(longer)) return 0.7

    const editDistance = this.levenshteinDistance(str1, str2)
    return Math.max(0, (longer.length - editDistance) / longer.length)
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

  private static generateSuggestions(mappings: FieldMapping[], headers: string[]): string[] {
    const suggestions: string[] = []
    const mappedFields = new Set(mappings.map(m => m.targetField))

    for (const requiredField of this.requiredFields) {
      if (!mappedFields.has(requiredField)) {
        suggestions.push(`Missing mapping for required field: ${requiredField}`)
      }
    }

    const lowConfidenceMappings = mappings.filter(m => m.confidence < 0.7)
    if (lowConfidenceMappings.length > 0) {
      suggestions.push(`${lowConfidenceMappings.length} mappings have low confidence - please review`)
    }

    return suggestions
  }

  static sanitizeSupplierName(name: string): string {
    return name
      .trim()
      .replace(/[^\w\s&.-]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  static extractBrandFromDescription(description: string, knownBrands: string[]): string {
    const desc = description.toLowerCase()
    for (const brand of knownBrands) {
      if (desc.includes(brand.toLowerCase())) {
        return brand
      }
    }

    // Extract potential brand from beginning of description
    const words = description.split(' ')
    if (words.length > 0 && words[0].length > 2) {
      return words[0]
    }

    return 'Unknown'
  }

  static categorizeProduct(description: string, sku: string): string {
    const text = (description + ' ' + sku).toLowerCase()

    const categories = {
      'Electronics': ['electronic', 'digital', 'circuit', 'led', 'lcd', 'battery'],
      'Hardware': ['bolt', 'screw', 'nail', 'tool', 'metal', 'steel'],
      'Software': ['software', 'license', 'app', 'program'],
      'Consumables': ['paper', 'ink', 'toner', 'cartridge', 'supply'],
      'Office': ['office', 'desk', 'chair', 'stationery', 'pen'],
      'Industrial': ['industrial', 'machine', 'equipment', 'motor']
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category
      }
    }

    return 'General'
  }
}

const NextJsXlsxConverter: React.FC<NextJsXlsxConverterProps> = ({
  open,
  onOpenChange,
  onDataProcessed,
  supplierFilter,
  requiredFields = [
    'supplier_name', 'brand', 'category', 'sku',
    'description', 'price', 'vat_rate', 'stock_qty'
  ],
  allowedFileTypes = ['.xlsx', '.xls', '.csv'],
  maxFileSize = 10
}) => {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? !!open : localOpen
  const setOpen = useCallback((value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value)
    } else {
      setLocalOpen(value)
    }
  }, [onOpenChange])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rawData, setRawData] = useState<unknown[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [semanticMapping, setSemanticMapping] = useState<SemanticMapping | null>(null)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({})
  const [validationResult, setValidationResult] = useState<DataValidationResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState('upload')

  const resetState = useCallback(() => {
    setFile(null)
    setRawData([])
    setHeaders([])
    setSemanticMapping(null)
    setManualMappings({})
    setValidationResult(null)
    setProcessing(false)
    setProcessingStep('')
    setProgress(0)
    setActiveTab('upload')
  }, [])

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!uploadedFile) return

    // Validate file size
    if (uploadedFile.size > maxFileSize * 1024 * 1024) {
      alert(`File size exceeds ${maxFileSize}MB limit`)
      return
    }

    // Validate file type
    const fileExt = uploadedFile.name.toLowerCase().split('.').pop()
    if (!allowedFileTypes.some(type => type.includes(fileExt || ''))) {
      alert(`File type not supported. Allowed types: ${allowedFileTypes.join(', ')}`)
      return
    }

    setProcessing(true)
    setProcessingStep('Reading file...')
    setProgress(20)

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[worksheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (data.length < 2) {
        throw new Error('File must contain at least a header row and one data row')
      }

      setProcessingStep('Analyzing headers...')
      setProgress(40)

      const fileHeaders = data[0] as string[]
      const fileData = data.slice(1) as unknown[][]

      setFile(uploadedFile)
      setHeaders(fileHeaders)
      setRawData(fileData)

      setProcessingStep('Generating semantic mapping...')
      setProgress(60)

      // Generate semantic mapping
      const mapping = SemanticMapper.generateMapping(fileHeaders)
      setSemanticMapping(mapping)

      // Initialize manual mappings with semantic suggestions
      const initialMappings: Record<string, string> = {}
      mapping.mappings.forEach(m => {
        initialMappings[m.targetField] = m.sourceField
      })
      setManualMappings(initialMappings)

      setProcessingStep('Complete!')
      setProgress(100)
      setActiveTab('mapping')

    } catch (error) {
      console.error('File processing error:', error)
      alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setProcessing(false)
      setTimeout(() => {
        setProcessingStep('')
        setProgress(0)
      }, 1000)
    }
  }, [maxFileSize, allowedFileTypes])

  const validateAndCleanData = useCallback((): DataValidationResult => {
    if (!rawData.length || !headers.length) {
      return {
        isValid: false,
        errors: [{ row: 0, field: 'file', value: '', message: 'No data to validate', severity: 'error' }],
        warnings: [],
        cleanedData: [],
        summary: { total: 0, valid: 0, invalid: 0, duplicates: 0, emptyRows: 0 }
      }
    }

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const cleanedData: SupplierDataRow[] = []
    let duplicates = 0
    let emptyRows = 0
    const seenSkus = new Set<string>()

    rawData.forEach((row, index) => {
      const rowNum = index + 2 // +2 because index is 0-based and we have header row

      // Check for empty rows
      if (row.every(cell => !cell || cell.toString().trim() === '')) {
        emptyRows++
        return
      }

      const dataRow: SupplierDataRow = {
        supplier_name: '',
        brand: '',
        category: '',
        sku: '',
        description: '',
        price: 0,
        vat_rate: 0,
        stock_qty: 0
      }

      // Map fields based on manual mappings
      for (const [targetField, sourceField] of Object.entries(manualMappings)) {
        if (sourceField && headers.includes(sourceField)) {
          const colIndex = headers.indexOf(sourceField)
          const cellValue = row[colIndex]

          if (cellValue !== undefined && cellValue !== null) {
            switch (targetField) {
              case 'supplier_name':
                dataRow.supplier_name = SemanticMapper.sanitizeSupplierName(cellValue.toString())
                break
              case 'brand':
                dataRow.brand = cellValue.toString().trim()
                break
              case 'category':
                dataRow.category = cellValue.toString().trim() ||
                  SemanticMapper.categorizeProduct(dataRow.description, dataRow.sku)
                break
              case 'sku':
                dataRow.sku = cellValue.toString().trim().toUpperCase()
                break
              case 'description':
                dataRow.description = cellValue.toString().trim()
                break
              case 'price':
                const price = parseFloat(cellValue.toString().replace(/[^\d.-]/g, ''))
                dataRow.price = isNaN(price) ? 0 : price
                if (isNaN(price) || price < 0) {
                  errors.push({
                    row: rowNum,
                    field: 'price',
                    value: cellValue,
                    message: 'Invalid price value',
                    severity: 'error'
                  })
                }
                break
              case 'vat_rate':
                const vatRate = parseFloat(cellValue.toString().replace(/[^\d.-]/g, ''))
                dataRow.vat_rate = isNaN(vatRate) ? 0 : vatRate
                if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
                  warnings.push({
                    row: rowNum,
                    field: 'vat_rate',
                    value: cellValue,
                    message: 'VAT rate should be between 0 and 100',
                    suggestion: 'Check if this is a percentage or decimal value'
                  })
                }
                break
              case 'stock_qty':
                const stockQty = parseInt(cellValue.toString().replace(/[^\d]/g, ''))
                dataRow.stock_qty = isNaN(stockQty) ? 0 : stockQty
                if (isNaN(stockQty) || stockQty < 0) {
                  warnings.push({
                    row: rowNum,
                    field: 'stock_qty',
                    value: cellValue,
                    message: 'Invalid stock quantity',
                    suggestion: 'Should be a positive integer'
                  })
                }
                break
            }
          }
        }
      }

      // Validate required fields
      for (const field of requiredFields) {
        if (!dataRow[field] || dataRow[field].toString().trim() === '') {
          errors.push({
            row: rowNum,
            field,
            value: dataRow[field],
            message: `Required field '${field}' is missing or empty`,
            severity: 'error'
          })
        }
      }

      // Check for duplicate SKUs
      if (dataRow.sku && seenSkus.has(dataRow.sku)) {
        duplicates++
        warnings.push({
          row: rowNum,
          field: 'sku',
          value: dataRow.sku,
          message: 'Duplicate SKU found',
          suggestion: 'Consider making SKUs unique or handling duplicates'
        })
      } else if (dataRow.sku) {
        seenSkus.add(dataRow.sku)
      }

      // Apply supplier filter if provided
      if (supplierFilter && dataRow.supplier_name.toLowerCase() !== supplierFilter.toLowerCase()) {
        return // Skip this row
      }

      cleanedData.push(dataRow)
    })

    const totalRows = rawData.length
    const validRows = cleanedData.length
    const invalidRows = totalRows - validRows - emptyRows

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedData,
      summary: {
        total: totalRows,
        valid: validRows,
        invalid: invalidRows,
        duplicates,
        emptyRows
      }
    }
  }, [rawData, headers, manualMappings, requiredFields, supplierFilter])

  const processData = useCallback(async () => {
    setProcessing(true)
    setProcessingStep('Validating data...')
    setProgress(30)

    try {
      const result = validateAndCleanData()
      setValidationResult(result)

      setProcessingStep('Processing complete!')
      setProgress(100)
      setActiveTab('preview')

      setTimeout(() => {
        setProcessingStep('')
        setProgress(0)
        setProcessing(false)
      }, 1000)

    } catch (error) {
      console.error('Data processing error:', error)
      alert(`Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setProcessing(false)
    }
  }, [validateAndCleanData])

  const handleApply = useCallback(async () => {
    if (!validationResult) return

    try {
      await onDataProcessed(validationResult)
      setOpen(false)
      resetState()
    } catch (error) {
      console.error('Apply error:', error)
      alert(`Error applying data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [validationResult, onDataProcessed, setOpen, resetState])

  const mappingProgress = useMemo(() => {
    if (!semanticMapping) return 0
    const totalRequired = requiredFields.length
    const mapped = Object.values(manualMappings).filter(Boolean).length
    return (mapped / totalRequired) * 100
  }, [semanticMapping, manualMappings, requiredFields])

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Brain className="h-4 w-4 mr-2" />
          Smart Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Advanced XLSX Converter with Semantic Mapping
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="mapping" disabled={!headers.length}>Mapping</TabsTrigger>
            <TabsTrigger value="preview" disabled={!validationResult}>Preview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {processing && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">{processingStep}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <TabsContent value="upload" className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  File Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Upload your supplier data file</p>
                    <p className="text-sm text-muted-foreground">
                      Supports Excel (.xlsx, .xls) and CSV files up to {maxFileSize}MB
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={allowedFileTypes.join(',')}
                    onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                    disabled={processing}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>

                {file && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File loaded: {file.name} ({Math.round(file.size / 1024)}KB, {rawData.length} rows)
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping" className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Smart Field Mapping
                    <Badge variant="outline" className="ml-auto">
                      {Math.round(mappingProgress)}% Complete
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {semanticMapping && (
                      <Alert className="mb-4">
                        <Brain className="h-4 w-4" />
                        <AlertDescription>
                          AI Confidence: {Math.round(semanticMapping.confidence * 100)}%
                          {semanticMapping.suggestions.length > 0 && (
                            <div className="mt-2 text-xs">
                              Suggestions: {semanticMapping.suggestions.join(', ')}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {requiredFields.map(field => (
                      <div key={field} className="space-y-1">
                        <Label className="text-sm font-medium">
                          {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Select
                          value={manualMappings[field] || ''}
                          onValueChange={(value) =>
                            setManualMappings(prev => ({ ...prev, [field]: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None --</SelectItem>
                            {headers.map(header => (
                              <SelectItem key={header} value={header}>
                                {header}
                                {semanticMapping?.mappings.find(m =>
                                  m.sourceField === header && m.targetField === field
                                ) && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    AI: {Math.round(
                                      semanticMapping.mappings.find(m =>
                                        m.sourceField === header && m.targetField === field
                                      )?.confidence! * 100
                                    )}%
                                  </Badge>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    <Button
                      onClick={processData}
                      className="w-full mt-4"
                      disabled={Object.values(manualMappings).filter(Boolean).length < requiredFields.length || processing}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Process Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.slice(0, 4).map(header => (
                            <TableHead key={header} className="text-xs">{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rawData.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {row.slice(0, 4).map((cell, j) => (
                              <TableCell key={j} className="text-xs">
                                {cell?.toString().slice(0, 20)}...
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1">
            {validationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold">{validationResult.summary.total}</div>
                      <div className="text-xs text-muted-foreground">Total Rows</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-green-600">{validationResult.summary.valid}</div>
                      <div className="text-xs text-muted-foreground">Valid</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-red-600">{validationResult.summary.invalid}</div>
                      <div className="text-xs text-muted-foreground">Invalid</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{validationResult.summary.duplicates}</div>
                      <div className="text-xs text-muted-foreground">Duplicates</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-gray-600">{validationResult.summary.emptyRows}</div>
                      <div className="text-xs text-muted-foreground">Empty</div>
                    </CardContent>
                  </Card>
                </div>

                {validationResult.errors.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-red-800">Validation Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {validationResult.errors.slice(0, 20).map((error, i) => (
                            <div key={i} className="text-sm text-red-600">
                              Row {error.row}: {error.field} - {error.message}
                            </div>
                          ))}
                          {validationResult.errors.length > 20 && (
                            <div className="text-xs text-muted-foreground">
                              ...and {validationResult.errors.length - 20} more errors
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {validationResult.warnings.length > 0 && (
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-yellow-800">Warnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {validationResult.warnings.slice(0, 10).map((warning, i) => (
                            <div key={i} className="text-sm text-yellow-600">
                              Row {warning.row}: {warning.field} - {warning.message}
                              {warning.suggestion && (
                                <div className="text-xs text-muted-foreground ml-2">
                                  💡 {warning.suggestion}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Processed Data Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResult.cleanedData.slice(0, 20).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{row.supplier_name}</TableCell>
                              <TableCell className="text-xs">{row.brand}</TableCell>
                              <TableCell className="text-xs font-mono">{row.sku}</TableCell>
                              <TableCell className="text-xs">{row.description.slice(0, 30)}...</TableCell>
                              <TableCell className="text-xs">${row.price.toFixed(2)}</TableCell>
                              <TableCell className="text-xs">{row.stock_qty}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Supplier Filter</Label>
                  <Input
                    placeholder="Filter by supplier name (optional)"
                    value={supplierFilter || ''}
                    onChange={(e) => {
                      // This would need to be passed up to parent component
                    }}
                  />
                </div>

                <div>
                  <Label>Max File Size (MB)</Label>
                  <Input
                    type="number"
                    value={maxFileSize}
                    onChange={(e) => {
                      // This would need to be passed up to parent component
                    }}
                  />
                </div>

                <div>
                  <Label>Required Fields</Label>
                  <Textarea
                    value={requiredFields.join('\n')}
                    onChange={(e) => {
                      // This would need to be passed up to parent component
                    }}
                    placeholder="One field per line"
                    rows={8}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetState}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            {validationResult && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!validationResult || !validationResult.isValid || validationResult.cleanedData.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Apply ({validationResult?.cleanedData.length || 0} rows)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NextJsXlsxConverter
