/* eslint-disable @typescript-eslint/no-explicit-any */

import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

import { AIServiceConfigService } from '@/lib/ai/services/AIServiceConfigService';

export interface PriceExtractionRequest {
  orgId: string;
  supplierId?: string;
  serviceId?: string;
  serviceName?: string;
  fileName: string;
  fileBuffer: Buffer;
  instructions?: string;
}

export interface PriceExtractionRow {
  supplier_sku: string;
  name: string;
  brand?: string | null;
  uom?: string | null;
  pack_size?: string | null;
  currency?: string | null;
  list_price?: number | null;
  net_price?: number | null;
  discount_percent?: number | null;
  lead_time_days?: number | null;
  min_order_qty?: number | null;
  notes?: string | null;
  source_row?: number;
}

export interface PriceExtractionResult {
  rows: PriceExtractionRow[];
  summary: {
    row_count: number;
    detected_currency?: string | null;
    model: string;
    provider: string;
  };
  warnings?: string[];
}

const priceExtractionRowSchema = z.object({
  supplier_sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  uom: z.string().nullable().optional(),
  pack_size: z.string().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  list_price: z.number().positive().nullable().optional(),
  net_price: z.number().positive().nullable().optional(),
  discount_percent: z.number().nullable().optional(),
  lead_time_days: z.number().nullable().optional(),
  min_order_qty: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  source_row: z.number().int().positive().optional(),
});

