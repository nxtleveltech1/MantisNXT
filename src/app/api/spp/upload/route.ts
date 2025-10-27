/**
 * POST /api/spp/upload - Upload pricelist file
 *
 * Handles file upload to SPP schema for validation and merging
 */

import { NextRequest, NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import { PricelistRow } from '@/types/nxt-spp';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = formData.get('supplier_id') as string;
    const currency = formData.get('currency') as string || 'ZAR';
    const validFromStr = formData.get('valid_from') as string;
    const autoValidate = formData.get('auto_validate') === 'true';
    const autoMerge = formData.get('auto_merge') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
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
        auto_merge: autoMerge
      }
    });

    // Parse file and extract rows
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Transform to PricelistRow format
    const rows: PricelistRow[] = data.map((row: any, index) => {
      // Flexible column mapping - adjust based on actual file format
      return {
        upload_id: upload.upload_id,
        row_num: index + 1,
        supplier_sku: row['SKU'] || row['Code'] || row['Item Code'] || '',
        name: row['Name'] || row['Description'] || row['Product Name'] || '',
        brand: row['Brand'] || row['Manufacturer'] || undefined,
        uom: row['UOM'] || row['Unit'] || 'EA',
        pack_size: row['Pack Size'] || row['Package'] || undefined,
        price: parseFloat(row['Price'] || row['Unit Price'] || row['Cost'] || 0),
        currency: row['Currency'] || currency,
        category_raw: row['Category'] || undefined,
        vat_code: row['VAT'] || row['Tax Code'] || undefined,
        barcode: row['Barcode'] || row['EAN'] || undefined,
        attrs_json: {}
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
          upload,
          rows_inserted: insertedCount,
          validation: validationResult,
          merge: mergeResult
        });
      }
    }

    return NextResponse.json({
      success: true,
      upload,
      rows_inserted: insertedCount,
      validation: validationResult
    });
  } catch (error) {
    console.error('Pricelist upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
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
    const status = searchParams.get('status')?.split(',') as Array<'received' | 'validating' | 'validated' | 'failed' | 'merged'> | undefined;

    // Build filters object - supplier_id is now optional
    const filters: {
      supplier_id?: string;
      status?: Array<'received' | 'validating' | 'validated' | 'failed' | 'merged'>;
      limit: number;
      offset: number;
    } = {
      limit,
      offset
    };

    if (supplierId) {
      filters.supplier_id = supplierId;
    }

    if (status && status.length > 0) {
      filters.status = status;
    }

    const result = await pricelistService.listUploads(filters);
    const uploads = Array.isArray(result.uploads) ? result.uploads : [];
    const total = Number.isFinite(result.total as any) ? (result.total as any as number) : 0;

    return NextResponse.json({
      success: true,
      data: {
        uploads,
        total
      },
      pagination: {
        limit,
        offset,
        total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [GET /api/spp/upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list uploads',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
