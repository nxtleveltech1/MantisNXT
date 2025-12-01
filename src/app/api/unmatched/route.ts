import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { query as dbQuery } from '@/lib/database/unified-connection';
import { assignCategoryToSupplierProduct } from '@/lib/cmm/sip-category-assignment';

export async function GET() {
  try {
    const schemaMode = await getSchemaMode();

    if (schemaMode === 'none') {
      // Return mock unmatched items for demo
      return NextResponse.json([
        {
          id: 'unm-001',
          supplierId: 'yamaha',
          supplierSku: 'YMH-FG830-NAT',
          description: 'FG830 Natural Acoustic Guitar',
          cost: 199.99,
          currency: 'USD',
          versionId: 'v-002',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'unm-002',
          supplierId: 'fender',
          supplierSku: 'FND-STRAT-SSS-BLK',
          description: 'Player Stratocaster SSS Black',
          cost: 799.99,
          currency: 'USD',
          versionId: 'v-003',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    }

    if (schemaMode === 'core') {
      const { rows } = await dbQuery<{
        supplier_product_id: string;
        supplier_id: string;
        supplier_sku: string;
        name_from_supplier: string;
        first_seen_at: Date | string | null;
        ai_confidence: number | null;
        ai_reasoning: string | null;
        ai_categorization_status: string | null;
        price: number | null;
        currency: string | null;
      }>(`
        WITH latest_prices AS (
          SELECT DISTINCT ON (ph.supplier_product_id)
            ph.supplier_product_id,
            ph.price,
            ph.currency
          FROM core.price_history ph
          WHERE ph.is_current = true
          ORDER BY ph.supplier_product_id, ph.valid_from DESC
        )
        SELECT
          sp.supplier_product_id,
          sp.supplier_id,
          sp.supplier_sku,
          sp.name_from_supplier,
          sp.first_seen_at,
          sp.ai_confidence,
          sp.ai_reasoning,
          sp.ai_categorization_status,
          lp.price,
          lp.currency
        FROM core.supplier_product sp
        LEFT JOIN latest_prices lp ON lp.supplier_product_id = sp.supplier_product_id
        WHERE sp.category_id IS NULL
        ORDER BY sp.first_seen_at DESC NULLS LAST
        LIMIT 100
      `);

      const payload = rows.map(row => ({
        id: row.supplier_product_id,
        supplierId: row.supplier_id,
        supplierSku: row.supplier_sku,
        description: row.name_from_supplier,
        cost: row.price !== null && row.price !== undefined ? Number(row.price) : null,
        currency: row.currency,
        versionId: row.ai_categorization_status ?? 'pending',
        createdAt: row.first_seen_at ? new Date(row.first_seen_at).toISOString() : null,
        aiConfidence:
          row.ai_confidence !== null && row.ai_confidence !== undefined
            ? Number(row.ai_confidence)
            : null,
        aiReasoning: row.ai_reasoning,
        status: row.ai_categorization_status ?? 'pending',
      }));

      return NextResponse.json(payload);
    }

    const result = await dbQuery<{
      id: string;
      supplierId: string;
      supplierSku: string;
      description: string;
      cost: number;
      currency: string;
      versionId: string;
      createdAt: string;
    }>(`
      SELECT id,
             supplier_id AS "supplierId",
             supplier_sku AS "supplierSku",
             description,
             cost,
             currency,
             version_id AS "versionId",
             to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
      FROM unmatched_queue
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Unmatched fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const schemaMode = await getSchemaMode();
    const body = await request.json();

    if (schemaMode === 'core') {
      const { supplierProductId, categoryId, assignedBy, method, aiConfidence, aiReasoning } =
        body as {
          supplierProductId?: string;
          categoryId?: string;
          assignedBy?: string;
          method?: 'ai_auto' | 'ai_manual_accept' | 'manual';
          aiConfidence?: number;
          aiReasoning?: string;
        };

      if (!supplierProductId || !categoryId) {
        return NextResponse.json(
          {
            success: false,
            message:
              'supplierProductId and categoryId are required when using the new AI categorization workflow.',
          },
          { status: 400 }
        );
      }

      await assignCategoryToSupplierProduct(
        supplierProductId,
        categoryId,
        assignedBy,
        method ?? 'manual',
        aiConfidence,
        aiReasoning
      );

      await dbQuery(
        `
          UPDATE core.supplier_product
          SET
            ai_categorization_status = 'completed',
            ai_confidence = COALESCE($2::numeric, ai_confidence),
            ai_reasoning = COALESCE($3::text, ai_reasoning),
            ai_categorized_at = NOW()
          WHERE supplier_product_id = $1
        `,
        [supplierProductId, aiConfidence ?? null, aiReasoning ?? null]
      );

      await dbQuery(
        `
          UPDATE core.ai_proposed_category_product
          SET status = 'applied',
              resolved_at = NOW(),
              updated_at = NOW()
          WHERE supplier_product_id = $1
            AND status = 'pending'
        `,
        [supplierProductId]
      );

      return NextResponse.json({
        success: true,
        message: 'Category assignment completed',
      });
    }

    const { unmatchedId, masterSku } = body as { unmatchedId?: string; masterSku?: string };

    if (!unmatchedId || !masterSku) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unmatched ID and master SKU are required',
        },
        { status: 400 }
      );
    }

    // Legacy flow (pre-core schema)
    const unmatchedResult = await dbQuery<{
      supplierId: string;
      supplierSku: string;
    }>(
      `
        SELECT supplier_id AS "supplierId", supplier_sku AS "supplierSku"
        FROM unmatched_queue
        WHERE id = $1
      `,
      [unmatchedId]
    );

    if (unmatchedResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unmatched item not found',
        },
        { status: 404 }
      );
    }

    const item = unmatchedResult.rows[0];

    await dbQuery(
      `
        INSERT INTO sku_xref (master_sku, supplier_id, supplier_sku, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
          master_sku = EXCLUDED.master_sku,
          created_at = EXCLUDED.created_at
      `,
      [masterSku, item.supplierId, item.supplierSku]
    );

    await dbQuery(
      `
        DELETE FROM unmatched_queue
        WHERE id = $1
      `,
      [unmatchedId]
    );

    return NextResponse.json({
      success: true,
      message: 'SKU cross-reference created successfully',
    });
  } catch (error) {
    console.error('Unmatched resolution error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to resolve unmatched item',
      },
      { status: 500 }
    );
  }
}