const priceExtractionSchema = z.object({
  items: z.array(priceExtractionRowSchema),
  summary: z
    .object({
      detected_currency: z.string().length(3).nullable().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  warnings: z.array(z.string()).optional(),
});

export class AIPriceExtractionService {
  private aiConfig: AIServiceConfigService;

  constructor() {
    this.aiConfig = new AIServiceConfigService();
  }

  private ensureString(value: any, fallback: string): string {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (value !== null && value !== undefined) {
      const str = String(value).trim();
      if (str.length > 0) return str;
    }
    return fallback;
  }

  private sanitizeResponse(raw: any): any {
    const items = Array.isArray(raw?.items) ? raw.items : [];
    const sanitizedItems = items.map((item: any, idx: number) => {
      const supplier_sku = this.ensureString(item?.supplier_sku, `UNKNOWN_SKU_${idx + 1}`);
      const name = this.ensureString(item?.name, `UNKNOWN_NAME_${idx + 1}`);
      const currency = item?.currency
        ? String(item.currency).toUpperCase()
        : (item?.currency ?? null);
      return {
        ...item,
        supplier_sku,
        name,
        currency,
      };
    });
    return {
      ...raw,
      items: sanitizedItems,
    };
  }

  private unwrapConfig(maybe: any): any | null {
    if (!maybe) return null;
    if (maybe.data) return maybe.data;
    return maybe.id ? maybe : null;
  }

  async extract(req: PriceExtractionRequest): Promise<PriceExtractionResult> {
    if (!req.fileBuffer || !req.fileBuffer.length) {
      throw new Error('File buffer is empty');
    }

    const config =
      this.unwrapConfig(
        req.serviceName && (await this.aiConfig.getConfigByServiceName(req.orgId, req.serviceName))
      ) ||
      this.unwrapConfig(
        req.serviceId && (await this.aiConfig.getConfigByServiceId(req.orgId, req.serviceId))
      ) ||
      this.unwrapConfig(await this.aiConfig.getConfig(req.orgId, 'price_extraction')) ||
      this.unwrapConfig(
        req.serviceName && (await this.aiConfig.getConfigByServiceName('', req.serviceName))
      );
    if (!config || !config.isEnabled) {
      throw new Error(
        `AI price extraction service is not configured for this org; expected service "${req.serviceName || 'Supplier Pricelist Data Extraction'}"`
      );
    }

    const model = this.getModel(config.provider, config.modelName);

    const parsed = await this.readSpreadsheet(req.fileBuffer, req.fileName);
    if (!parsed.rows.length) {
      throw new Error('No rows detected in the uploaded pricing file');
    }

    const prompt = this.buildPrompt({
      fileName: req.fileName,
      headers: parsed.headers,
      rows: parsed.rows.slice(0, 120), // sample first 120 rows to stay within token limits
      instructions: req.instructions,
      supplierId: req.supplierId,
    });

    let text = '';
    try {
      const response = await generateText({
        model,
        prompt,
        temperature: 0.1,
        maxTokens: 3500,
      });
      text = response.text;
    } catch (err: any) {
      const message =
        err?.message ||
        err?.data?.error?.message ||
        'AI provider returned an error while extracting pricing data';
      const requestId =
        err?.responseHeaders?.['x-request-id'] ||
        err?.responseHeaders?.['openai-request-id'] ||
        err?.responseHeaders?.['x-openai-request-id'];
      const code = err?.data?.error?.code || err?.reason || err?.statusCode;
      const detail = [
        message,
        code ? `code=${code}` : null,
        requestId ? `request_id=${requestId}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      throw new Error(`AI provider error: ${detail}`);
    }

    const parsedResponse = this.parseAiResponse(text);
    const sanitized = this.sanitizeResponse(parsedResponse);
    const validated = priceExtractionSchema.parse(sanitized);

    return {
      rows: validated.items.map((item, idx) => ({
        ...item,
        source_row: item.source_row || parsed.rows[idx]?.__rowIndex,
      })),
      summary: {
        row_count: validated.items.length,
        detected_currency: validated.summary?.detected_currency,
        model: config.modelName,
        provider: config.provider,
      },
      warnings: validated.warnings,
    };
  }

  private getModel(provider: string, modelName: string) {
    switch (provider) {
      case 'anthropic':
        return anthropic(modelName || 'claude-3-5-sonnet-20241022');
      case 'azure_openai':
      case 'openai':
        return openai(modelName || 'gpt-4o');
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private async readSpreadsheet(
    fileBuffer: Buffer,
    fileName?: string
  ): Promise<{
    headers: string[];
    rows: Array<Record<string, any> & { __rowIndex: number }>;
  }> {
    if (fileName?.toLowerCase().endsWith('.csv')) {
      const csvRows = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
        bom: true,
      }) as Array<Record<string, any>>;
      if (!csvRows.length) {
        throw new Error('CSV file is empty');
      }
      const headers = Object.keys(csvRows[0] || {})
        .map(h => this.normalizeHeader(h))
        .filter(Boolean);
      if (!headers.length) {
        throw new Error('CSV header row could not be detected.');
      }
      const rows = csvRows.map((row, idx) => {
        const normalized: Record<string, any> & { __rowIndex: number } = { __rowIndex: idx + 2 };
        headers.forEach(header => {
          const candidate =
            row[header] ??
            row[header.toUpperCase()] ??
            row[header.replace(/_/g, ' ')] ??
            row[header.replace(/_/g, '')];
          normalized[header] = candidate;
        });
        return normalized;
      });
      return { headers, rows };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('No worksheet found in uploaded file');
    }

    const [headerRow, ...dataRows] = (sheet.getSheetValues().filter(Boolean) as any[]) || [];
    const headers = Array.isArray(headerRow)
      ? (headerRow || [])
          .slice(1)
          .map((h: string) => this.normalizeHeader(String(h ?? '').trim()))
          .filter(Boolean)
      : [];

    if (!headers.length) {
      throw new Error('Could not detect header row in the uploaded file');
    }

    const rows = dataRows
      .map((row: any[], index: number) => {
        const cells = (row || []).slice(1);
        const record: Record<string, any> & { __rowIndex: number } = { __rowIndex: index + 2 };
        headers.forEach((header, idx) => {
          record[header] = cells[idx];
        });
        return record;
      })
      .filter(row =>
        Object.values(row).some(v => v !== null && v !== undefined && `${v}`.trim() !== '')
      );

    return { headers, rows };
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/__+/g, '_');
  }

  private buildPrompt(input: {
    fileName: string;
    headers: string[];
    rows: Array<Record<string, any> & { __rowIndex: number }>;
    instructions?: string;
    supplierId?: string;
  }): string {
    const rowsPreview = input.rows
      .map(row => JSON.stringify(row))
      .join('\n')
      .slice(0, 8000);

    return `
You are a senior procurement data analyst. Clean and normalize messy supplier price lists into a structured dataset for inventory onboarding.

Input file: ${input.fileName}
Supplier: ${input.supplierId ?? 'unknown'}
Headers detected: ${input.headers.join(', ')}

Sample rows (JSON per row):
${rowsPreview}

Instructions: ${input.instructions || 'Use best judgment to normalize pricing data.'}

Produce JSON only in this shape:
{
  "items": [
    {
      "supplier_sku": "string (required, never null/empty)",
      "name": "string (required, never null/empty)",
      "brand": "string | null",
      "uom": "string | null",
      "pack_size": "string | null",
      "currency": "3-letter code | null",
      "list_price": number | null,
      "net_price": number | null,
      "discount_percent": number | null,
      "lead_time_days": number | null,
      "min_order_qty": number | null,
      "notes": "string | null",
      "source_row": number (original row number)
    }
  ],
  "summary": {
    "detected_currency": "3-letter code or null",
    "notes": "brief notes on assumptions"
  },
  "warnings": ["list issues, empty if none"]
}

Rules:
- Derive supplier_sku even if labeled differently (code, sku, item, id).
- supplier_sku and name MUST NOT be null or empty. If missing, derive from best columns; otherwise use "UNKNOWN_SKU" / "UNKNOWN_NAME".
- Parse pricing: prefer net_price; if only one price, put in list_price and net_price same.
- Normalize currency to 3-letter uppercase; infer from symbols (e.g., $, €, £, R).
- Keep numeric fields as numbers; do not invent values.
- Respect pack_size and UOM if present.
- Keep notes concise for any uncertainties.
Return ONLY the JSON object (no markdown, no code fences, no prose). The first character of the response must be '{'.
`.trim();
  }

  private parseAiResponse(text: string): any {
    const trimmed = text.trim();
    const jsonBlob = this.extractJson(trimmed);
    if (!jsonBlob) {
      try {
        const repaired = jsonrepair(trimmed);
        return JSON.parse(repaired);
      } catch (e) {
        throw new Error(
          'AI response did not include JSON payload. Ensure the AI service uses a response format matching the prompt.'
        );
      }
    }
    try {
      return JSON.parse(jsonBlob);
    } catch (e) {
      try {
        return JSON.parse(jsonrepair(jsonBlob));
      } catch (err) {
        throw new Error('AI response JSON parse error');
      }
    }
  }

  private extractJson(input: string): string | null {
    try {
      if (input.startsWith('{')) {
        JSON.parse(input);
        return input;
      }
    } catch (e) {
      // ignore
    }

    const start = input.indexOf('{');
    const end = input.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const candidate = input.slice(start, end + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch (e) {
        try {
          const trimmed = candidate.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
          JSON.parse(trimmed);
          return trimmed;
        } catch (err) {
          return null;
        }
      }
    }
    return null;
  }
}
