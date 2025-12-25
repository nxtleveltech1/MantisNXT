import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FolderService } from '@/lib/services/docustore';
import { getOrgId } from '../../sales/_helpers';

const createFolderSchema = z.object({
  name: z.string().min(1),
  parent_id: z.string().uuid().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    const tree = await FolderService.getFolderTree(orgId);

    return NextResponse.json({
      success: true,
      data: tree,
    });
  } catch (error: unknown) {
    console.error('Error fetching folder tree:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch folders',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = createFolderSchema.parse(body);

    const folder = await FolderService.createFolder({
      org_id: orgId,
      name: validated.name,
      parent_id: validated.parent_id || null,
      icon: validated.icon,
      color: validated.color,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: folder,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create folder',
      },
      { status: 400 }
    );
  }
}

