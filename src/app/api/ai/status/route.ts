import { NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/ai';
import { getAllProviderHealthStatus } from '@/lib/ai/providers';

export async function GET() {
  try {
    const cfg = getAIConfig();
    const health = getAllProviderHealthStatus();
    return NextResponse.json({
      success: true,
      data: {
        enabled: cfg.enableFeatures,
        defaultProvider: cfg.defaultProvider,
        enableFallback: cfg.enableFallback,
        providers: Object.values(cfg.providers).map(p => ({
          id: p.id,
          enabled: p.enabled,
          model: p.model,
        })),
        health,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load AI status' },
      { status: 500 }
    );
  }
}
