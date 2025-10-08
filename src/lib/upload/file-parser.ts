import * as XLSX from 'xlsx';
import { parse as parseCSV } from 'csv-parse/sync';
import { FileFormatDetection, DetectedColumn } from '@/types/pricelist-upload';

export class FileParserService {

  /**
   * Detect file format and analyze structure
   */
  static async detectFormat(file: Buffer, fileName: string, mimeType: string): Promise<FileFormatDetection> {
    const extension = fileName.toLowerCase().split('.').pop();

    try {
      if (extension === 'csv' || mimeType.includes('csv') || mimeType.includes('text')) {
        return await this.detectCSVFormat(file, fileName);
      }

      if (extension === 'xlsx' || extension === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return await this.detectExcelFormat(file, fileName);
      }

      if (extension === 'json' || mimeType.includes('json')) {
        return await this.detectJSONFormat(file, fileName);
      }

      return {
        format: 'unknown',
        mimeType,
        hasHeaders: false,
        totalRows: 0,
        totalColumns: 0,
        sampleData: [],
        detectedColumns: []
      };
    } catch (error) {
      console.error('File format detection failed:', error);
      throw new Error(`Failed to detect file format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse file content based on detected format
   */
  static async parseFile(
    file: Buffer,
    detection: FileFormatDetection,
    options: {
      maxRows?: number;
      sheetName?: string;
      skipRows?: number;
    } = {}
  ): Promise<Record<string, any>[]> {
    const { maxRows = 10000, sheetName, skipRows = 0 } = options;

    try {
      switch (detection.format) {
        case 'csv':
          return this.parseCSV(file, detection, { maxRows, skipRows });

        case 'excel':
          return this.parseExcel(file, detection, { maxRows, sheetName, skipRows });

        case 'json':
          return this.parseJSON(file, { maxRows });

        default:
          throw new Error(`Unsupported file format: ${detection.format}`);
      }
    } catch (error) {
      console.error('File parsing failed:', error);
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect CSV format and structure
   */
  private static async detectCSVFormat(file: Buffer, fileName: string): Promise<FileFormatDetection> {
    const content = file.toString('utf-8');
    const lines = content.split('\n').slice(0, 100); // Sample first 100 lines

    // Detect delimiter
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxColumns = 0;

    for (const delimiter of delimiters) {
      const testLine = lines[0];
      const columns = testLine.split(delimiter).length;
      if (columns > maxColumns) {
        maxColumns = columns;
        bestDelimiter = delimiter;
      }
    }

    try {
      // Parse sample data
      const sampleLines = lines.slice(0, 20);
      const sampleContent = sampleLines.join('\n');

      const records = parseCSV(sampleContent, {
        delimiter: bestDelimiter,
        skip_empty_lines: true,
        trim: true,
        columns: false // Get raw arrays first
      }) as string[][];

      if (records.length === 0) {
        throw new Error('No data found in CSV file');
      }

      // Detect headers
      const hasHeaders = this.detectHeaders(records);
      const headerRow = hasHeaders ? records[0] : this.generateColumnHeaders(records[0].length);
      const dataRows = hasHeaders ? records.slice(1) : records;

      // Convert to objects
      const sampleData = dataRows.slice(0, 10).map(row => {
        const obj: Record<string, any> = {};
        headerRow.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Analyze columns
      const detectedColumns = this.analyzeColumns(headerRow, dataRows);

      return {
        format: 'csv',
        mimeType: 'text/csv',
        encoding: 'utf-8',
        delimiter: bestDelimiter,
        hasHeaders,
        totalRows: records.length - (hasHeaders ? 1 : 0),
        totalColumns: headerRow.length,
        sampleData,
        detectedColumns
      };

    } catch (error) {
      throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect Excel format and structure
   */
  private static async detectExcelFormat(file: Buffer, fileName: string): Promise<FileFormatDetection> {
    try {
      const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      // Use first sheet by default
      const sheetName = sheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Get sheet range
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const totalRows = range.e.r + 1;
      const totalColumns = range.e.c + 1;

      // Convert to JSON with limited rows for analysis
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: `A1:${XLSX.utils.encode_col(range.e.c)}${Math.min(21, totalRows)}`,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      }) as any[][];

      if (jsonData.length === 0) {
        throw new Error('No data found in Excel sheet');
      }

      // Detect headers
      const hasHeaders = this.detectHeaders(jsonData);
      const headerRow = hasHeaders ? jsonData[0] : this.generateColumnHeaders(jsonData[0].length);
      const dataRows = hasHeaders ? jsonData.slice(1) : jsonData;

      // Convert to objects
      const sampleData = dataRows.slice(0, 10).map(row => {
        const obj: Record<string, any> = {};
        headerRow.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Analyze columns
      const detectedColumns = this.analyzeColumns(headerRow, dataRows);

      return {
        format: 'excel',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sheetNames,
        hasHeaders,
        totalRows: totalRows - (hasHeaders ? 1 : 0),
        totalColumns,
        sampleData,
        detectedColumns
      };

    } catch (error) {
      throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect JSON format and structure
   */
  private static async detectJSONFormat(file: Buffer, fileName: string): Promise<FileFormatDetection> {
    try {
      const content = file.toString('utf-8');
      const jsonData = JSON.parse(content);

      let dataArray: any[];
      if (Array.isArray(jsonData)) {
        dataArray = jsonData;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        dataArray = jsonData.data;
      } else {
        throw new Error('JSON must contain an array of objects');
      }

      if (dataArray.length === 0) {
        throw new Error('No data found in JSON file');
      }

      // Extract headers from first object
      const firstItem = dataArray[0];
      const headerRow = Object.keys(firstItem);

      // Sample data
      const sampleData = dataArray.slice(0, 10);

      // Convert to array format for column analysis
      const dataRows = dataArray.map(item =>
        headerRow.map(key => item[key])
      );

      // Analyze columns
      const detectedColumns = this.analyzeColumns(headerRow, dataRows);

      return {
        format: 'json',
        mimeType: 'application/json',
        hasHeaders: true,
        totalRows: dataArray.length,
        totalColumns: headerRow.length,
        sampleData,
        detectedColumns
      };

    } catch (error) {
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse CSV file
   */
  private static parseCSV(
    file: Buffer,
    detection: FileFormatDetection,
    options: { maxRows: number; skipRows: number }
  ): Record<string, any>[] {
    const content = file.toString('utf-8');

    const records = parseCSV(content, {
      delimiter: detection.delimiter || ',',
      columns: detection.hasHeaders,
      skip_empty_lines: true,
      skip_records_with_empty_values: false,
      trim: true,
      from_line: options.skipRows + 1,
      to_line: options.skipRows + options.maxRows + (detection.hasHeaders ? 1 : 0)
    });

    return records;
  }

  /**
   * Parse Excel file
   */
  private static parseExcel(
    file: Buffer,
    detection: FileFormatDetection,
    options: { maxRows: number; sheetName?: string; skipRows: number }
  ): Record<string, any>[] {
    const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const startRow = options.skipRows + (detection.hasHeaders ? 0 : 1);
    const endRow = startRow + options.maxRows;

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: detection.hasHeaders ? 1 : undefined,
      range: startRow,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    return jsonData.slice(0, options.maxRows);
  }

  /**
   * Parse JSON file
   */
  private static parseJSON(file: Buffer, options: { maxRows: number }): Record<string, any>[] {
    const content = file.toString('utf-8');
    const jsonData = JSON.parse(content);

    let dataArray: any[];
    if (Array.isArray(jsonData)) {
      dataArray = jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      dataArray = jsonData.data;
    } else {
      throw new Error('JSON must contain an array of objects');
    }

    return dataArray.slice(0, options.maxRows);
  }

  /**
   * Detect if first row contains headers
   */
  private static detectHeaders(data: any[][]): boolean {
    if (data.length < 2) return false;

    const firstRow = data[0];
    const secondRow = data[1];

    // Check if first row contains strings and second row contains different types
    let headerScore = 0;
    for (let i = 0; i < Math.min(firstRow.length, secondRow.length); i++) {
      const first = firstRow[i];
      const second = secondRow[i];

      // Headers are usually strings
      if (typeof first === 'string' && first.trim() !== '') headerScore += 1;

      // Headers shouldn't be numbers when data is
      if (typeof first === 'string' && typeof second === 'number') headerScore += 1;

      // Headers are usually unique
      const duplicatesInRow = firstRow.filter(val => val === first).length;
      if (duplicatesInRow === 1) headerScore += 0.5;
    }

    return headerScore / firstRow.length > 0.6;
  }

  /**
   * Generate column headers when none detected
   */
  private static generateColumnHeaders(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
  }

  /**
   * Analyze columns and suggest mappings
   */
  private static analyzeColumns(headers: string[], dataRows: any[][]): DetectedColumn[] {
    return headers.map((header, index) => {
      const values = dataRows.map(row => row[index]).filter(val => val != null && val !== '');

      const dataType = this.detectDataType(values);
      const uniqueCount = new Set(values).size;
      const nullCount = dataRows.length - values.length;

      const suggestedMapping = this.suggestColumnMapping(header, values);

      return {
        index,
        name: header,
        dataType,
        sampleValues: values.slice(0, 5),
        nullCount,
        uniqueCount,
        suggestedMapping: suggestedMapping.field,
        confidence: suggestedMapping.confidence
      };
    });
  }

  /**
   * Detect data type of column values
   */
  private static detectDataType(values: any[]): DetectedColumn['dataType'] {
    if (values.length === 0) return 'string';

    const types = values.map(val => {
      if (typeof val === 'number') return 'number';
      if (typeof val === 'boolean') return 'boolean';
      if (val instanceof Date) return 'date';

      // Check if string represents number
      const numVal = Number(val);
      if (!isNaN(numVal) && isFinite(numVal)) return 'number';

      // Check if string represents currency
      const strVal = String(val);
      if (/^\$?[\d,]+\.?\d*$/.test(strVal.replace(/[^\d.,]/g, ''))) return 'currency';

      // Check if string represents date
      const dateVal = new Date(strVal);
      if (!isNaN(dateVal.getTime()) && strVal.length > 5) return 'date';

      return 'string';
    });

    // Find most common type
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeCounts).reduce((a, b) =>
      typeCounts[a[0]] > typeCounts[b[0]] ? a : b
    )[0];

    // If less than 80% of values match dominant type, it's mixed
    if (typeCounts[dominantType] / values.length < 0.8) {
      return 'mixed';
    }

    return dominantType as DetectedColumn['dataType'];
  }

  /**
   * Suggest column mapping based on header name and content
   */
  private static suggestColumnMapping(header: string, values: any[]): {
    field?: string;
    confidence: number;
  } {
    const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '');

    const mappings = [
      { field: 'sku', patterns: ['sku', 'itemcode', 'productcode', 'partno', 'partnumber'], confidence: 0.9 },
      { field: 'productName', patterns: ['name', 'title', 'product', 'description', 'item'], confidence: 0.8 },
      { field: 'unitPrice', patterns: ['price', 'cost', 'unitprice', 'unitcost', 'amount'], confidence: 0.9 },
      { field: 'currency', patterns: ['currency', 'curr'], confidence: 0.95 },
      { field: 'category', patterns: ['category', 'cat', 'group'], confidence: 0.8 },
      { field: 'brand', patterns: ['brand', 'manufacturer', 'make'], confidence: 0.8 },
      { field: 'unit', patterns: ['unit', 'uom', 'measure'], confidence: 0.8 },
      { field: 'barcode', patterns: ['barcode', 'upc', 'ean', 'gtin'], confidence: 0.9 },
      { field: 'weight', patterns: ['weight', 'mass'], confidence: 0.8 },
      { field: 'availability', patterns: ['availability', 'stock', 'available'], confidence: 0.7 }
    ];

    for (const mapping of mappings) {
      for (const pattern of mapping.patterns) {
        if (headerLower.includes(pattern)) {
          return { field: mapping.field, confidence: mapping.confidence };
        }
      }
    }

    // Check content-based detection for prices
    if (values.length > 0) {
      const numericValues = values.filter(v => !isNaN(Number(v)) && Number(v) > 0);
      if (numericValues.length / values.length > 0.8 && numericValues.some(v => Number(v) > 0.01)) {
        return { field: 'unitPrice', confidence: 0.6 };
      }
    }

    return { confidence: 0 };
  }
}