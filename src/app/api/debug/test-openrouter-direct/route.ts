import { NextResponse } from 'next/server';
import { loadTagAIConfig } from '@/lib/cmm/tag-ai/resolver';

export async function GET() {
  try {
    const config = await loadTagAIConfig();
    if (!config || config.providers.length === 0) {
      return NextResponse.json({ success: false, error: 'No providers' }, { status: 400 });
    }

    const provider = config.providers[0];

    // Direct fetch to OpenRouter API
    console.log(`[test-openrouter-direct] Testing direct API call`);
    console.log(`[test-openrouter-direct] URL: https://openrouter.ai/api/v1/chat/completions`);
    console.log(`[test-openrouter-direct] API Key prefix: ${provider.apiKey?.substring(0, 30)}...`);
    console.log(`[test-openrouter-direct] Model: ${provider.model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MantisNXT Test',
      },
      body: JSON.stringify({
        model: provider.model || 'openai/gpt-4o',
        messages: [
          {
            role: 'user',
            content: 'Say "test successful" if you can read this.',
          },
        ],
      }),
    });

    const responseText = await response.text();
    console.log(`[test-openrouter-direct] Status: ${response.status}`);
    console.log(`[test-openrouter-direct] Response: ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: responseText,
          details: {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            apiKeyPrefix: provider.apiKey?.substring(0, 30),
            model: provider.model,
          },
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json({
      success: true,
      status: response.status,
      response: data,
      details: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKeyPrefix: provider.apiKey?.substring(0, 30),
        model: provider.model,
      },
    });
  } catch (error) {
    console.error('[test-openrouter-direct] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
