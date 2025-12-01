import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET(request: Request, { params }: { params: { productId: string } }) {
  try {
    const result = await dbQuery<{
      enrichment_id: string;
      enrichment_type: string;
      source_data: Record<string, unknown> | null;
      changes_applied: Record<string, unknown>;
      confidence: number | null;
      web_research_results: Record<string, unknown> | null;
      created_at: Date;
      created_by: string | null;
    }>(
      `
        SELECT 
          enrichment_id,
          enrichment_type,
          source_data,
          changes_applied,
          confidence,
          web_research_results,
          created_at,
          created_by
        FROM core.product_enrichment_log
        WHERE supplier_product_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [params.productId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.enrichment_id,
        type: row.enrichment_type,
        source_data: row.source_data,
        changes_applied: row.changes_applied,
        confidence: row.confidence,
        web_research_results: row.web_research_results,
        created_at: row.created_at,
        created_by: row.created_by,
      })),
    });
  } catch (error) {
    console.error('Enrichment history fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch enrichment history',
      },
      { status: 500 }
    );
  }
}
