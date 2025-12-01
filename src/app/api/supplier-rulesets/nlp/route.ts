import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AIService, isAIEnabled } from '@/lib/ai';
import { SupplierRuleConfigSchema } from '@/types/rules-config';

const RequestSchema = z.object({
  supplier_id: z.string().uuid(),
  instruction: z.string().min(10),
  context: z
    .object({
      sheet_names: z.array(z.string()).optional(),
      columns: z.array(z.string()).optional(),
      examples: z.array(z.string()).optional(),
    })
    .optional(),
});

function buildPrompt(instruction: string, ctx?: unknown): string {
  const schemaShape = `{
  "join_sheets"?: {
    "left_sheet": string,
    "right_sheet": string,
    "join_on": { "left": string, "right": string },
    "drop_right"?: string[],
    "output_map"?: {
      "sku"?: { "sheet"?: "left"|"right", "column"?: string },
      "description"?: { "sheet"?: "left"|"right", "column"?: string },
      "priceExVat"?: { "sheet"?: "left"|"right", "column"?: string },
      "brand"?: { "source"?: "sheet_name" },
      "category"?: { "sheet"?: "left"|"right", "column"?: string }
    },
    "sheet_matcher"?: { "type"?: "exact"|"includes"|"fuzzy", "threshold"?: number }
  },
  "aliases"?: Record<string, string[]>,
  "conditions"?: { "tab_count_min"?: number, "sheet_names_include"?: string[], "file_name_matches"?: string, "mime_type"?: string }
}`;
  return [
    'You are a rules synthesis engine for supplier pricelist processing.',
    'Given a natural-language instruction, output ONLY JSON matching this shape:',
    schemaShape,
    'Rules must be deterministic and executable by our pipeline.',
    'Do not include Markdown code fences or commentary. Return valid JSON.',
    'Instruction:',
    instruction,
    ctx ? `Context: ${JSON.stringify(ctx)}` : '',
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, instruction, context } = RequestSchema.parse(body);

    if (!isAIEnabled()) {
      return NextResponse.json({ success: false, error: 'AI service disabled' }, { status: 503 });
    }

    const ai = new AIService();
    const prompt = buildPrompt(instruction, context);
    const result = await ai.generateText(prompt, { temperature: 0.1 });
    const text = result?.text?.trim() || '';

    const jsonMatch = text.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: 'AI did not return JSON' },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = SupplierRuleConfigSchema.parse(parsed);

    return NextResponse.json({ success: true, data: validated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to synthesize rule' },
      { status: 400 }
    );
  }
}
