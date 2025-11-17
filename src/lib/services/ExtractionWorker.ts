/**
 * ExtractionWorker - Executes pricelist extraction jobs with intelligent column detection
 *
 * Ported from working HTML tool (K:\00Project\PriceData\multi-supplier-app.html)
 *
 * Key Features:
 * - Auto-detects column headers with fuzzy matching
 * - Handles Excel (xlsx/xls/xlsm), CSV with auto-delimiter, and JSON
 * - Intelligent SKU/price/brand extraction
 * - Chunked processing for large files
 * - Progress events and robust error handling
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse';
import { query } from '@/lib/database/unified-connection';
import { AppError, ErrorCode } from '@/lib/errors/AppError';
import { extractionCache } from './ExtractionCache';
import { applyPricelistRulesToExcel } from '@/lib/cmm/supplier-rules-engine'
import type {
  ExtractionJob,
  ExtractedProduct,
  ExtractionResult,
  ExtractionStats,
  ValidationStatus,
  ValidationIssue,
  ExtractionConfig,
  FileUpload,
} from '@/lib/types/pricelist-extraction';
import { ExtractedProductSchema } from '@/lib/types/pricelist-extraction';

/**
 * Column aliases for intelligent column detection
 * Ported from working HTML tool
 */
const COLUMN_ALIASES = {
  sku: [
    'sku',
    'stockcode',
    'itemcode',
    'productcode',
    'productid',
    'part',
    'partno',
    'itemno',
    'model',
    'catalog',
    'catalogue',
    'material',
  ],
  barcode: ['barcode', 'ean', 'upc', 'gtin'],
  description: [
    'description',
    'product',
    'itemdescription',
    'longdescription',
    'details',
    'desc',
    'name',
  ],
  brand: ['brand', 'manufacturer', 'manuf', 'suppliername', 'vendor', 'make'],
  seriesRange: [
    'series',
    'seriesrange',
    'range',
    'productseries',
    'productline',
    'line',
    'modelrange',
    'modelseries',
    'productrange',
  ],
  dealer: [
    'dealer',
    'costprice',
    'nett',
    'netprice',
    'buy',
    'purchase',
    'wholesale',
    'unitcost',
    'baseprice',
    'import',
    'landed',
    'selling',
    'retail',
    'rrp',
    'listprice',
    'unitprice',
    'sellprice',
    'priceincl',
    'priceinc',
    'price',
    'cost',
  ],
  priceEx: ['priceex', 'exvat', 'exclusive', 'priceexc', 'excl'],
  priceInc: ['priceinc', 'inclvat', 'inclusive', 'grossprice', 'incl'],
  vatAmount: ['vatamount', 'taxvalue', 'vat', 'tax'],
  stockQty: [
    'quantity',
    'qty',
    'stockqty',
    'stockonhand',
    'qtyavailable',
    'qtyavail',
    'available',
    'balance',
    'stock',
  ],
  supStock: ['supsoh', 'supplierstock'],
  nxtStock: ['nxt', 'next', 'eta'],
  uom: ['uom', 'unit', 'unitofmeasure', 'packsize'],
};

/**
 * Column mapping entry
 */
interface ColumnMapping {
  field: string;
  index: number;
  header: string;
}

/**
 * Header detection result
 */
interface HeaderInfo {
  rowIndex: number;
  headers: unknown[];
}

/**
 * Worker events
 */
export interface WorkerEvents {
  progress: (progress: number) => void;
  status: (message: string) => void;
  warning: (message: string) => void;
  error: (error: Error) => void;
}

const CHUNK_SIZE = 100; // Process 100 rows at a time
const PROGRESS_INTERVAL = 100; // Emit progress every 100 rows
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Extraction worker service with performance optimizations
 */
export class ExtractionWorker extends EventEmitter {
  private cache = extractionCache;
  private cancelled: boolean = false;
  private currentJobId: string | null = null;
  private lastProgressEmit: number = 0;

  constructor() {
    super();
  }

