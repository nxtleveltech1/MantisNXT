import { NextRequest, NextResponse } from 'next/server';
import { extractionCache } from '@/lib/services/ExtractionCache';

interface Params {
  jobId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { jobId } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
    const filter = url.searchParams.get('filter') || 'all';

    const cached = await extractionCache.get(jobId);

    if (!cached) {
      return NextResponse.json(
        { success: false, error: 'Preview not available' },
        { status: 404 }
      );
    }

    const { products, summary } = cached;
    let filtered = products;

    if (filter === 'valid') {
      filtered = products.filter((p: any) => p.is_valid);
    } else if (filter === 'invalid') {
      filtered = products.filter((p: any) => !p.is_valid);
    } else if (filter === 'warnings') {
      filtered = products.filter((p: any) => p.validation_warnings.length > 0);
    }

    const start = (page - 1) * limit;
    const paginatedProducts = filtered.slice(start, start + limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          job_id: jobId,
          summary,
          products: paginatedProducts,
          pagination: {
            page,
            limit,
            total: filtered.length,
            pages: Math.ceil(filtered.length / limit),
            has_next: start + limit < filtered.length,
            has_prev: page > 1
          }
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=300'
        }
      }
    );

  } catch (error: any) {
    console.error('[Preview API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
