import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PermissionsService } from '@/lib/services/docustore';
import { getOrgId } from '../../../sales/_helpers';

const createShareLinkSchema = z.object({
  document_id: z.string().uuid(),
  access_level: z.enum(['read', 'write', 'delete', 'share']).optional(),
  expires_at: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = createShareLinkSchema.parse(body);

    const share = await PermissionsService.createShareLink({
      document_id: validated.document_id,
      access_level: validated.access_level,
      expires_at: validated.expires_at,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: share,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create share link',
      },
      { status: 400 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const documentId = params.id;

    const permissions = await PermissionsService.getDocumentPermissions(documentId);

    // Filter to only share links (we'd need a separate method or filter)
    // For now, return all permissions
    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error: unknown) {
    console.error('Error fetching share links:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch share links',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const shareId = params.id;

    await PermissionsService.revokeShareLink(shareId);

    return NextResponse.json({
      success: true,
      message: 'Share link revoked',
    });
  } catch (error: unknown) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke share link',
      },
      { status: 400 }
    );
  }
}

