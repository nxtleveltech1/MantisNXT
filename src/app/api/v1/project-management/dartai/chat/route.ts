import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

const ChatMessageSchema = z.object({
  message: z.string().min(1),
  context: z
    .object({
      taskId: z.string().optional(),
      dartboard: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const body = ChatMessageSchema.parse(await request.json());

    // Dart-AI doesn't expose a public chat API endpoint in their OpenAPI schema.
    // This is a placeholder that can be extended when/if Dart-AI provides chat endpoints,
    // or if we need to integrate with their web-based chat interface.
    // For now, we return a helpful message indicating that direct chat integration
    // requires using Dart-AI's web interface.

    // TODO: If Dart-AI adds chat endpoints, integrate them here.
    // Example structure if available:
    // const client = new DartAiClient();
    // const result = await client.sendChatMessage({ token, message: body.message, context: body.context });

    return NextResponse.json({
      data: {
        response:
          'Chat integration is currently in development. Please use the Dart-AI web interface for full AI chat capabilities. You can manage tasks directly using the task management interface.',
        actions: [],
      },
      error: null,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } },
        { status: 400 }
      );
    }
    return createErrorResponse(error, 500);
  }
}







