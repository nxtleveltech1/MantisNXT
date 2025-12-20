import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CourierProviderService } from '@/lib/services/logistics';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = await getOrgId(request);
    const provider = await CourierProviderService.getCourierProviderById(params.id, orgId);

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Courier provider not found' },
        { status: 404 }
      );
    }

    const { createCourierClient } = await import('@/lib/services/logistics/CourierProviderClients');
    const client = createCourierClient(provider, provider.api_credentials || {});
    const ok = await client.validateCredentials();

    return NextResponse.json({
      success: true,
      data: { ok },
      message: ok ? 'Credentials validated successfully' : 'Credential validation failed',
    });
  } catch (error) {
    console.error('Error validating courier credentials:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate credentials',
      },
      { status: 500 }
    );
  }
}




