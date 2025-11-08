/**
 * AI Services (custom, org-defined)
 * GET  /api/v1/ai/services - list
 * POST /api/v1/ai/services - create
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, handleAIError, successResponse, createdResponse } from '@/lib/ai/api-utils';
import { createService, listServices } from './_store';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const items = await listServices(user.org_id);
    return successResponse(items);
  } catch (error) {
    return handleAIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const label = String(body?.label ?? '').trim();
    const key = (body?.key ? String(body.key).trim() : undefined);
    if (!label) throw new Error('label is required');
    const created = await createService(user.org_id, label, key);
    return createdResponse(created);
  } catch (error) {
    return handleAIError(error);
  }
}


