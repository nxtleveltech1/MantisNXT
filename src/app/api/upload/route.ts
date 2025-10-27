import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'); // 10MB default
const ALLOWED_TYPES = (
  process.env.UPLOAD_ALLOWED_TYPES ||
  'image/jpeg,image/png,image/gif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
).split(',');

interface UploadResponse {
  success: boolean;
  message: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadPath?: string;
  error?: string;
}

// Validate file type
function isAllowedFileType(fileType: string): boolean {
  return ALLOWED_TYPES.includes(fileType);
}

// Generate safe filename
function generateSafeFileName(originalName: string): string {
  const fileId = uuidv4();
  const extension = originalName.split('.').pop() || '';
  const safeBaseName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100); // Limit length

  return `${fileId}_${safeBaseName}`;
}

// Ensure upload directory exists
async function ensureUploadDirectory(): Promise<void> {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Validate file size and type
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
    };
  }

  // Check file type
  if (!isAllowedFileType(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
    };
  }

  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

// Scan file for basic security issues
async function scanFileContent(
  buffer: Buffer,
  fileName: string
): Promise<{ safe: boolean; reason?: string }> {
  // Basic checks for potentially dangerous content
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));

  // Check for script tags in files that might be served
  if (fileName.match(/\.(html|htm|svg)$/i) && content.includes('<script')) {
    return { safe: false, reason: 'File contains script tags' };
  }

  // Check for PHP tags
  if (content.includes('<?php') || content.includes('<?=')) {
    return { safe: false, reason: 'File contains PHP code' };
  }

  // Check for executable signatures
  const signatures = [
    'MZ', // Windows executable
    '\x7fELF', // Linux executable
    '#!', // Script shebang
  ];

  for (const sig of signatures) {
    if (content.startsWith(sig)) {
      return { safe: false, reason: 'File appears to be executable' };
    }
  }

  return { safe: true };
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Check if uploads are enabled (optional feature flag)
    if (process.env.DISABLE_UPLOADS === 'true') {
      return NextResponse.json(
        {
          success: false,
          message: 'File uploads are currently disabled',
          error: 'UPLOADS_DISABLED',
        },
        { status: 503 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided',
          error: 'NO_FILE',
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error || 'File validation failed',
          error: 'VALIDATION_FAILED',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Security scan
    const securityScan = await scanFileContent(buffer, file.name);
    if (!securityScan.safe) {
      return NextResponse.json(
        {
          success: false,
          message: `Security check failed: ${securityScan.reason}`,
          error: 'SECURITY_CHECK_FAILED',
        },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await ensureUploadDirectory();

    // Generate safe filename
    const safeFileName = generateSafeFileName(file.name);
    const filePath = join(UPLOAD_DIR, safeFileName);

    // Write file
    await writeFile(filePath, buffer);

    // Log upload (for audit purposes)
    console.log(`File uploaded: ${safeFileName} (${file.size} bytes, ${file.type})`);

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully',
        fileId: safeFileName.split('_')[0], // Return UUID part as file ID
        fileName: safeFileName,
        fileSize: file.size,
        fileType: file.type,
        uploadPath: `/uploads/${safeFileName}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Upload failed due to server error',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

// Get upload configuration
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return NextResponse.json({
      success: true,
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_TYPES,
      uploadEnabled: process.env.DISABLE_UPLOADS !== 'true',
      uploadEndpoint: '/api/upload',
    });
  } catch (error) {
    console.error('Upload config error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve upload configuration',
        error: 'CONFIG_ERROR',
      },
      { status: 500 }
    );
  }
}

// Health check for upload service
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureUploadDirectory();
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