  /**
   * Execute extraction job
   */
  async execute(job: ExtractionJob): Promise<ExtractionResult> {
    this.currentJobId = job.job_id;
    this.cancelled = false;
    this.lastProgressEmit = 0;

    const startTime = Date.now();

    try {
      // Check cache first
      const cachedResult = await this.cache.get(job.job_id);
      if (cachedResult) {
        this.emit('status', 'Using cached results');
        this.emit('progress', 100);
        return cachedResult;
      }

      // Load file metadata
      this.emitStatus('Loading file metadata', 5);
      const fileUpload = await this.getFileUpload(job.upload_id);

      // Validate file size
      const fileStats = await fs.stat(fileUpload.storage_path);
      if (fileStats.size > MAX_FILE_SIZE) {
        throw new AppError(
          ErrorCode.FILE_TOO_LARGE,
          `File size ${(fileStats.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          400
        );
      }

      let rawData: Array<Record<string, unknown>> = []
      this.emitStatus('Parsing file', 10);
      if (fileUpload.file_type === 'xlsx' && job.config && job.config['use_rules_engine'] !== false) {
        const ruled = await applyPricelistRulesToExcel(fileUpload.storage_path, fileUpload.supplier_id)
        if (ruled && ruled.length > 0) {
          rawData = ruled
        } else {
          rawData = await this.parseFile(fileUpload.storage_path, fileUpload.file_type, job.config)
        }
      } else {
        rawData = await this.parseFile(fileUpload.storage_path, fileUpload.file_type, job.config)
      }

      this.emitStatus('Extracting products', 30);
      const products = await this.extractProductsChunked(rawData, job.config);

      // Validate products
      this.emitStatus('Validating products', 70);
      const validatedProducts = await this.validateProducts(products, job.config.supplier_id);

      // Calculate statistics
      this.emitStatus('Calculating statistics', 85);
      const stats = this.calculateStats(validatedProducts);
      stats.processing_time_ms = Date.now() - startTime;

      // Prepare result
      const result: ExtractionResult = {
        job_id: job.job_id,
        upload_id: job.upload_id,
        products: validatedProducts,
        stats,
        errors: [],
        warnings: this.collectWarnings(validatedProducts),
        extracted_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Cache result
      this.emitStatus('Caching results', 95);
      await this.cache.set(job.job_id, result);

      // Store result reference in database
      await query(
        `UPDATE spp.extraction_jobs
         SET result_cache_key = $1, updated_at = NOW()
         WHERE job_id = $2`,
        [job.job_id, job.job_id]
      );

      this.emitStatus('Extraction completed', 100);

      return result;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    } finally {
      this.currentJobId = null;
    }
  }

  /**
   * Cancel current extraction
   */
  cancel(): void {
    this.cancelled = true;
    this.emit('status', 'Extraction cancelled');
  }

  /**
   * Get file upload metadata
   */
  private async getFileUpload(uploadId: string): Promise<FileUpload> {
    const result = await query<unknown>('SELECT * FROM spp.file_uploads WHERE upload_id = $1', [
      uploadId,
    ]);

    if (result.rows.length === 0) {
      throw new AppError(ErrorCode.FILE_NOT_FOUND, `File upload ${uploadId} not found`, 404);
    }

    return result.rows[0] as FileUpload;
  }

  /**
   * Parse file based on type (with chunked reading for large files)
   */
  private async parseFile(
    filePath: string,
    fileType: string,
    config: ExtractionConfig
  ): Promise<Array<Record<string, unknown>>> {
    this.checkCancellation();

    switch (fileType) {
      case 'csv':
        return await this.parseCSVStreaming(filePath, config);
      case 'xlsx':
      case 'xls':
        return await this.parseExcel(filePath, config);
      case 'json': {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          throw new AppError(
            ErrorCode.FILE_TYPE_NOT_SUPPORTED,
            'JSON pricelist must be an array of objects',
            400
          );
        }
        return parsed.map(item => item ?? {}) as Array<Record<string, unknown>>;
      }
      default:
        throw new AppError(
          ErrorCode.FILE_TYPE_NOT_SUPPORTED,
          `File type ${fileType} is not supported`,
          400
        );
    }
  }

  /**
   * Parse CSV file with streaming and auto-delimiter detection
   * Auto-detects delimiter by analyzing first 1KB of file
   */
  private async parseCSVStreaming(
    filePath: string,
    config: ExtractionConfig
  ): Promise<Record<string, unknown>[]> {
    // Auto-detect delimiter if not specified
    let delimiter = config.delimiter;
    if (!delimiter) {
      const buffer = Buffer.alloc(1024);
      const fd = await fs.open(filePath, 'r');
      await fd.read(buffer, 0, 1024, 0);
      await fd.close();

      const sample = buffer.toString('utf-8');
      const commaCount = (sample.match(/,/g) || []).length;
      const semicolonCount = (sample.match(/;/g) || []).length;
      const tabCount = (sample.match(/\t/g) || []).length;

      if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
      } else if (semicolonCount > commaCount) {
        delimiter = ';';
      } else {
        delimiter = ',';
      }

      this.emit('status', `Auto-detected CSV delimiter: ${delimiter === '\t' ? 'TAB' : delimiter}`);
    }

    return new Promise((resolve, reject) => {
      const rows: Record<string, unknown>[] = [];
      const stream = createReadStream(filePath);

      const parser = parse({
        delimiter,
        columns: true,
        skip_empty_lines: true,
        skip_records_with_error: true,
        from_line: (config.skip_rows || 0) + 1,
        encoding: config.encoding || 'utf-8',
        relax_column_count: true,
        trim: true,
      });

      let rowCount = 0;

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          if (this.cancelled) {
            stream.destroy();
            parser.destroy();
            reject(new Error('Parsing cancelled'));
            return;
          }

          rows.push(record as Record<string, unknown>);
          rowCount++;

          // Emit progress for large files
          if (rowCount % 500 === 0) {
            this.emit('status', `Parsed ${rowCount} rows`);
          }
        }
      });

      parser.on('error', err => {
        stream.destroy();
        reject(new AppError(ErrorCode.EXTRACTION_FAILED, `CSV parsing error: ${err.message}`, 400));
      });

      parser.on('end', () => {
        this.emit('status', `Parsed ${rowCount} rows total`);
        resolve(rows);
      });

      stream.pipe(parser);
    });
  }

  /**
   * Parse Excel file (chunked for large files)
   */
  private async parseExcel(
    filePath: string,
    config: ExtractionConfig
  ): Promise<Record<string, unknown>[]> {
    const buffer = await fs.readFile(filePath);

    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    const sheetName = config.sheet_name || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new AppError(
        ErrorCode.EXTRACTION_FAILED,
        `Sheet "${sheetName}" not found in Excel file`,
        400
      );
    }

    // Convert to JSON with efficient options
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: false, // Format values as strings
    });

    // Skip header rows if configured
    const skipRows = config.skip_rows || 0;
    const dataRows = jsonData.slice(skipRows);

    // If first row contains headers, use them as column names
    if (dataRows.length > 0 && config.auto_detect_columns) {
      const headers = dataRows[0] as string[];
      const data = dataRows.slice(1);

      return data.map((row, index) => {
        if (index % 1000 === 0 && index > 0) {
          this.emit('status', `Processing Excel row ${index}`);
        }

        const obj: Record<string, unknown> = {};
        (row as unknown[]).forEach((value, colIndex) => {
          if (headers[colIndex]) {
            obj[headers[colIndex]] = value;
          }
        });
        return obj;
      });
    }

    return dataRows;
  }

  /**
   * Normalize header value for matching (lowercase, remove special chars)
   */
  private normalizeHeaderValue(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Check if normalized key matches any alias
   */
  private columnMatches(normalizedKey: string, aliases: string[]): boolean {
    if (!normalizedKey) return false;
    return aliases.some(alias => normalizedKey.includes(alias));
  }

  /**
   * Detect header row intelligently
   * Scans first 80 rows to find row with SKU + (Description OR Price)
   */
  private detectHeaderRow(rows: unknown[][]): HeaderInfo | null {
    for (let i = 0; i < Math.min(rows.length, 80); i++) {
      const row = rows[i];
      if (!row) continue;

      const normalized = row.map(cell => this.normalizeHeaderValue(cell));
      const nonEmpty = normalized.filter(Boolean);

      if (nonEmpty.length < 2) continue;

      const hasSku = nonEmpty.some(
        value => this.columnMatches(value, COLUMN_ALIASES.sku) || value.includes('model')
      );
      const hasDesc = nonEmpty.some(value => this.columnMatches(value, COLUMN_ALIASES.description));
      const hasPrice = nonEmpty.some(
        value =>
          this.columnMatches(value, COLUMN_ALIASES.dealer) ||
          value.includes('retail') ||
          value.includes('price')
      );

      if ((hasSku && hasDesc) || (hasSku && hasPrice) || nonEmpty.length >= 3) {
        return { rowIndex: i, headers: row };
      }
    }

    return null;
  }

  /**
   * Build column map from headers using intelligent matching
   * Maps detected columns to standard field names
   */
  private buildColumnMap(headers: unknown[]): ColumnMapping[] {
    const map: ColumnMapping[] = [];

    headers.forEach((header, index) => {
      const normalized = this.normalizeHeaderValue(header);
      if (!normalized) return;

      // SKU detection
      if (this.columnMatches(normalized, COLUMN_ALIASES.sku) || normalized.includes('model')) {
        this.addColumnMapping(map, 'sku', index, header);
        return;
      }

      // Barcode
      if (this.columnMatches(normalized, COLUMN_ALIASES.barcode)) {
        this.addColumnMapping(map, 'barcode', index, header);
        return;
      }

      // Description (includes 'name')
      if (this.columnMatches(normalized, COLUMN_ALIASES.description)) {
        this.addColumnMapping(map, 'description', index, header);
        return;
      }

      // Brand
      if (this.columnMatches(normalized, COLUMN_ALIASES.brand)) {
        this.addColumnMapping(map, 'brand', index, header);
        return;
      }

      // Series/Range
      if (this.columnMatches(normalized, COLUMN_ALIASES.seriesRange)) {
        this.addColumnMapping(map, 'seriesRange', index, header);
        return;
      }

      // Price (dealer cost) - most common
      if (this.columnMatches(normalized, COLUMN_ALIASES.dealer)) {
        this.addColumnMapping(map, 'price', index, header);
        return;
      }

      // Price Ex VAT
      if (this.columnMatches(normalized, COLUMN_ALIASES.priceEx)) {
        this.addColumnMapping(map, 'priceExVat', index, header);
        return;
      }

      // Price Inc VAT
      if (this.columnMatches(normalized, COLUMN_ALIASES.priceInc)) {
        this.addColumnMapping(map, 'priceIncVat', index, header);
        return;
      }

      // VAT Amount
      if (this.columnMatches(normalized, COLUMN_ALIASES.vatAmount)) {
        this.addColumnMapping(map, 'vatAmount', index, header);
        return;
      }

      // UOM
      if (this.columnMatches(normalized, COLUMN_ALIASES.uom)) {
        this.addColumnMapping(map, 'uom', index, header);
        return;
      }

      // Stock quantity
      if (this.columnMatches(normalized, COLUMN_ALIASES.stockQty)) {
        this.addColumnMapping(map, 'stock', index, header);
        return;
      }
    });

    // Fallback: if no SKU column detected, use first column
    if (!map.some(entry => entry.field === 'sku') && headers.length > 0) {
      this.addColumnMapping(map, 'sku', 0, headers[0] || 'Column 1');
    }

    // Fallback: if no description column, use second column
    if (!map.some(entry => entry.field === 'description') && headers.length > 1) {
      this.addColumnMapping(map, 'description', 1, headers[1] || 'Column 2');
    }

    return map;
  }

  /**
   * Add column mapping entry
   */
  private addColumnMapping(
    map: ColumnMapping[],
    field: string,
    index: number,
    header: string
  ): void {
    // Don't add duplicates (except for stock fields which can be multiple)
    if (
      !['stock', 'supSoh', 'nxtSoh'].includes(field) &&
      map.some(entry => entry.field === field)
    ) {
      return;
    }
    map.push({ field, index, header });
  }

  /**
   * Extract products with chunked processing and intelligent column detection
   */
  private async extractProductsChunked(
    rawData: Array<Record<string, unknown>>,
    config: ExtractionConfig
  ): Promise<ExtractedProduct[]> {
    const products: ExtractedProduct[] = [];
    const totalRows = rawData.length;

    if (totalRows === 0) {
      return products;
    }

    // Build column map from first row (headers) or detect intelligently
    let columnMap: ColumnMapping[] = [];
    let startRow = 0;

    if (config.auto_detect_columns !== false) {
      // Get headers from first row
      const firstRow = rawData[0] ?? {};
      const headers = Object.keys(firstRow as Record<string, unknown>);
      columnMap = this.buildColumnMap(headers);

      this.emit(
        'status',
        `Auto-detected ${columnMap.length} columns: ${columnMap.map(m => `${m.field}="${m.header}"`).join(', ')}`
      );
      startRow = 0; // Data starts from row 0 (headers already extracted by CSV/Excel parser)
    } else {
      // Use manual mapping from config
      const mapping = config.column_mapping || {};
      const firstRow = rawData[0] ?? {};
      const headers = Object.keys(firstRow as Record<string, unknown>);

      // Build column map from manual mapping
      Object.keys(mapping).forEach(field => {
        const headerName = mapping[field];
        if (headerName && headers.includes(headerName)) {
          columnMap.push({
            field,
            index: headers.indexOf(headerName),
            header: headerName,
          });
        }
      });
    }

    // Process in chunks
    for (let chunkStart = startRow; chunkStart < totalRows; chunkStart += CHUNK_SIZE) {
      this.checkCancellation();

      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalRows);
      const chunk = rawData.slice(chunkStart, chunkEnd);

      for (let i = 0; i < chunk.length; i++) {
        const row = chunk[i];
        const rowNumber = chunkStart + i + 1;

        const product = this.extractProductUsingColumnMap(row, rowNumber, columnMap, config);
        if (product) {
          products.push(product);
        }
      }

      // Emit progress every PROGRESS_INTERVAL rows
      if (chunkStart % PROGRESS_INTERVAL === 0 || chunkEnd === totalRows) {
        const progress = 30 + (40 * chunkEnd) / totalRows;
        this.emit('progress', Math.round(progress));
        this.emit('status', `Processed ${chunkEnd}/${totalRows} rows`);
      }

      // Allow event loop to breathe
      if (chunkStart % (CHUNK_SIZE * 5) === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return products;
  }

  /**
   * Extract single product from row using column map
   */
  private extractProductUsingColumnMap(
    row: Record<string, unknown>,
    rowNumber: number,
    columnMap: ColumnMapping[],
    config: ExtractionConfig
  ): ExtractedProduct | null {
    const mappedData: Partial<ExtractedProduct> & {
      row_number: number;
      raw_data: Record<string, unknown>;
      validation_status: ValidationStatus;
      validation_issues: ValidationIssue[];
      is_duplicate: boolean;
      is_new: boolean;
    } = {
      row_number: rowNumber,
      raw_data: row,
      validation_status: 'valid' as ValidationStatus,
      validation_issues: [],
      is_duplicate: false,
      is_new: true,
    };

    // Extract fields using column map
    columnMap.forEach(({ field, header }) => {
      const value = row[header];

      switch (field) {
        case 'sku':
          mappedData.supplier_sku = this.sanitizeText(value);
          break;
        case 'barcode':
          mappedData.barcode = this.sanitizeText(value);
          break;
        case 'description': {
          const desc = this.sanitizeText(value);
          mappedData.name = desc;
          mappedData.description = desc;
          break;
        }
        case 'brand':
          mappedData.brand = this.sanitizeText(value);
          break;
        case 'price':
          mappedData.price = this.parseNumber(value);
          break;
        case 'priceExVat': {
          const priceEx = this.parseNumber(value);
          if (priceEx !== undefined && !mappedData.price) {
            mappedData.price = priceEx;
          }
          break;
        }
        case 'priceIncVat': {
          const priceInc = this.parseNumber(value);
          if (priceInc !== undefined && !mappedData.price) {
            // Calculate price ex-VAT from price inc-VAT
            const vatRate = config.vat_rate || 0.15;
            mappedData.price = priceInc / (1 + vatRate);
          }
          break;
        }
        case 'uom':
          mappedData.uom = this.sanitizeText(value);
          break;
        case 'stock': {
          const stockQty = this.parseNumber(value);
          if (stockQty !== undefined) {
            mappedData.pack_size = stockQty;
          }
          break;
        }
        case 'seriesRange':
          mappedData.category = this.sanitizeText(value);
          break;
      }
    });

    // Set defaults
    if (!mappedData.uom) {
      mappedData.uom = 'EA'; // Default unit
    }

    if (!mappedData.currency) {
      mappedData.currency = config.currency_default || 'ZAR';
    }

    // Validate required fields
    if (!mappedData.supplier_sku || !mappedData.name || !mappedData.price) {
      return null; // Skip invalid rows
    }

    // Parse as ExtractedProduct
    try {
      return ExtractedProductSchema.parse(mappedData);
    } catch (error) {
      // Skip invalid products in lenient mode
      if (config.validation_mode === 'skip_invalid') {
        return null;
      }

      // Include with validation errors in strict mode
      mappedData.validation_status = 'invalid';
      mappedData.validation_issues.push({
        field: 'schema',
        severity: 'invalid',
        message: 'Failed schema validation',
        value: error,
      });
      return mappedData as ExtractedProduct;
    }
  }

  /**
   * Sanitize text value
   */
  private sanitizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      return value.replace(/\s+/g, ' ').trim();
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return String(value);
    }
    return '';
  }

  /**
   * Parse number from various formats
   */
  private parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return value;
    }

    // Convert string to number
    const str = String(value)
      .replace(/[^\d.-]/g, '') // Remove non-numeric characters
      .replace(/,/g, ''); // Remove thousand separators

    const num = parseFloat(str);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Validate extracted products (batch database queries)
   */
  private async validateProducts(
    products: ExtractedProduct[],
    supplierId: string
  ): Promise<ExtractedProduct[]> {
    // Check for duplicates within the batch
    const skuMap = new Map<string, number[]>();
    products.forEach((product, index) => {
      if (product.supplier_sku) {
        if (!skuMap.has(product.supplier_sku)) {
          skuMap.set(product.supplier_sku, []);
        }
        skuMap.get(product.supplier_sku)!.push(index);
      }
    });

    // Mark duplicates
    skuMap.forEach((indices, sku) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          products[index].is_duplicate = true;
          products[index].validation_issues.push({
            field: 'supplier_sku',
            severity: 'warning',
            message: `Duplicate SKU found in rows: ${indices.map(i => products[i].row_number).join(', ')}`,
            value: sku,
          });
          if (products[index].validation_status === 'valid') {
            products[index].validation_status = 'warning';
          }
        });
      }
    });

    // Batch query existing products (chunk by 500 SKUs)
    if (products.length > 0) {
      const skus = products.map(p => p.supplier_sku).filter(Boolean);
      const chunkSize = 500;

      for (let i = 0; i < skus.length; i += chunkSize) {
        this.checkCancellation();

        const skuChunk = skus.slice(i, i + chunkSize);
        const existingProducts = await query<{ supplier_sku: string; supplier_product_id: string }>(
          `SELECT supplier_sku, supplier_product_id
           FROM core.supplier_product
           WHERE supplier_id = $1 AND supplier_sku = ANY($2)`,
          [supplierId, skuChunk]
        );

        const existingSkuMap = new Map(
          existingProducts.rows.map(row => [row.supplier_sku, row.supplier_product_id])
        );

        // Update products with matched IDs
        products.forEach(product => {
          if (product.supplier_sku && existingSkuMap.has(product.supplier_sku)) {
            product.is_new = false;
            product.matched_product_id = existingSkuMap.get(product.supplier_sku);
          }
        });

        // Emit progress
        const progress = 70 + (15 * (i + skuChunk.length)) / skus.length;
        this.emit('progress', Math.round(progress));
      }
    }

    // Validate required fields and business rules
    products.forEach(product => this.validateProduct(product));

    return products;
  }

  /**
   * Validate single product
   */
  private validateProduct(product: ExtractedProduct): void {
    const issues: ValidationIssue[] = [];

    // Required fields
    if (!product.supplier_sku) {
      issues.push({
        field: 'supplier_sku',
        severity: 'invalid',
        message: 'Supplier SKU is required',
        value: null,
      });
    }

    if (!product.name) {
      issues.push({
        field: 'name',
        severity: 'invalid',
        message: 'Product name is required',
        value: null,
      });
    }

    if (!product.price || product.price <= 0) {
      issues.push({
        field: 'price',
        severity: 'invalid',
        message: 'Price must be a positive number',
        value: product.price,
      });
    }

    if (!product.uom) {
      issues.push({
        field: 'uom',
        severity: 'invalid',
        message: 'Unit of measure is required',
        value: null,
      });
    }

    // Warnings
    if (!product.brand) {
      issues.push({
        field: 'brand',
        severity: 'warning',
        message: 'Brand is recommended',
        value: null,
      });
    }

    if (!product.category) {
      issues.push({
        field: 'category',
        severity: 'warning',
        message: 'Category is recommended',
        value: null,
      });
    }

    // Update validation status
    if (issues.length > 0) {
      product.validation_issues.push(...issues);
      const hasErrors = issues.some(i => i.severity === 'invalid');
      product.validation_status = hasErrors ? 'invalid' : 'warning';
    }
  }

  /**
   * Calculate extraction statistics
   */
  private calculateStats(products: ExtractedProduct[]): ExtractionStats {
    const stats: ExtractionStats = {
      total_rows: products.length,
      valid_products: 0,
      products_with_warnings: 0,
      invalid_products: 0,
      new_products: 0,
      existing_products: 0,
      duplicate_skus: 0,
      processing_time_ms: 0,
    };

    products.forEach(product => {
      switch (product.validation_status) {
        case 'valid':
          stats.valid_products++;
          break;
        case 'warning':
          stats.products_with_warnings++;
          break;
        case 'invalid':
          stats.invalid_products++;
          break;
      }

      if (product.is_new) {
        stats.new_products++;
      } else {
        stats.existing_products++;
      }

      if (product.is_duplicate) {
        stats.duplicate_skus++;
      }
    });

    return stats;
  }

  /**
   * Collect warnings from products
   */
  private collectWarnings(products: ExtractedProduct[]): string[] {
    const warnings = new Set<string>();

    products.forEach(product => {
      product.validation_issues
        .filter(issue => issue.severity === 'warning')
        .forEach(issue => {
          warnings.add(`Row ${product.row_number}: ${issue.message}`);
        });
    });

    return Array.from(warnings).slice(0, 100); // Limit to 100 warnings
  }

  /**
   * Check if extraction was cancelled
   */
  private checkCancellation(): void {
    if (this.cancelled) {
      throw new AppError(ErrorCode.CANCELLED, 'Extraction cancelled', 400);
    }
  }

  /**
   * Emit status with progress
   */
  private emitStatus(message: string, progress: number): void {
    this.emit('status', message);
    this.emit('progress', progress);
  }
}

// Export for use in job queue
export default ExtractionWorker;
