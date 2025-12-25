import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FolderService } from '@/lib/services/docustore';
import { getOrgId } from '../../../sales/_helpers';

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const folderId = params.id;

    // Get folder tree to find the folder
    const orgId = await getOrgId(request);
    const tree = await FolderService.getFolderTree(orgId);

    // Find folder in tree
    function findFolder(nodes: typeof tree, id: string): typeof tree[0] | null {
      for (const node of nodes) {
        if (node.folder.id === id) {
          return node;
        }
        const found = findFolder(node.children, id);
        if (found) return found;
      }
      return null;
    }

    const folderNode = findFolder(tree, folderId);

    if (!folderNode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Folder not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: folderNode.folder,
    });
  } catch (error: unknown) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch folder',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const folderId = params.id;
    const body = await request.json();
    const validated = updateFolderSchema.parse(body);

    const folder = await FolderService.updateFolder(folderId, validated);

    return NextResponse.json({
      success: true,
      data: folder,
    });
  } catch (error: unknown) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update folder',
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
    const folderId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const moveToFolderId = searchParams.get('move_to') || undefined;

    await FolderService.deleteFolder(folderId, moveToFolderId);

    return NextResponse.json({
      success: true,
      message: 'Folder deleted',
    });
  } catch (error: unknown) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete folder',
      },
      { status: 400 }
    );
  }
}

