// @ts-nocheck

/**
 * Real-Time XLSX Processing System
 * Live database integration with progress tracking and real-time updates
 */

import * as XLSX from 'xlsx';
import { db } from '../database';
import { EventEmitter } from 'events';

export interface XLSXProcessingOptions {
  organizationId: string;
  userId: string;
  targetTable: string;
  sheetName?: string;
  skipRows?: number;
  batchSize?: number;
  validateData?: boolean;
  updateExisting?: boolean;
  createMissing?: boolean;
}

export interface ProcessingProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  errorRows: number;
  progress: number;
  errors: ProcessingError[];
  startTime: string;
  endTime?: string;
  estimatedTimeRemaining?: number;
}

export interface ProcessingError {
  row: number;
  column?: string;
  error: string;
  data?: unknown;
}

export interface ValidationRule {
  column: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'email' | 'phone';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: unknown[];
  customValidator?: (value: unknown) => boolean | string;
}

export class XLSXProcessor extends EventEmitter {
  private activeProcesses: Map<string, ProcessingProgress> = new Map();

  /**
   * Process XLSX file with real-time progress tracking
   */
  async processFile(
    fileBuffer: Buffer,
    options: XLSXProcessingOptions,
    validationRules: ValidationRule[] = []
  ): Promise<{ processId: string; progress: ProcessingProgress }> {
    const processId = this.generateProcessId();

    const progress: ProcessingProgress = {
      id: processId,
      status: 'pending',
      totalRows: 0,
      processedRows: 0,
      successfulRows: 0,
      errorRows: 0,
      progress: 0,
      errors: [],
      startTime: new Date().toISOString(),
    };

    this.activeProcesses.set(processId, progress);
    this.emit('progress', progress);

    try {
      // Parse XLSX file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = options.sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }) as unknown[][];

      if (jsonData.length === 0) {
        throw new Error('No data found in worksheet');
      }

      // Get headers and data rows
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice((options.skipRows || 0) + 1);

      progress.totalRows = dataRows.length;
      progress.status = 'processing';
      this.activeProcesses.set(processId, progress);
      this.emit('progress', progress);

      // Process data in batches
      const batchSize = options.batchSize || 100;

      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = dataRows.slice(i, Math.min(i + batchSize, dataRows.length));
        await this.processBatch(batch, headers, options, validationRules, processId, i);

        // Update progress
        const currentProgress = this.activeProcesses.get(processId)!;
        currentProgress.processedRows = Math.min(i + batchSize, dataRows.length);
        currentProgress.progress =
          (currentProgress.processedRows / currentProgress.totalRows) * 100;

        // Calculate estimated time remaining
        if (currentProgress.processedRows > 0) {
          const elapsed = Date.now() - new Date(currentProgress.startTime).getTime();
          const rate = currentProgress.processedRows / elapsed;
          const remaining = (currentProgress.totalRows - currentProgress.processedRows) / rate;
          currentProgress.estimatedTimeRemaining = Math.round(remaining);
        }

        this.activeProcesses.set(processId, currentProgress);
        this.emit('progress', currentProgress);

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Mark as completed
      progress.status = 'completed';
      progress.endTime = new Date().toISOString();
      progress.progress = 100;
      this.activeProcesses.set(processId, progress);
      this.emit('progress', progress);
      this.emit('completed', progress);

      console.log(
        `✅ XLSX processing completed: ${progress.successfulRows}/${progress.totalRows} rows successful`
      );
    } catch (error) {
      console.error('❌ XLSX processing error:', error);
      progress.status = 'error';
      progress.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      progress.endTime = new Date().toISOString();
      this.activeProcesses.set(processId, progress);
      this.emit('progress', progress);
      this.emit('error', progress);
    }

    return { processId, progress };
  }

  /**
   * Process batch of rows
   */
  private async processBatch(
    batch: unknown[][],
    headers: string[],
    options: XLSXProcessingOptions,
    validationRules: ValidationRule[],
    processId: string,
    startIndex: number
  ): Promise<void> {
    const progress = this.activeProcesses.get(processId)!;

    for (let i = 0; i < batch.length; i++) {
      const rowIndex = startIndex + i + 1; // +1 for header row
      const rowData = batch[i];

      try {
        // Convert row array to object
        const record: unknown = {};
        headers.forEach((header, index) => {
          if (header && rowData[index] !== undefined) {
            record[header.toLowerCase().replace(/\s+/g, '_')] = rowData[index];
          }
        });

        // Add metadata
        record.organization_id = options.organizationId;
        record.created_by = options.userId;
        record.imported_at = new Date().toISOString();
        record.import_batch_id = processId;

        // Validate data
        if (options.validateData) {
          const validationErrors = this.validateRecord(record, validationRules);
          if (validationErrors.length > 0) {
            validationErrors.forEach(error => {
              progress.errors.push({
                row: rowIndex,
                column: error.column,
                error: error.error,
                data: record,
              });
            });
            progress.errorRows++;
            continue;
          }
        }

        // Insert or update record
        if (options.updateExisting) {
          await this.upsertRecord(record, options.targetTable);
        } else {
          await this.insertRecord(record, options.targetTable);
        }

        progress.successfulRows++;

        // Emit real-time notification for successful insert
        await this.notifyRecordProcessed(options.targetTable, record, 'INSERT');
      } catch (error) {
        console.error(`❌ Error processing row ${rowIndex}:`, error);
        progress.errors.push({
          row: rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: batch[i],
        });
        progress.errorRows++;
      }
    }

    this.activeProcesses.set(processId, progress);
  }

