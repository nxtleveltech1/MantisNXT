import { NextResponse } from 'next/server';
import { loadTagAIConfig } from '@/lib/cmm/tag-ai/resolver';

export async function GET() {
  try {
    const config = await loadTagAIConfig();
    return NextResponse.json({
      success: true,
      config: config
        ? {
            providers: config.providers.map(p => ({
              provider: p.provider,
              hasApiKey: !!p.apiKey,
              apiKeyPrefix: p.apiKey ? p.apiKey.substring(0, 20) + '...' : null,
              baseUrl: p.baseUrl,
              model: p.model,
              enabled: p.enabled,
            })),
            label: config.label,
            defaults: config.defaults,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}







