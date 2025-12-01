export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { withAuth } from '@/middleware/api-auth';
import type { NextRequest } from 'next/server';
import {
  getCompleteInventory,
  createInventoryItems,
  updateInventoryItems,
  deleteInventoryItems,
} from './complete-handlers';

export const GET = withAuth(async (request: NextRequest) => {
  return getCompleteInventory(request);
});

export const POST = withAuth(async (request: NextRequest) => {
  return createInventoryItems(request);
});

export const PUT = withAuth(async (request: NextRequest) => {
  return updateInventoryItems(request);
});

// DELETE requests are handled through the same bulk update pathway for now
export const DELETE = withAuth(async (request: NextRequest) => {
  return deleteInventoryItems(request);
});
