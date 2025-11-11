import { randomUUID } from 'node:crypto';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';
import type {
  PriceListUpload,
  ImportSummary,
  PriceHistoryEntry
} from '@/types/pricelist-upload';



/**
 * POST /api/suppliers/pricelists/import - Execute bulk import from validated upload
 */
export async function POST(request: NextRequest) {
  try {
    const { uploadId, dryRun = false } = await request.json();

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // Get upload record
    const upload = await getUploadRecord(uploadId);
    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    if (upload.status !== 'validated') {
      return NextResponse.json(
        { error: 'Upload must be validated before import' },
        { status: 400 }
      );
    }

    // Execute import
    const importResult = await executeImport(upload, dryRun);

    if (!dryRun) {
      // Update upload status
      await updateUploadStatus(uploadId, {
        status: 'imported',
        importedRows: importResult.rowsImported
      });
    }

    return NextResponse.json({
      success: true,
      data: importResult,
      message: dryRun ? 'Dry run completed' : 'Import completed successfully'
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/suppliers/pricelists/import - Get import history and status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE status IN (\'imported\', \'failed\')';
    const params: Array<number | string> = [limit, offset];

    if (supplierId) {
      whereClause += ' AND supplier_id = $3';
      params.push(supplierId);
    }

    const imports = await withTransaction(async (client) => {
      const result = await client.query(`
        SELECT
          id,
          supplier_id,
          supplier_name,
          original_file_name,
          status,
          total_rows,
          valid_rows,
          invalid_rows,
          imported_rows,
          processing_duration,
          uploaded_at,
          processing_completed_at
        FROM pricelist_uploads
        ${whereClause}
        ORDER BY uploaded_at DESC
        LIMIT $1 OFFSET $2
      `, params);

      return result.rows;
    });

    const importHistory = imports.map(row => ({
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      fileName: row.original_file_name,
      status: row.status,
      totalRows: row.total_rows,
      validRows: row.valid_rows,
      invalidRows: row.invalid_rows,
      importedRows: row.imported_rows,
      processingDuration: row.processing_duration,
      uploadedAt: row.uploaded_at,
      completedAt: row.processing_completed_at
    }));

    return NextResponse.json({
      success: true,
      data: importHistory
    });

  } catch (error) {
    console.error('Error fetching import history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history' },
      { status: 500 }
    );
  }
}

/**
 * Execute the actual import process
 */
async function executeImport(upload: PriceListUpload, dryRun: boolean = false): Promise<ImportSummary> {
  const startTime = Date.now();
  let rowsProcessed = 0;
  let rowsImported = 0;
  let rowsSkipped = 0;
  let rowsFailed = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let categoriesCreated = 0;
  const categorySet = new Set<string>();
  let totalValue = 0;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  try {
    return await withTransaction(async (client) => {
      // Process each valid row from preview data
      for (const previewRow of upload.previewData || []) {
        if (previewRow.validationStatus === 'valid') {
          rowsProcessed++;
          const { mappedData } = previewRow;

          try {
            // Check if product already exists
            const existingProduct = await client.query(`
              SELECT id, unit_price FROM supplier_products
              WHERE supplier_id = $1 AND supplier_part_number = $2
            `, [upload.supplierId, mappedData.supplierPartNumber]);

            if (!dryRun) {
              if (existingProduct.rows.length > 0) {
                // Update existing product
                await updateSupplierProduct(client, existingProduct.rows[0].id, mappedData, upload.id);
                productsUpdated++;

                // Add to price history if price changed
                const oldPrice = existingProduct.rows[0].unit_price;
                if (mappedData.unitPrice && Math.abs(oldPrice - mappedData.unitPrice) > 0.01) {
                  await addPriceHistoryEntry(client, existingProduct.rows[0].id, {
                    price: mappedData.unitPrice,
                    currency: mappedData.currency || 'USD',
                    effectiveDate: new Date(),
                    source: 'import',
                    changeReason: `Price updated via bulk import: ${upload.originalFileName}`
                  });
                }
              } else {
                // Create new product
                const productId = await createSupplierProduct(client, mappedData, upload);
                productsCreated++;

                // Add initial price history
                if (mappedData.unitPrice) {
                  await addPriceHistoryEntry(client, productId, {
                    price: mappedData.unitPrice,
                    currency: mappedData.currency || 'USD',
                    effectiveDate: new Date(),
                    source: 'import',
                    changeReason: 'Initial price from import'
                  });
                }
              }

              // Create category if it doesn't exist and auto-creation is enabled
              if (upload.importConfig.options.autoCreateCategories && mappedData.category) {
                const categoryExists = await client.query(
                  'SELECT id FROM categories WHERE name = $1',
                  [mappedData.category]
                );

                if (categoryExists.rows.length === 0) {
                  await client.query(`
                    INSERT INTO categories (id, name, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, NOW(), NOW())
                  `, [mappedData.category]);
                  categoriesCreated++;
                }
              }
            }

            rowsImported++;

            // Track statistics
            if (mappedData.category) categorySet.add(mappedData.category);
            if (mappedData.unitPrice) {
              totalValue += mappedData.unitPrice;
              minPrice = Math.min(minPrice, mappedData.unitPrice);
              maxPrice = Math.max(maxPrice, mappedData.unitPrice);
            }

          } catch (error) {
            console.error(`Failed to import row ${previewRow.rowIndex}:`, error);
            rowsFailed++;
          }
        } else {
          rowsSkipped++;
        }
      }

      // Calculate quality metrics
      const dataQualityScore = Math.round(
        (rowsImported / Math.max(1, rowsProcessed)) * 100
      );

      const completenessScore = Math.round(
        ((upload.previewData?.filter(row =>
          row.mappedData.productName &&
          row.mappedData.category &&
          row.mappedData.unitPrice
        ).length || 0) / Math.max(1, upload.previewData?.length || 1)) * 100
      );

      // Generate recommendations
      const recommendations = [];
      if (rowsFailed > 0) {
        recommendations.push(`${rowsFailed} rows failed to import - check validation errors`);
      }
      if (dataQualityScore < 90) {
        recommendations.push('Consider improving data quality before future imports');
      }
      if (completenessScore < 80) {
        recommendations.push('Many products lack complete information (name, category, price)');
      }
      if (categoriesCreated > 5) {
        recommendations.push(`${categoriesCreated} new categories created - consider standardizing category names`);
      }

      const summary: ImportSummary = {
        uploadId: upload.id,
        supplierId: upload.supplierId,
        fileName: upload.originalFileName,
        totalProcessingTime: Date.now() - startTime,
        rowsProcessed,
        rowsImported,
        rowsSkipped,
        rowsFailed,
        validationErrors: upload.validationErrors.length,
        validationWarnings: upload.validationWarnings.length,
        productsCreated,
        productsUpdated,
        categoriesCreated,
        totalValue,
        averagePrice: totalValue / Math.max(1, rowsImported),
        priceRange: {
          min: minPrice === Infinity ? 0 : minPrice,
          max: maxPrice === -Infinity ? 0 : maxPrice
        },
        dataQualityScore,
        completenessScore,
        recommendations,
        completedAt: new Date()
      };

      return summary;
    });

  } catch (error) {
    console.error('Import execution failed:', error);
    throw error;
  }
}

/**
 * Create new supplier product
 */
async function createSupplierProduct(
  client: unknown,
  data: unknown,
  upload: PriceListUpload
): Promise<string> {
  const productId = randomUUID();

  await client.query(`
    INSERT INTO supplier_products (
      id,
      supplier_id,
      supplier_part_number,
      sku,
      name,
      description,
      category,
      subcategory,
      brand,
      unit_price,
      list_price,
      wholesale_price,
      retail_price,
      currency,
      availability,
      minimum_order_quantity,
      lead_time,
      unit,
      weight,
      barcode,
      status,
      import_source,
      created_at,
      updated_at,
      last_imported_at,
      last_price_update
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), NOW(), NOW()
    )
  `, [
    productId,
    upload.supplierId,
    data.supplierPartNumber,
    data.sku,
    data.productName,
    data.description,
    data.category,
    data.subcategory,
    data.brand,
    data.unitPrice,
    data.listPrice,
    data.wholesalePrice,
    data.retailPrice,
    data.currency || 'USD',
    data.availability || 'available',
    data.minimumOrderQuantity,
    data.leadTime,
    data.unit,
    data.weight,
    data.barcode,
    'active',
    upload.id
  ]);

  return productId;
}

/**
 * Update existing supplier product
 */
async function updateSupplierProduct(
  client: unknown,
  productId: string,
  data: unknown,
  importSource: string
): Promise<void> {
  await client.query(`
    UPDATE supplier_products SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      category = COALESCE($4, category),
      subcategory = COALESCE($5, subcategory),
      brand = COALESCE($6, brand),
      unit_price = COALESCE($7, unit_price),
      list_price = COALESCE($8, list_price),
      wholesale_price = COALESCE($9, wholesale_price),
      retail_price = COALESCE($10, retail_price),
      currency = COALESCE($11, currency),
      availability = COALESCE($12, availability),
      minimum_order_quantity = COALESCE($13, minimum_order_quantity),
      lead_time = COALESCE($14, lead_time),
      unit = COALESCE($15, unit),
      weight = COALESCE($16, weight),
      barcode = COALESCE($17, barcode),
      import_source = $18,
      updated_at = NOW(),
      last_imported_at = NOW(),
      last_price_update = CASE WHEN $7 IS NOT NULL THEN NOW() ELSE last_price_update END
    WHERE id = $1
  `, [
    productId,
    data.productName,
    data.description,
    data.category,
    data.subcategory,
    data.brand,
    data.unitPrice,
    data.listPrice,
    data.wholesalePrice,
    data.retailPrice,
    data.currency,
    data.availability,
    data.minimumOrderQuantity,
    data.leadTime,
    data.unit,
    data.weight,
    data.barcode,
    importSource
  ]);
}

/**
 * Add price history entry
 */
async function addPriceHistoryEntry(
  client: unknown,
  productId: string,
  historyEntry: PriceHistoryEntry
): Promise<void> {
  await client.query(`
    INSERT INTO supplier_product_price_history (
      id,
      product_id,
      price,
      currency,
      effective_date,
      source,
      change_reason,
      created_at
    ) VALUES (
      gen_random_uuid(),
      $1, $2, $3, $4, $5, $6, NOW()
    )
  `, [
    productId,
    historyEntry.price,
    historyEntry.currency,
    historyEntry.effectiveDate,
    historyEntry.source,
    historyEntry.changeReason
  ]);
}

/**
 * Get upload record from database
 */
async function getUploadRecord(uploadId: string): Promise<PriceListUpload | null> {
  try {
    return await withTransaction(async (client) => {
      const result = await client.query(`
        SELECT * FROM pricelist_uploads WHERE id = $1
      `, [uploadId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        fileName: row.file_name,
        originalFileName: row.original_file_name,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        status: row.status,
        validationStatus: row.validation_status,
        totalRows: row.total_rows,
        validRows: row.valid_rows,
        invalidRows: row.invalid_rows,
        importedRows: row.imported_rows,
        skippedRows: row.skipped_rows,
        validationErrors: JSON.parse(row.validation_errors || '[]'),
        validationWarnings: JSON.parse(row.validation_warnings || '[]'),
        processingStartedAt: row.processing_started_at,
        processingCompletedAt: row.processing_completed_at,
        processingDuration: row.processing_duration,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        previewData: JSON.parse(row.preview_data || '[]'),
        importConfig: JSON.parse(row.import_config || '{}'),
        notes: row.notes
      };
    });
  } catch (error) {
    console.error('Failed to get upload record:', error);
    return null;
  }
}

/**
 * Update upload status
 */
async function updateUploadStatus(
  uploadId: string,
  updates: Partial<PriceListUpload>
): Promise<void> {
  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    updateFields.push(`${dbField} = $${paramCount++}`);
    values.push(value);
  });

  updateFields.push(`updated_at = $${paramCount++}`);
  values.push(new Date());
  values.push(uploadId);

  await withTransaction(async (client) => {
    await client.query(`
      UPDATE pricelist_uploads
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
    `, values);
  });
}
