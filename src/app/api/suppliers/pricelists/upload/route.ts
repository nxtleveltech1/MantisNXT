import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as XLSX from 'xlsx';

// Validation schema for pricelist items
const PricelistItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  supplierSku: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  minimumQuantity: z.number().min(1).optional(),
  maximumQuantity: z.number().optional(),
  leadTimeDays: z.number().min(0).optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

const PricelistUploadSchema = z.object({
  supplierId: z.string().optional(),
  hasHeaders: z.boolean().default(true),
  validateData: z.boolean().default(true),
  autoMapping: z.boolean().default(true),
});

// Field mapping for automatic column detection
const FIELD_MAPPINGS = {
  sku: ['sku', 'product_sku', 'item_sku', 'code', 'product_code'],
  supplierSku: ['supplier_sku', 'vendor_sku', 'supplier_code', 'vendor_code'],
  name: ['name', 'product_name', 'item_name', 'description', 'title'],
  description: ['description', 'desc', 'details', 'notes'],
  unitPrice: ['price', 'unit_price', 'cost', 'unit_cost', 'rate'],
  minimumQuantity: ['min_qty', 'minimum_quantity', 'min_quantity', 'min_order'],
  maximumQuantity: ['max_qty', 'maximum_quantity', 'max_quantity', 'max_order'],
  leadTimeDays: ['lead_time', 'lead_time_days', 'delivery_days', 'days'],
  category: ['category', 'cat', 'type', 'group', 'classification'],
} as const;

type PricelistItem = z.infer<typeof PricelistItemSchema>;
type PricelistUploadSettings = z.infer<typeof PricelistUploadSchema>;
type FieldKey = keyof typeof FIELD_MAPPINGS;
type FieldMapping = Partial<Record<FieldKey, string>>;
type RowValue = string | number | boolean | null | undefined;
type WorksheetRow = RowValue[];
type WorksheetData = WorksheetRow[];
type RowRecord = Record<string, RowValue>;
type ProcessedItem = PricelistItem | Record<string, unknown>;

function detectFieldMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};

  for (const [field, possibleNames] of Object.entries(FIELD_MAPPINGS) as Array<
    [FieldKey, readonly string[]]
  >) {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (possibleNames.includes(normalizedHeader)) {
        mapping[field] = header;
        break;
      }
    }
  }

  return mapping;
}

function validatePricelistItem(
  data: RowRecord,
  mapping: FieldMapping
): { item: PricelistItem | null; errors: string[] } {
  const errors: string[] = [];
  const mappedItem: Partial<PricelistItem> = {};

  // Map fields
  for (const [field, header] of Object.entries(mapping) as Array<[FieldKey, string]>) {
    const headerValue = header ? data[header] : undefined;
    if (headerValue !== undefined && headerValue !== null && headerValue !== '') {
      let value: RowValue = headerValue;

      // Type conversion
      if (
        field === 'unitPrice' ||
        field === 'minimumQuantity' ||
        field === 'maximumQuantity' ||
        field === 'leadTimeDays'
      ) {
        const numericValue =
          typeof value === 'number' ? value : parseFloat(value.toString().trim());
        if (Number.isNaN(numericValue)) {
          errors.push(`${field}: Invalid number format`);
          continue;
        }
        value = numericValue;
      }

      if (field === 'isActive') {
        value = Boolean(value);
      }

      mappedItem[field as keyof PricelistItem] = value as PricelistItem[keyof PricelistItem];
    }
  }

  if (errors.length > 0) {
    return { item: null, errors };
  }

  const parsedItem = PricelistItemSchema.safeParse(mappedItem);
  if (!parsedItem.success) {
    errors.push(
      ...parsedItem.error.errors.map(err => {
        const path = err.path.join('.') || 'item';
        return `${path}: ${err.message}`;
      })
    );
    return { item: null, errors };
  }

  return { item: parsedItem.data, errors };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadSettings: PricelistUploadSettings = PricelistUploadSchema.parse({
      supplierId: formData.get('supplierId')?.toString(),
      hasHeaders: formData.get('hasHeaders') !== 'false',
      validateData: formData.get('validateData') !== 'false',
      autoMapping: formData.get('autoMapping') !== 'false',
    });
    const { supplierId, hasHeaders, validateData, autoMapping } = uploadSettings;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files',
        },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;
    let headers: string[] = [];
    let data: WorksheetData = [];

    if (file.type === 'text/csv') {
      // Handle CSV files
      const text = new TextDecoder().decode(arrayBuffer);
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 1) {
        return NextResponse.json(
          {
            success: false,
            message: 'File appears to be empty',
          },
          { status: 400 }
        );
      }

      headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      data = lines
        .slice(hasHeaders ? 1 : 0)
        .map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
    } else {
      // Handle Excel files
      workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];

      if (!worksheetName) {
        return NextResponse.json(
          {
            success: false,
            message: 'No worksheets found in file',
          },
          { status: 400 }
        );
      }

      const worksheet = workbook.Sheets[worksheetName];
      const jsonData = XLSX.utils.sheet_to_json<WorksheetRow>(worksheet, { header: 1 });

      if (jsonData.length < 1) {
        return NextResponse.json(
          {
            success: false,
            message: 'Worksheet appears to be empty',
          },
          { status: 400 }
        );
      }

      data = jsonData;
      headers = hasHeaders
        ? (jsonData[0] || []).map(cell =>
            typeof cell === 'string' ? cell : cell !== undefined && cell !== null ? String(cell) : ''
          )
        : [];
    }

    if (headers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'No headers found in file. Please ensure the file has a header row with column names',
        },
        { status: 400 }
      );
    }

    // Generate field mapping
    const mapping = detectFieldMapping(headers);

    if (Object.keys(mapping).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No field mappings could be determined',
          availableHeaders: headers,
          suggestion:
            'Please ensure headers match expected patterns or provide custom field mapping',
        },
        { status: 400 }
      );
    }

    // Process data
    const processedItems: ProcessedItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const rowData: RowRecord = {};

      // Map row data to headers
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = row[j];
      }

      if (validateData) {
        const { item, errors: itemErrors } = validatePricelistItem(rowData, mapping);

        if (itemErrors.length > 0 || !item) {
          errors.push(`Row ${i + 1}: ${itemErrors.join(', ')}`);
          continue;
        }

        processedItems.push(item);
      } else {
        // Simple mapping without validation
        const item: Record<string, unknown> = {};
        for (const [field, header] of Object.entries(mapping)) {
          if (rowData[header] !== undefined) {
            item[field] = rowData[header];
          }
        }
        processedItems.push(item);
      }
    }

    // Generate summary
    const summary = {
      totalRows: data.length,
      processedItems: processedItems.length,
      errors: errors.length,
      warnings: warnings.length,
      mapping,
      headers,
      uploadSettings,
      supplierId: supplierId ?? null,
      mappingStrategy: autoMapping ? 'automatic' : 'manual',
    };

    return NextResponse.json({
      success: true,
      message: `File processed successfully: ${processedItems.length} items processed`,
      data: {
        items: processedItems,
        summary,
        uploadSettings,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('Pricelist upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'File processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Pricelist upload endpoint is available',
    supportedFormats: ['xlsx', 'xls', 'csv'],
    fieldMappings: FIELD_MAPPINGS,
  });
}
