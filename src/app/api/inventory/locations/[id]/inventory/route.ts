/**
 * GET /api/inventory/locations/[id]/inventory
 *
 * Returns inventory at the given location (same shape as GET /api/inventory filtered by location_id).
 */

import type { NextRequest } from 'next/server';
import { getCompleteInventory } from '@/app/api/inventory/complete-handlers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return Response.json(
      { success: false, error: 'Location ID is required' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const inventoryUrl = new URL('/api/inventory', url.origin);
  inventoryUrl.searchParams.set('location_id', id);
  url.searchParams.forEach((value, key) => {
    inventoryUrl.searchParams.set(key, value);
  });
  if (!inventoryUrl.searchParams.has('limit')) {
    inventoryUrl.searchParams.set('limit', '1000');
  }

  const syntheticRequest = new NextRequest(inventoryUrl.toString(), {
    method: 'GET',
    headers: request.headers,
  });
  return getCompleteInventory(syntheticRequest);
}
