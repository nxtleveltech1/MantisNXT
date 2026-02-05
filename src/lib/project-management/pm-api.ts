import { NextResponse } from 'next/server';
import { PmAuthError } from './pm-auth';

export function handlePmError(error: unknown) {
  if (error instanceof PmAuthError) {
    const statusMap: Record<string, number> = {
      AUTH_REQUIRED: 401,
      ORG_REQUIRED: 400,
      USER_NOT_SYNCED: 409,
      PROJECT_NOT_FOUND: 404,
      PROJECT_FORBIDDEN: 403,
    };

    return NextResponse.json(
      {
        data: null,
        error: { code: error.code, message: error.message },
      },
      { status: statusMap[error.code] || 400 }
    );
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  return NextResponse.json(
    {
      data: null,
      error: { code: 'SERVER_ERROR', message },
    },
    { status: 500 }
  );
}
