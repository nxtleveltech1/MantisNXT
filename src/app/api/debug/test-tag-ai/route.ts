import { NextResponse } from 'next/server';
import { loadTagAIConfig } from '@/lib/cmm/tag-ai/resolver';
import { suggestTagsBatch as engineSuggestTagsBatch } from '@/lib/cmm/tag-ai/engine';

export async function GET() {
  try {
    const config = await loadTagAIConfig();
    if (!config || config.providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No providers configured',
      }, { status: 400 });
    }

    const provider = config.providers[0];
    
    // Create a test product
    const testProduct = {
      supplier_product_id: 'test-123',
      supplier_sku: 'TEST-SKU-001',
      name_from_supplier: 'Test Product',
      brand: 'Test Brand',
      supplier_name: 'Test Supplier',
      supplier_code: 'TEST',
      category_name: 'Test Category',
      uom: 'EA',
      current_price: 10.99,
      currency: 'USD',
      attrs_json: {},
    };

    console.log(`[test-tag-ai] Testing provider: ${provider.provider}, model: ${provider.model}`);
    console.log(`[test-tag-ai] API key prefix: ${provider.apiKey?.substring(0, 20)}...`);

    const result = await engineSuggestTagsBatch(
      provider,
      [testProduct],
      [],
      { timeoutMs: 30000 }
    );

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Engine returned null - check server logs for errors',
        provider: provider.provider,
        model: provider.model,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      provider: provider.provider,
      model: provider.model,
      suggestionsCount: result.suggestions?.length || 0,
      suggestions: result.suggestions,
    });
  } catch (error) {
    console.error('[test-tag-ai] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}






