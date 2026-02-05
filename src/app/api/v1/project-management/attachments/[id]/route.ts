import { NextRequest, NextResponse } from 'next/server';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePmAuth(request);

    const result = await query(
      `DELETE FROM core.pm_attachment WHERE attachment_id = $1 RETURNING attachment_id`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Attachment not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
