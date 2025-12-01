// Comprehensive Price List Upload Processing Types

export interface PriceListUpload {
  id: string;
  supplierId: string;
  supplierName: string;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;

  // Processing status
  status: 'pending' | 'processing' | 'validated' | 'imported' | 'failed' | 'cancelled';
  validationStatus: 'pending' | 'passed' | 'failed' | 'warnings';

  // Processing results
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  skippedRows: number;

  // Validation results
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];

  // Processing metadata
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  processingDuration?: number; // milliseconds

  // Upload metadata
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Preview data (first 10 rows)
  previewData?: PriceListRowExtended[];

  // Configuration
  importConfig: ImportConfiguration;

  notes?: string;
}

export interface ImportConfiguration {
  // Column mapping
  columnMapping: {
    sku?: string;
    productName?: string;
    description?: string;
    category?: string;
    brand?: string;
    supplierPartNumber?: string;
    unitPrice?: string;
    listPrice?: string;
    wholesalePrice?: string;
    retailPrice?: string;
    currency?: string;
    unit?: string;
    minimumOrderQuantity?: string;
    leadTime?: string;
    availability?: string;
    weight?: string;
    dimensions?: string;
    barcode?: string;
    [key: string]: string | undefined;
  };

  // Processing options
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    requireSKU: boolean;
    requirePrice: boolean;
    validateProducts: boolean;
    autoCreateCategories: boolean;
    defaultCurrency: string;
    priceColumn: 'unitPrice' | 'listPrice' | 'wholesalePrice' | 'retailPrice';
  };

  // Data transformation rules
  transformRules: {
    trimWhitespace: boolean;
    convertToUpperCase: string[]; // field names to convert
    convertToLowerCase: string[]; // field names to convert
    removeSpecialChars: string[]; // field names to clean
    currencyConversion?: {
      fromCurrency: string;
      toCurrency: string;
      exchangeRate: number;
    };
  };
}

export interface PriceListRowExtended {
  rowIndex: number;
  originalData: Record<string, unknown>;
  mappedData: MappedProductData;
  validationStatus: 'valid' | 'invalid' | 'warning';
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
  importStatus?: 'pending' | 'imported' | 'skipped' | 'failed';
  importError?: string;
}

export interface MappedProductData {
  sku?: string;
  supplierPartNumber?: string;
  productName?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  unitPrice?: number;
  listPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  currency?: string;
  unit?: string;
  minimumOrderQuantity?: number;
  leadTime?: number;
  availability?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  barcode?: string;
  status?: 'active' | 'inactive' | 'discontinued';
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  value: unknown;
  errorType:
    | 'missing_required'
    | 'invalid_format'
    | 'invalid_value'
    | 'duplicate'
    | 'constraint_violation';
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  rowIndex: number;
  field: string;
  value: unknown;
  warningType: 'missing_optional' | 'unusual_value' | 'format_suggestion' | 'duplicate_suggestion';
  message: string;
  severity: 'warning';
  suggestion?: string;
}

export interface ImportSummary {
  uploadId: string;
  supplierId: string;
  fileName: string;

  // Processing stats
  totalProcessingTime: number;
  rowsProcessed: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsFailed: number;

  // Validation stats
  validationErrors: number;
  validationWarnings: number;

  // Product stats
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;

  // Financial impact
  totalValue: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };

  // Quality metrics
  dataQualityScore: number; // 0-100
  completenessScore: number; // 0-100

  // Recommendations
  recommendations: string[];

  completedAt: Date;
}

export interface FileFormatDetection {
  format: 'csv' | 'excel' | 'json' | 'unknown';
  mimeType: string;
  encoding?: string;
  delimiter?: string; // for CSV
  sheetNames?: string[]; // for Excel
  hasHeaders: boolean;
  totalRows: number;
  totalColumns: number;
  sampleData: Record<string, unknown>[];
  detectedColumns: DetectedColumn[];
}

export interface DetectedColumn {
  index: number;
  name: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'mixed';
  sampleValues: unknown[];
  nullCount: number;
  uniqueCount: number;
  suggestedMapping?: keyof ImportConfiguration['columnMapping'];
  confidence?: number; // 0-1
}

export interface BulkImportJob {
  id: string;
  uploads: string[]; // upload IDs
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  // Job configuration
  config: {
    batchSize: number;
    parallelProcessing: boolean;
    validateBeforeImport: boolean;
    stopOnError: boolean;
  };

  // Progress tracking
  progress: {
    uploadsProcessed: number;
    totalUploads: number;
    currentUpload?: string;
    currentPhase: 'validation' | 'transformation' | 'import' | 'cleanup';
    percentage: number;
  };

  // Results
  results: {
    successful: string[];
    failed: string[];
    totalRowsProcessed: number;
    totalRowsImported: number;
  };

  // Metadata
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

// Supplier product catalog types
export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierPartNumber: string;
  sku?: string;

  // Product details
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;

  // Pricing
  unitPrice: number;
  listPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  currency: string;
  lastPriceUpdate: Date;
  priceHistory: PriceHistoryEntry[];

  // Availability
  availability: 'available' | 'limited' | 'discontinued' | 'seasonal';
  minimumOrderQuantity?: number;
  leadTime?: number;
  stockLevel?: number;

  // Physical properties
  unit: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };

  // Identifiers
  barcode?: string;
  manufacturerPartNumber?: string;

  // Status
  status: 'active' | 'inactive' | 'pending_approval';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastImportedAt?: Date;
  importSource?: string; // upload ID

  // Quality flags
  qualityFlags: {
    hasImage: boolean;
    hasDescription: boolean;
    hasSpecifications: boolean;
    priceVerified: boolean;
  };
}

export interface PriceHistoryEntry {
  price: number;
  currency: string;
  effectiveDate: Date;
  source: 'manual' | 'import' | 'api';
  changeReason?: string;
  changedBy?: string;
}

// API request/response types
export interface UploadRequest {
  supplierId: string;
  config?: Partial<ImportConfiguration>;
}

export interface ProcessingStatusResponse {
  uploadId: string;
  status: PriceListUpload['status'];
  progress: {
    phase: string;
    percentage: number;
    currentRow?: number;
    totalRows?: number;
    eta?: number; // seconds
  };
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warningRows: number;
  };
  recommendations: string[];
}

// Processing events for real-time updates
export interface ProcessingEvent {
  uploadId: string;
  type: 'progress' | 'validation_complete' | 'import_complete' | 'error';
  data: unknown;
  timestamp: Date;
}

// Batch operation types
export interface BatchProcessingOptions {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  validateOnly: boolean;
  dryRun: boolean;
}
