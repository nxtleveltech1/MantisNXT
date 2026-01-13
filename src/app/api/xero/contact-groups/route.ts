/**
 * Xero Contact Groups API
 *
 * GET /api/xero/contact-groups - Fetch contact groups
 * POST /api/xero/contact-groups - Create contact group
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncContactGroupToXero,
  fetchContactGroupsFromXero,
  addContactsToContactGroup,
} from '@/lib/xero/sync/contact-groups';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const result = await fetchContactGroupsFromXero(orgId);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Contact Groups');
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const body = await request.json();
    const { name, contactIds } = body as { name: string; contactIds?: string[] };

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await syncContactGroupToXero(orgId, { name, contactIds });
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Contact Groups');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;
    const { id } = await params;

    const body = await request.json();
    const { contactIds } = body as { contactIds: string[] };

    if (!contactIds || !Array.isArray(contactIds)) {
      return NextResponse.json(
        { error: 'contactIds is required and must be an array' },
        { status: 400 }
      );
    }

    const result = await addContactsToContactGroup(orgId, id, contactIds);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Contact Groups');
  }
}