  /**
   * Validate record against rules
   */
  private validateRecord(record: unknown, rules: ValidationRule[]): ProcessingError[] {
    const errors: ProcessingError[] = [];

    for (const rule of rules) {
      const value = record[rule.column];

      // Required field check
      if (rule.required && (value === null || value === undefined || value === '')) {
        errors.push({
          row: 0,
          column: rule.column,
          error: `Field '${rule.column}' is required`,
        });
        continue;
      }

      // Skip validation if value is empty and not required
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Type validation
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push({
          row: 0,
          column: rule.column,
          error: `Invalid ${rule.type} format for field '${rule.column}'`,
        });
        continue;
      }

      // Length validation
      if (rule.minLength && String(value).length < rule.minLength) {
        errors.push({
          row: 0,
          column: rule.column,
          error: `Field '${rule.column}' must be at least ${rule.minLength} characters`,
        });
      }

      if (rule.maxLength && String(value).length > rule.maxLength) {
        errors.push({
          row: 0,
          column: rule.column,
          error: `Field '${rule.column}' must be at most ${rule.maxLength} characters`,
        });
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push({
          row: 0,
          column: rule.column,
          error: `Field '${rule.column}' does not match required pattern`,
        });
      }

      // Allowed values validation
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push({
          row: 0,
          column: rule.column,
          error: `Field '${rule.column}' must be one of: ${rule.allowedValues.join(', ')}`,
        });
      }

      // Custom validation
      if (rule.customValidator) {
        const validationResult = rule.customValidator(value);
        if (validationResult !== true) {
          errors.push({
            row: 0,
            column: rule.column,
            error:
              typeof validationResult === 'string'
                ? validationResult
                : `Custom validation failed for field '${rule.column}'`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate data type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return !isNaN(Number(value));
      case 'date':
        return !isNaN(Date.parse(value));
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      case 'phone':
        return /^\+?\(?[\d\s()-]{10,}$/.test(String(value));
      default:
        return true;
    }
  }

  /**
   * Insert record into database
   */
  private async insertRecord(record: unknown, tableName: string): Promise<void> {
    const fields = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    await db.query(query, values);
  }

  /**
   * Upsert record (insert or update if exists)
   */
  private async upsertRecord(record: unknown, tableName: string): Promise<void> {
    const fields = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const updateClause = fields.map(field => `${field} = EXCLUDED.${field}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updateClause}
    `;

    await db.query(query, values);
  }

  /**
   * Notify about processed record
   */
  private async notifyRecordProcessed(
    tableName: string,
    record: unknown,
    operation: string
  ): Promise<void> {
    const payload = JSON.stringify({
      operation,
      table: tableName,
      record,
      timestamp: new Date().toISOString(),
      source: 'xlsx_import',
    });

    await db.query(`NOTIFY table_changes, '${payload}'`);
  }

  /**
   * Get processing status
   */
  getProcessingStatus(processId: string): ProcessingProgress | null {
    return this.activeProcesses.get(processId) || null;
  }

  /**
   * Get all active processes
   */
  getAllActiveProcesses(): ProcessingProgress[] {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Cancel processing
   */
  cancelProcessing(processId: string): boolean {
    const progress = this.activeProcesses.get(processId);
    if (progress && progress.status === 'processing') {
      progress.status = 'error';
      progress.endTime = new Date().toISOString();
      progress.errors.push({
        row: 0,
        error: 'Processing cancelled by user',
      });
      this.activeProcesses.set(processId, progress);
      this.emit('cancelled', progress);
      return true;
    }
    return false;
  }

  /**
   * Clean up completed processes
   */
  cleanupCompletedProcesses(olderThanHours: number = 24): void {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;

    for (const [processId, progress] of this.activeProcesses) {
      if (progress.status === 'completed' || progress.status === 'error') {
        const processTime = new Date(progress.startTime).getTime();
        if (processTime < cutoff) {
          this.activeProcesses.delete(processId);
        }
      }
    }
  }

  /**
   * Generate unique process ID
   */
  private generateProcessId(): string {
    return `xlsx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const xlsxProcessor = new XLSXProcessor();

export default xlsxProcessor;
