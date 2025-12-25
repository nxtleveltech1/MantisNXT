import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PermissionsService } from '@/lib/services/docustore';
import { getOrgId } from '../../../sales/_helpers';

const grantPermissionSchema = z.object({
  document_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  role_id: z.string().uuid().optional(),
  permission_type: z.enum(['read', 'write', 'delete', 'share']),
  expires_at: z.string().datetime().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const documentId = params.id;

    const permissions = await PermissionsService.getDocumentPermissions(documentId);

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error: unknown) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permissions',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = grantPermissionSchema.parse(body);

    const permission = await PermissionsService.grantPermission({
      document_id: validated.document_id,
      user_id: validated.user_id,
      role_id: validated.role_id,
      permission_type: validated.permission_type,
      expires_at: validated.expires_at,
      granted_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: permission,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error granting permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grant permission',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const permissionId = params.id;

    await PermissionsService.revokePermission(permissionId);

    return NextResponse.json({
      success: true,
      message: 'Permission revoked',
    });
  } catch (error: unknown) {
    console.error('Error revoking permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke permission',
      },
      { status: 400 }
    );
  }
}

