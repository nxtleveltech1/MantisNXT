import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { query } from '@/lib/database';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplier_id = formData.get('supplier_id') as string;
    const currency = (formData.get('currency') as string) || 'ZAR';
    const org_id = formData.get('org_id') as string;

    // Validation
    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 50MB limit' },
        { status: 413 }
      );
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
    }

    // Create upload record
    const upload_id = uuid();
    const storage_dir = process.env.FILE_STORAGE_PATH || '/tmp/mantis-pricelists';
    await mkdir(storage_dir, { recursive: true });

    const filename = `${upload_id}-${file.name}`;
    const filepath = join(storage_dir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Create database record
    await query(
      `INSERT INTO spp.pricelist_uploads (
        upload_id, org_id, supplier_id, filename, size_bytes, mime_type, 
        storage_path, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        upload_id,
        org_id,
        supplier_id,
        file.name,
        file.size,
        file.type,
        filepath,
        currency,
        'uploaded',
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          upload_id,
          filename: file.name,
          size_bytes: file.size,
          mime_type: file.type,
          supplier_id,
          status: 'uploaded',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
