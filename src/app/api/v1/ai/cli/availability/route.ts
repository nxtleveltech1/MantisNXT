/**
 * API Route: Check CLI Availability for AI Providers
 * 
 * This endpoint checks which CLI tools are installed and available
 * for use with AI providers (e.g., Gemini CLI, Claude Code CLI).
 */

import { NextResponse } from 'next/server';
import { checkCLIAvailability } from '@/lib/ai/cli-provider';

export async function GET() {
  try {
    const availability = await checkCLIAvailability();
    
    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('CLI availability check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check CLI availability',
      },
      { status: 500 }
    );
  }
}

