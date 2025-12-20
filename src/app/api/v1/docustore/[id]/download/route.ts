import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/docustore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'current'; // 'current', 'version', 'artifact'
    const versionId = searchParams.get('version_id');
    const artifactId = searchParams.get('artifact_id');

    // Get document to find storage path
    const document = await DocumentService.getDocumentById(documentId, true);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    let storagePath: string | undefined;
    let filename: string | undefined;
    let mimeType: string = 'application/octet-stream';

    if (type === 'current' && document.current_version) {
      storagePath = document.current_version.storage_path;
      filename = document.current_version.original_filename;
      mimeType = document.current_version.mime_type;
    } else if (type === 'version' && versionId) {
      const version = document.versions?.find(v => v.id === versionId);
      if (!version) {
        return NextResponse.json(
          {
            success: false,
            error: 'Version not found',
          },
          { status: 404 }
        );
      }
      storagePath = version.storage_path;
      filename = version.original_filename;
      mimeType = version.mime_type;
    } else if (type === 'artifact' && artifactId) {
      const artifact = document.artifacts?.find(a => a.id === artifactId);
      if (!artifact) {
        return NextResponse.json(
          {
            success: false,
            error: 'Artifact not found',
          },
          { status: 404 }
        );
      }
      storagePath = artifact.storage_path;
      filename = artifact.filename;
      mimeType = artifact.mime_type;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid download type or missing ID',
        },
        { status: 400 }
      );
    }

    if (!storagePath) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file available for download',
        },
        { status: 404 }
      );
    }

    // Determine storage provider
    const storageProvider =
      type === 'current'
        ? document.current_version?.storage_provider || 'filesystem'
        : type === 'version'
          ? document.versions?.find(v => v.id === versionId)?.storage_provider || 'filesystem'
          : document.artifacts?.find(a => a.id === artifactId)?.storage_provider || 'filesystem';

    // Download file
    const fileContent = await DocumentService.downloadFile(storagePath, storageProvider);

    if (!fileContent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve file',
        },
        { status: 500 }
      );
    }

    // Log download event
    const userId = request.headers.get('x-user-id') || undefined;
    await DocumentService.logDownload(documentId, userId, {
      type,
      version_id: versionId,
      artifact_id: artifactId,
    });

    // Return file
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename || 'download'}"`,
        'Content-Length': fileContent.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/docustore/[id]/download:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download file',
      },
      { status: 500 }
    );
  }
}










