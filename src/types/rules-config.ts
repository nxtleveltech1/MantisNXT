import { z } from 'zod'

export const JoinSheetsConfigSchema = z.object({
  left_sheet: z.string().min(1),
  right_sheet: z.string().min(1),
  join_on: z.object({ left: z.string().min(1), right: z.string().min(1) }),
  drop_right: z.array(z.string()).optional().default([]),
  output_map: z.object({
    sku: z.object({ sheet: z.string().optional(), column: z.string().optional() }).optional(),
    description: z.object({ sheet: z.string().optional(), column: z.string().optional() }).optional(),
    priceExVat: z.object({ sheet: z.string().optional(), column: z.string().optional() }).optional(),
    brand: z.object({ source: z.string().optional() }).optional(),
    category: z.object({ sheet: z.string().optional(), column: z.string().optional() }).optional(),
  }).partial(),
  sheet_matcher: z
    .object({ type: z.enum(['exact', 'includes', 'fuzzy']).optional(), threshold: z.number().min(0).max(1).optional() })
    .optional(),
  conditions: z
    .object({
      tab_count_min: z.number().int().nonnegative().optional(),
      sheet_names_include: z.array(z.string()).optional(),
      file_name_matches: z.string().optional(),
      mime_type: z.string().optional(),
    })
    .optional(),
})

export const AliasesConfigSchema = z.record(z.array(z.string()))

export const SupplierRuleConfigSchema = z
  .object({
    join_sheets: JoinSheetsConfigSchema.optional(),
    aliases: AliasesConfigSchema.optional(),
    conditions: z
      .object({
        sheet_name_matches: z.string().optional(),
        activated: z.boolean().optional(),
      })
      .optional(),
  })
  .catchall(z.unknown())

export const SupplierRulePayloadSchema = z.object({
  supplier_id: z.string().uuid(),
  rule_name: z.string().min(2),
  rule_type: z.enum(['validation', 'transformation', 'approval', 'notification', 'enforcement']),
  trigger_event: z.string().default('pricelist_upload'),
  execution_order: z.number().int().nonnegative().default(0),
  rule_config: SupplierRuleConfigSchema,
  is_blocking: z.boolean().default(false),
})

export type SupplierRulePayload = z.infer<typeof SupplierRulePayloadSchema>
export type JoinSheetsConfig = z.infer<typeof JoinSheetsConfigSchema>