import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getSuppliersNeedingSync,
  SupplierJsonSyncService,
} from '@/lib/services/SupplierJsonSyncService';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

const MAX_SUPPLIERS_PER_RUN = parseInt(
  process.env.JSON_FEED_CRON_MAX_SUPPLIERS || '5',
  10
);

function isAuthorized(request: NextRequest): boolean {
  return request.headers.get('x-vercel-cron') === '1';
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const suppliers = await getSuppliersNeedingSync();
    const toProcess = suppliers.slice(0, MAX_SUPPLIERS_PER_RUN);

    if (toProcess.length === 0) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, results: [] },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const supplier of toProcess) {
      try {
        const service = new SupplierJsonSyncService(supplier.supplierId);
        const result = await service.sync();

        results.push({
          supplierId: supplier.supplierId,
          supplierName: supplier.name,
          success: result.success,
          logId: result.logId,
          productsFetched: result.productsFetched,
          productsUpdated: result.productsUpdated,
          productsCreated: result.productsCreated,
          productsFailed: result.productsFailed,
          errorMessage: result.errorMessage ?? undefined,
        });
      } catch (error) {
        results.push({
          supplierId: supplier.supplierId,
          supplierName: supplier.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    console.error('[JSON Feed Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
