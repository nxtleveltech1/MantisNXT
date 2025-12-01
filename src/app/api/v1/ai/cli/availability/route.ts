/**
 * API Route: Check CLI Availability for AI Providers
 *
 * This endpoint checks which CLI tools are installed and available
 * for use with AI providers (e.g., Gemini CLI, Claude Code CLI).
 */

import { NextResponse } from 'next/server';
import { checkCLIAvailability } from '@/lib/ai/cli-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[CLI Availability] Starting check...');
    const startTime = Date.now();

    // Run the check - let it complete naturally (Next.js has its own timeout)
    // The individual CLI checks have their own timeouts (3-5s each)
    const availability = await checkCLIAvailability();

    const duration = Date.now() - startTime;
    console.log(`[CLI Availability] Check completed in ${duration}ms:`, {
      hasGoogle: !!availability.google,
      hasOpenai: !!availability.openai,
      hasAnthropic: !!availability.anthropic,
      googleAvailable: availability.google?.available,
      googleVersion: availability.google?.version,
      openaiAvailable: availability.openai?.available,
      openaiVersion: availability.openai?.version,
      anthropicAvailable: availability.anthropic?.available,
      anthropicVersion: availability.anthropic?.version,
    });

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('[CLI Availability] Check failed:', error);
    // Return empty results instead of error to prevent UI breakage
    // The UI will show "Unknown" state instead of breaking
    return NextResponse.json({
      success: true,
      data: {},
    });
  }
}
