/**
 * POST /api/spp/upload - Upload pricelist file
 *
 * Handles file upload to SPP schema for validation and merging
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import type { PricelistRow } from '@/types/nxt-spp';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = formData.get('supplier_id') as string;
    const currency = (formData.get('currency') as string) || 'ZAR';
    const validFromStr = formData.get('valid_from') as string;
    const autoValidate = formData.get('auto_validate') === 'true';
    const autoMerge = formData.get('auto_merge') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID is required' },
        { status: 400 }
      );
    }

    // Create upload record
    const upload = await pricelistService.createUpload({
      supplier_id: supplierId,
      file: file,
      filename: file.name,
      currency,
      valid_from: validFromStr ? new Date(validFromStr) : undefined,
      options: {
        auto_validate: autoValidate,
        auto_merge: autoMerge,
      },
    });

    // Validate upload was created successfully
    if (!upload || !upload.upload_id) {
      console.error('Failed to create upload record:', upload);
      return NextResponse.json(
        { success: false, error: 'Failed to create upload record' },
        { status: 500 }
      );
    }

    // Helper function to parse price values (handles "R 1,300.00" format and plain numbers)
    const parsePrice = (value: unknown): number => {
      if (!value && value !== 0) return 0;
      if (typeof value === 'number') return Math.max(0, value);

      const str = String(value).trim();
      if (!str) return 0;

      // Remove currency symbols (R, $, €, £, etc.), spaces, and formatting
      // Handle "R 1,300.00" format by removing R, spaces, and commas
      const cleaned = str
        .replace(/^[R$€£¥₹]\s*/i, '') // Remove currency symbols at start
        .replace(/,/g, '') // Remove thousand separators
        .replace(/\s+/g, '') // Remove spaces
        .trim();

      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    };

    // Parse file and extract rows
    // Handle semicolon-delimited CSV properly
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString('utf-8');

    // Detect if file is CSV (by extension or content)
    const isCSV =
      file.name.toLowerCase().endsWith('.csv') ||
      (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls'));

    let data: unknown[] = [];

    if (isCSV) {
      // Parse CSV manually to handle semicolon delimiters properly
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length > 0) {
        // Detect delimiter (semicolon or comma)
        const firstLine = lines[0];
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ';' : ',';

        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        data = lines
          .slice(1)
          .map(line => {
            // Handle quoted values that might contain the delimiter
            const values: string[] = [];
            let currentValue = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === delimiter && !inQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim().replace(/^"|"$/g, '')); // Last value

            const row: unknown = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            return row;
          })
          .filter(
            row => Object.keys(row).length > 0 && Object.values(row).some(v => String(v).trim())
          ); // Filter empty rows
      }
    } else {
      // Handle Excel files with XLSX
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    // Transform to PricelistRow format with proper column mapping for this CSV format
    const rows: PricelistRow[] = data.map((row: unknown, index) => {
      // Map columns based on actual CSV headers:
      // Supplier Name;Supplier Code;Produt Category;BRAND;Brand Sub Tag;SKU / MODEL;PRODUCT DESCRIPTION;SUPPLIER SOH;COST  EX VAT;QTY ON ORDER;NEXT SHIPMENT;Tags;Links

      // Flexible column name matching (case-insensitive, handle spaces/variations)
      const getColumn = (possibleNames: string[]): string | undefined => {
        const rowKeys = Object.keys(row);
        for (const name of possibleNames) {
          // Exact match
          if (row[name] !== undefined) return row[name];
          // Case-insensitive match
          const found = rowKeys.find(key => key.toLowerCase() === name.toLowerCase());
          if (found) return row[found];
        }
        return undefined;
      };

      const supplierSku =
        getColumn([
          'SKU / MODEL',
          'SKU/MODEL',
          'SKU',
          'MODEL',
          'Code',
          'Item Code',
          'Product Code',
        ]) || '';

      const productName =
        getColumn([
          'PRODUCT DESCRIPTION',
          'Product Description',
          'Description',
          'Name',
          'Product Name',
          'Item Name',
        ]) || '';

      const brand = getColumn(['BRAND', 'Brand', 'Manufacturer', 'Make']);

      const category = getColumn([
        'Produt Category',
        'Product Category',
        'Category',
        'Type',
        'Group',
        'Class',
      ]);

      const priceValue = getColumn([
        'COST  EX VAT',
        'COST EX VAT',
        'Cost Ex VAT',
        'Cost',
        'Price',
        'Unit Price',
        'Unit Cost',
        'COST',
        'PRICE',
        'Dealer Excl.',
        'Dealer Excl',
        'Dealer Ex',
        'Dealer Price',
        'Dealer Cost',
      ]);

      const stockQty = getColumn([
        'SUPPLIER SOH',
        'Supplier SOH',
        'SUP SOH',
        'SOH',
        'Stock',
        'Quantity',
        'Qty',
        'Stock On Hand',
        'Supplier Stock',
      ]);

      const uom = getColumn(['UOM', 'Unit', 'Unit of Measure', 'Pack Size']) || 'EA';

      const packSize = getColumn(['Pack Size', 'Package', 'Packing']);

      const barcode = getColumn(['Barcode', 'EAN', 'UPC', 'GTIN']);

      const rspValue = getColumn([
        'RSP',
        'Recommended Selling Price',
        'Selling Price',
        'Retail Price',
        'RRP',
      ]);

      // Store additional info in attrs_json
      const attrs: unknown = {};
      if (stockQty) attrs.stock_qty = parseInt(String(stockQty)) || 0;
      if (rspValue) attrs.rsp = parsePrice(rspValue);
      if (getColumn(['QTY ON ORDER']))
        attrs.qty_on_order = parseInt(String(getColumn(['QTY ON ORDER']))) || 0;
      if (getColumn(['NEXT SHIPMENT'])) attrs.next_shipment = getColumn(['NEXT SHIPMENT']);
      if (getColumn(['Tags'])) attrs.tags = getColumn(['Tags']);
      if (getColumn(['Links'])) attrs.links = getColumn(['Links']);
      if (getColumn(['Brand Sub Tag'])) attrs.brand_sub_tag = getColumn(['Brand Sub Tag']);

      return {
        upload_id: upload.upload_id,
        row_num: index + 1,
        supplier_sku: supplierSku,
        name: productName,
        brand: brand || undefined,
        uom: uom || 'EA',
        pack_size: packSize || undefined,
        price: parsePrice(priceValue),
        currency: currency || 'ZAR', // Default to ZAR for South African Rand
        category_raw: category || undefined,
        vat_code: undefined, // Not in this CSV
        barcode: barcode || undefined,
        attrs_json: attrs,
      };
    });

    // Insert rows in batch
    const insertedCount = await pricelistService.insertRows(upload.upload_id, rows);

    // Auto-validate if requested
    let validationResult = null;
    if (autoValidate) {
      validationResult = await pricelistService.validateUpload(upload.upload_id);

      // Auto-merge if requested and validation passed
      if (autoMerge && validationResult.status === 'valid') {
        const mergeResult = await pricelistService.mergePricelist(upload.upload_id);
        return NextResponse.json({
          success: true,
          data: {
            upload,
            upload_id: upload.upload_id,
            rows_inserted: insertedCount,
            validation: validationResult,
            merge: mergeResult,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        upload,
        upload_id: upload.upload_id,
        rows_inserted: insertedCount,
        validation: validationResult,
      },
    });
  } catch (error) {
    console.error('❌ [POST /api/spp/upload] Pricelist upload error:', error);
    console.error('❌ [POST /api/spp/upload] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/spp/upload?supplier_id={id} - List uploads for a supplier
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status')?.split(',') as
      | Array<'received' | 'validating' | 'validated' | 'failed' | 'merged'>
      | undefined;

    // Build filters object - supplier_id is now optional
    const filters: {
      supplier_id?: string;
      status?: Array<'received' | 'validating' | 'validated' | 'failed' | 'merged'>;
      limit: number;
      offset: number;
    } = {
      limit,
      offset,
    };

    if (supplierId) {
      filters.supplier_id = supplierId;
    }

    if (status && status.length > 0) {
      filters.status = status;
    }

    const result = await pricelistService.listUploads(filters);
    const uploads = Array.isArray(result.uploads) ? result.uploads : [];
    const total = Number.isFinite(result.total as unknown)
      ? (result.total as unknown as number)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        uploads,
        total,
      },
      pagination: {
        limit,
        offset,
        total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [GET /api/spp/upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list uploads',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
