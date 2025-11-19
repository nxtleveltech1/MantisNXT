import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import * as XLSX from 'xlsx'
import { pricelistService } from '@/lib/services/PricelistService'
import { applyPricelistRulesToExcel, getSupplierRules, logRuleExecution } from '@/lib/cmm/supplier-rules-engine-enhanced'
import { AIService, isAIEnabled } from '@/lib/ai'
import { applyVatPolicyToRows } from '@/lib/cmm/vat-utils'

async function auditStart(supplier_id: string | null, upload_id: string | null, action: string) {
  const res = await query(
    `INSERT INTO public.ai_agent_audit (supplier_id, upload_id, action, status, details)
     VALUES ($1, $2, $3, 'started', '{}'::jsonb)
     RETURNING id`,
    [supplier_id, upload_id, action]
  )
  return res.rows[0].id as number
}

async function auditFinish(id: number, status: string, details: unknown) {
  await query(
    `UPDATE public.ai_agent_audit
     SET status = $1, details = $2::jsonb, finished_at = NOW()
     WHERE id = $3`,
    [status, JSON.stringify(details ?? {}), id]
  )
}

async function aiExtractRows(buffer: Buffer, filename: string): Promise<any[]> {
  if (!isAIEnabled()) return []
  try {
    const ai = new AIService()
    const isExcel = filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')
    let prompt = 'Extract supplier pricelist rows from messy spreadsheet. Provide JSON array of objects with fields: supplier_sku, name, brand, uom, pack_size, price, currency, category_raw, vat_code, barcode.'
    prompt += `\nFilename: ${filename}`
    if (isExcel) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const summaries = wb.SheetNames.slice(0, 12).map(n => {
        const ws = wb.Sheets[n]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
        const headers = (rows[0] || []).slice(0, 20)
        const samples = rows.slice(1, 6).map(r => (r || []).slice(0, 20))
        return { name: n, headers, samples }
      })
      prompt += '\nWorkbook summary: ' + JSON.stringify(summaries)
    } else {
      const text = buffer.toString('utf-8')
      const lines = text.split(/\r?\n/).slice(0, 50)
      prompt += '\nText sample: ' + JSON.stringify(lines)
    }
    prompt += '\nReturn ONLY JSON array, no commentary.'
    const res = await ai.generateText(prompt, { temperature: 0 })
    const txt = (res?.text || '').trim()
    const m = txt.match(/\[([\s\S]*)\]$/)
    const json = JSON.parse(m ? m[0] : txt)
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

/**
 * Validate rows according to supplier rules and canonical schema
 */
async function validateRows(
  rows: any[],
  supplierId: string,
  uploadId: string
): Promise<{ valid: any[]; errors: any[]; warnings: any[] }> {
  const rules = await getSupplierRules(supplierId, 'pricelist_upload')
  const validationRules = rules.filter(r => r.ruleType === 'validation')
  
  const valid: any[] = []
  const errors: any[] = []
  const warnings: any[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowErrors: string[] = []
    const rowWarnings: string[] = []

    // Check hard requirements (canonical schema)
    if (!row.supplier_sku || !row.supplier_sku.trim()) {
      rowErrors.push('Missing supplier_sku')
    }
    if (!row.name || !row.name.trim()) {
      rowErrors.push('Missing name')
    }
    if (!row.cost_price_ex_vat || row.cost_price_ex_vat <= 0) {
      rowErrors.push('Missing or invalid cost_price_ex_vat')
    }

    // Check validation rules
    for (const rule of validationRules) {
      const config = rule.ruleConfig as any
      if (config.field && config.required) {
        const value = row[config.field]
        if (value === null || value === undefined || value === '') {
          if (rule.isBlocking) {
            rowErrors.push(config.warning_message || `${config.field} is required`)
          } else {
            rowWarnings.push(config.warning_message || `${config.field} is missing`)
          }
        }
      }
    }

    // Check for missing optional fields (warnings)
    if (!row.category_raw || !row.category_raw.trim()) {
      rowWarnings.push('Missing category_raw')
    }
    if (!row.stock_on_hand && row.stock_on_hand !== 0) {
      rowWarnings.push('Missing stock_on_hand')
    }
    if (!row.vat_rate && row.vat_rate !== 0) {
      rowWarnings.push('Missing vat_rate')
    }

    if (rowErrors.length > 0) {
      errors.push({
        row_num: i + 1,
        field: 'multiple',
        reason: rowErrors.join('; '),
        proposed_fix: 'Check required fields'
      })
    } else {
      valid.push(row)
    }

    if (rowWarnings.length > 0) {
      warnings.push(...rowWarnings.map(w => ({ row_num: i + 1, message: w })))
    }
  }

  return { valid, errors, warnings }
}

export async function POST(request: NextRequest) {
  try {
    const ct = request.headers.get('content-type') || ''
    let action: string | null = null
    let upload_id: string | null = null
    let supplier_id: string | null = null
    let file: File | null = null
    let currency: string | null = null
    let valid_from: string | null = null
    let auto_validate = false
    let auto_merge = false
    let allow_ai_fallback = false

    if (ct.includes('multipart/form-data')) {
      const form = await request.formData()
      action = (form.get('action') as string) || 'upload_and_validate'
      file = form.get('file') as File | null
      supplier_id = (form.get('supplier_id') as string) || null
      currency = (form.get('currency') as string) || null
      valid_from = (form.get('valid_from') as string) || null
      auto_validate = form.get('auto_validate') === 'true'
      auto_merge = form.get('auto_merge') === 'true'
      allow_ai_fallback = form.get('allow_ai_fallback') === 'true'
    } else {
      const body = await request.json()
      action = body?.action
      upload_id = body?.upload_id ?? null
      supplier_id = body?.supplier_id ?? null
      allow_ai_fallback = body?.allow_ai_fallback ?? false
    }

    if (!action) {
      return NextResponse.json({ success: false, error: 'action required' }, { status: 400 })
    }

    const auditId = await auditStart(supplier_id, upload_id, action)

    let result: any = null

    if (action === 'validate') {
      if (!upload_id) {
        await auditFinish(auditId, 'failed', { step: 'validate', error: 'upload_id required' })
        return NextResponse.json({ success: false, error: 'upload_id required' }, { status: 400 })
      }
      try {
        const validation = await pricelistService.validateUpload(upload_id)
        await auditFinish(auditId, 'completed', {
          step: 'validate', status: validation.status,
          errors: validation.errors?.length || validation.errors || 0,
          warnings: validation.warnings?.length || validation.warnings || 0
        })
        return NextResponse.json({ success: true, data: validation })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Validation error'
        await auditFinish(auditId, 'failed', { step: 'validate', error: message })
        return NextResponse.json({ success: false, error: message }, { status: 500 })
      }
    }

    if (action === 'apply_rules_and_validate') {
      if (!upload_id) {
        await auditFinish(auditId, 'failed', { step: 'apply_rules', error: 'upload_id required' })
        return NextResponse.json({ success: false, error: 'upload_id required' }, { status: 400 })
      }

      try {
        // Get upload details
        const uploadResult = await query(`
          SELECT * FROM spp.pricelist_upload WHERE upload_id = $1
        `, [upload_id])
        
        if (uploadResult.rows.length === 0) {
          await auditFinish(auditId, 'failed', { step: 'apply_rules', error: 'Upload not found' })
          return NextResponse.json({ success: false, error: 'Upload not found' }, { status: 404 })
        }

        const upload = uploadResult.rows[0]
        
        // Apply supplier rules
        const rulesResult = await applyPricelistRulesToExcel(
          Buffer.from(upload.storage_path, 'base64'),
          upload.supplier_id
        )

        // Log rule executions
        for (const execution of rulesResult.executionLog) {
          await logRuleExecution(upload.supplier_id, upload_id, 
            { id: execution.ruleId, ruleName: execution.ruleName, ruleType: execution.ruleType, executionOrder: execution.ruleId, supplierId: upload.supplier_id, triggerEvent: 'pricelist_upload', ruleConfig: {}, isBlocking: execution.blocked },
            execution
          )
        }

        // Validate the processed rows
        const validation = await validateRows(rulesResult.rows, upload.supplier_id, upload_id)

        await auditFinish(auditId, 'completed', {
          step: 'apply_rules_and_validate',
          rows_processed: rulesResult.rows.length,
          rules_executed: rulesResult.executionLog.length,
          validation: validation
        })

        return NextResponse.json({
          success: true,
          data: {
            upload_id,
            validation: {
              totals: {
                rows: rulesResult.rows.length,
                valid: validation.valid.length,
                errors: validation.errors.length,
                warnings: validation.warnings.length
              },
              errors: validation.errors.slice(0, 10), // First 10 errors
              warnings: validation.warnings
            }
          }
        })

      } catch (error) {
        await auditFinish(auditId, 'failed', { 
          step: 'apply_rules', 
          error: error instanceof Error ? error.message : String(error) 
        })
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Rule application failed' 
        }, { status: 500 })
      }
    }

    if (action === 'upload_and_validate') {
      if (!file || !supplier_id) {
        await auditFinish(auditId, 'failed', { reason: 'missing file or supplier_id' })
        return NextResponse.json({ success: false, error: 'file and supplier_id required' }, { status: 400 })
      }

      const upload = await pricelistService.createUpload({
        supplier_id: supplier_id,
        file,
        filename: file.name,
        currency: currency || 'ZAR',
        valid_from: valid_from ? new Date(valid_from) : undefined,
        options: { auto_validate: true, auto_merge: false }
      })
      upload_id = upload.upload_id
      await auditFinish(auditId, 'received', { step: 'upload', upload_id })
      const sessionId = await auditStart(supplier_id, upload_id, 'session_started')
      await auditFinish(sessionId, 'started', { filename: file.name, size: (file as any).size, mime: (file as any).type })

      // Load supplier rules first - rules execute before heuristics/AI
      const rulesAuditId = await auditStart(supplier_id, upload_id, 'rules_check')
      const supplierRules = await getSupplierRules(supplier_id, 'pricelist_upload')
      
      if (supplierRules.length > 0) {
        await auditFinish(rulesAuditId, 'completed', { 
          rules_found: supplierRules.length,
          rule_types: supplierRules.map(r => r.ruleType)
        })
        
        // Apply supplier rules to the uploaded file
        const rulesAuditId2 = await auditStart(supplier_id, upload_id, 'rules_execution')
        
        try {
          const buf = Buffer.from(await file.arrayBuffer())
          const rulesResult = await applyPricelistRulesToExcel(buf, supplier_id)
          
          // Log rule executions
          for (const execution of rulesResult.executionLog) {
            await logRuleExecution(supplier_id, upload_id, 
              { id: execution.ruleId, ruleName: execution.ruleName, ruleType: execution.ruleType, executionOrder: execution.ruleId, supplierId: supplier_id, triggerEvent: 'pricelist_upload', ruleConfig: {}, isBlocking: execution.blocked },
              execution
            )
          }
          
          await auditFinish(rulesAuditId2, 'completed', {
            rows_processed: rulesResult.rows.length,
            rules_executed: rulesResult.executionLog.length,
            processing_method: 'supplier_rules',
            ai_fallback_used: false
          })

          // Apply VAT policy to normalize prices
          const vatAuditId = await auditStart(supplier_id, upload_id, 'vat_normalization')
          const vatResult = await applyVatPolicyToRows(rulesResult.rows, supplier_id)
          await auditFinish(vatAuditId, 'completed', {
            rows_processed: vatResult.rows.length,
            warnings: vatResult.warnings.length,
            price_sources: vatResult.priceSources
          })

          // Validate the processed rows
          const validation = await validateRows(vatResult.rows, supplier_id, upload_id)
          
          // Insert validated rows
          if (validation.valid.length > 0) {
            await pricelistService.insertRows(upload_id, validation.valid)
          }

          return NextResponse.json({
            success: true,
            data: {
              upload_id,
              processing_method: 'supplier_rules',
              ai_fallback_used: false,
              validation: {
                totals: {
                  rows: vatResult.rows.length,
                  valid: validation.valid.length,
                  errors: validation.errors.length,
                  warnings: validation.warnings.length + vatResult.warnings.length
                },
                errors: validation.errors.slice(0, 10), // First 10 errors
                warnings: [...validation.warnings, ...vatResult.warnings]
              }
            }
          })

        } catch (error) {
          await auditFinish(rulesAuditId2, 'failed', { 
            error: error instanceof Error ? error.message : String(error) 
          })
          // Fall back to AI extraction if rules fail
        }
      } else {
        await auditFinish(rulesAuditId, 'completed', { rules_found: 0 })
      }

      // Fallback to AI extraction if no rules or rules failed
      let aiSummary: any = null
      let aiDataInserted = false
      
      try {
        if (isAIEnabled() && allow_ai_fallback) {
          // AI extraction allowed - proceed with fallback
          const ai = new AIService()
          const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
          let prompt = 'Analyze supplier pricelist structure and propose robust extraction plan. File: ' + file.name
          const buf = Buffer.from(await file.arrayBuffer())
          if (isExcel) {
            const wb = XLSX.read(buf, { type: 'buffer' })
            const sheetInfo = wb.SheetNames.slice(0, 8).map(n => {
              const ws = wb.Sheets[n]
              const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
              const headers = (rows[0] || []).slice(0, 12)
              return { name: n, headers }
            })
            prompt += '\nSheets: ' + JSON.stringify(sheetInfo)
          } else {
            const textSample = buf.toString('utf-8').split(/\r?\n/).slice(0, 5)
            prompt += '\nSample: ' + JSON.stringify(textSample)
          }
          prompt += '\nOutput JSON only with fields: join_sheets?, aliases?, conditions?, notes.'
          const res = await ai.generateText(prompt, { temperature: 0.1 })
          aiSummary = res?.text || null
          const reviewId = await auditStart(supplier_id, upload_id, 'ai_review')
          await auditFinish(reviewId, 'completed', { summary: aiSummary })
        } else if (!allow_ai_fallback) {
          // AI fallback not allowed - return error
          await auditFinish(auditId, 'failed', { 
            error: 'No supplier rules found and AI fallback not allowed',
            rules_found: 0,
            ai_fallback_allowed: false
          })
          return NextResponse.json({ 
            success: false, 
            error: 'No supplier rules configured for this supplier and AI fallback is disabled. Please configure supplier rules or enable AI fallback.' 
          }, { status: 400 })
        } else {
          // AI not enabled and no rules - return error
          await auditFinish(auditId, 'failed', { 
            error: 'No supplier rules found and AI not enabled',
            rules_found: 0,
            ai_enabled: false
          })
          return NextResponse.json({ 
            success: false, 
            error: 'No supplier rules configured for this supplier and AI is not enabled. Please configure supplier rules or enable AI.' 
          }, { status: 400 })
        }
      } catch (e) {
        const reviewFailId = await auditStart(supplier_id, upload_id, 'ai_review')
        await auditFinish(reviewFailId, 'failed', { error: e instanceof Error ? e.message : String(e) })
      }

      // Continue with existing AI extraction logic as fallback
      try {
        const buf = Buffer.from(await file.arrayBuffer())
        // AI-first structured extraction
        const aiRowsImmediate = await aiExtractRows(buf, file.name)
        if (aiRowsImmediate.length) {
          // Apply VAT policy to AI extracted rows
          const vatAuditId = await auditStart(supplier_id, upload_id, 'vat_normalization_ai')
          const vatResult = await applyVatPolicyToRows(aiRowsImmediate, supplier_id)
          await auditFinish(vatAuditId, 'completed', {
            rows_processed: vatResult.rows.length,
            warnings: vatResult.warnings.length,
            price_sources: vatResult.priceSources
          })

          const mappedAiImmediate = vatResult.rows.map((row: any, idx: number) => ({
            upload_id,
            row_num: idx + 1,
            supplier_sku: row.supplier_sku || row.sku || '',
            name: row.name || row.description || '',
            brand: row.brand || undefined,
            uom: row.uom || 'EA',
            pack_size: row.pack_size || undefined,
            cost_price_ex_vat: row.cost_price_ex_vat || 0,
            price_incl_vat: row.price_incl_vat || undefined,
            vat_rate: row.vat_rate || 0.15,
            currency: row.currency || currency || 'ZAR',
            category_raw: row.category_raw || row.category || undefined,
            stock_on_hand: row.stock_on_hand || 0,
            stock_on_order: row.stock_on_order || 0,
            barcode: row.barcode || undefined,
            attrs_json: {},
          }))
          const aiExtractionId = await auditStart(supplier_id, upload_id, 'ai_extraction')
          const aiInserted = await pricelistService.insertRows(upload_id!, mappedAiImmediate)
          await auditFinish(aiExtractionId, 'completed', { 
            rows_inserted: aiInserted,
            processing_method: 'ai_fallback',
            ai_fallback_used: true,
            ai_summary: aiSummary
          })
          const aiValidationId = await auditStart(supplier_id, upload_id, 'validation')
          const aiValidation = await pricelistService.validateUpload(upload_id!)
          await auditFinish(aiValidationId, 'completed', { 
            status: aiValidation.status, 
            errors: aiValidation.errors?.length || 0, 
            warnings: aiValidation.warnings?.length || 0,
            processing_method: 'ai_fallback',
            ai_fallback_used: true
          })
          return NextResponse.json({ 
            success: true, 
            data: { 
              upload_id, 
              validation: aiValidation,
              ai_fallback_used: true,
              ai_rows_inserted: aiInserted
            } 
          })
        }
        
        let rows: any[] = []
        let usedJoin = false
        if (typeof aiSummary === 'string') {
          const m = aiSummary.match(/\{[\s\S]*\}$/)
          if (m) {
            try {
              const cfg = JSON.parse(m[0])
              if (cfg && cfg.join_sheets) {
                const joined = applyJoinSheetsConfigFromBuffer(buf, cfg.join_sheets)
                if (joined && joined.length) {
                  rows = joined
                  usedJoin = true
                }
              }
            } catch {}
          }
        }
        const isCSV = file.name.toLowerCase().endsWith('.csv') || (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls'))
        if (!usedJoin && isCSV) {
          const text = buf.toString('utf-8')
          const lines = text.split(/\r?\n/).filter(l => l.trim())
          if (lines.length) {
            const firstLine = lines[0]
            const semicolonCount = (firstLine.match(/;/g) || []).length
            const commaCount = (firstLine.match(/,/g) || []).length
            const delimiter = semicolonCount > commaCount ? ';' : ','
            const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
            rows = lines.slice(1).map(line => {
              const values: string[] = []
              let current = ''
              let inQ = false
              for (const ch of line) {
                if (ch === '"') inQ = !inQ
                else if (ch === delimiter && !inQ) { values.push(current.trim().replace(/^"|"$/g, '')); current = '' }
                else current += ch
              }
              values.push(current.trim().replace(/^"|"$/g, ''))
              const o: any = {}
              headers.forEach((h, i) => { o[h] = values[i] || '' })
              return o
            })
          }
        } else if (!usedJoin) {
          const wb = XLSX.read(buf, { type: 'buffer' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        }

        // Apply VAT policy to extracted rows
        const vatAuditId2 = await auditStart(supplier_id, upload_id, 'vat_normalization_fallback')
        const vatResult2 = await applyVatPolicyToRows(rows, supplier_id)
        await auditFinish(vatAuditId2, 'completed', {
          rows_processed: vatResult2.rows.length,
          warnings: vatResult2.warnings.length,
          price_sources: vatResult2.priceSources
        })

        const parsePrice = (value: unknown): number => {
          if (!value && value !== 0) return 0
          if (typeof value === 'number') return Math.max(0, value)
          const str = String(value).trim()
          if (!str) return 0
          const cleaned = str.replace(/^[R$€£¥₹]\s*/i, '').replace(/,/g, '').replace(/\s+/g, '').trim()
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? 0 : Math.max(0, parsed)
        }
        const getColumn = (row: any, names: string[]) => {
          const keys = Object.keys(row)
          for (const name of names) {
            if (row[name] !== undefined) return row[name]
            const found = keys.find(k => k.toLowerCase() === name.toLowerCase())
            if (found) return row[found]
          }
          return undefined
        }
        const mapped = vatResult2.rows.map((row: any, idx: number) => {
          if (usedJoin) {
            return {
              upload_id,
              row_num: idx + 1,
              supplier_sku: row['sku'] || row['part'] || '',
              name: row['description'] || row['name'] || '',
              brand: row['brand'] || undefined,
              uom: 'EA',
              pack_size: undefined,
              cost_price_ex_vat: row['cost_price_ex_vat'] || parsePrice(row['priceExVat'] ?? row['price_ex_vat']),
              price_incl_vat: row['price_incl_vat'] || undefined,
              vat_rate: row['vat_rate'] || 0.15,
              currency: currency || 'ZAR',
              category_raw: row['category'] || undefined,
              stock_on_hand: row['stock_on_hand'] || 0,
              stock_on_order: row['stock_on_order'] || 0,
              barcode: undefined,
              attrs_json: {},
            }
          } else {
            const supplierSku = getColumn(row, ['SKU / MODEL','SKU/MODEL','SKU','MODEL','Code','Item Code','Product Code']) || ''
            const productName = getColumn(row, ['PRODUCT DESCRIPTION','Product Description','Description','Name','Product Name','Item Name']) || ''
            const brand = getColumn(row, ['BRAND','Brand','Manufacturer','Make'])
            const category = getColumn(row, ['Produt Category','Product Category','Category','Type','Group','Class'])
            const priceValue = getColumn(row, ['COST  EX VAT','COST EX VAT','Cost Ex VAT','Cost','Price','Unit Price','Unit Cost','COST','PRICE'])
            const uom = getColumn(row, ['UOM','Unit','Unit of Measure','Pack Size']) || 'EA'
            const packSize = getColumn(row, ['Pack Size','Package','Packing'])
            const barcode = getColumn(row, ['Barcode','EAN','UPC','GTIN'])
            const stockQty = getColumn(row, ['SUPPLIER SOH','Supplier SOH','SOH','Stock','Quantity','Qty','Stock On Hand'])
            const attrs: any = {}
            if (stockQty) attrs.stock_qty = parseInt(String(stockQty)) || 0
            if (getColumn(row, ['QTY ON ORDER'])) attrs.qty_on_order = parseInt(String(getColumn(row, ['QTY ON ORDER']))) || 0
            if (getColumn(row, ['NEXT SHIPMENT'])) attrs.next_shipment = getColumn(row, ['NEXT SHIPMENT'])
            if (getColumn(row, ['Tags'])) attrs.tags = getColumn(row, ['Tags'])
            if (getColumn(row, ['Links'])) attrs.links = getColumn(row, ['Links'])
            if (getColumn(row, ['Brand Sub Tag'])) attrs.brand_sub_tag = getColumn(row, ['Brand Sub Tag'])
            return {
              upload_id,
              row_num: idx + 1,
              supplier_sku: supplierSku,
              name: productName,
              brand: brand || undefined,
              uom: uom || 'EA',
              pack_size: packSize || undefined,
              cost_price_ex_vat: row['cost_price_ex_vat'] || parsePrice(priceValue),
              price_incl_vat: row['price_incl_vat'] || undefined,
              vat_rate: row['vat_rate'] || 0.15,
              currency: currency || 'ZAR',
              category_raw: category || undefined,
              stock_on_hand: row['stock_on_hand'] || attrs.stock_qty || 0,
              stock_on_order: row['stock_on_order'] || attrs.qty_on_order || 0,
              barcode: barcode || undefined,
              attrs_json: attrs,
            }
          }
        })

        const inserted = await pricelistService.insertRows(upload_id!, mapped)
        const extractionId = await auditStart(supplier_id, upload_id, 'extraction')
        await auditFinish(extractionId, 'completed', { rows_inserted: inserted })

        let validation = await pricelistService.validateUpload(upload_id!)
        const validationId = await auditStart(supplier_id, upload_id, 'validation')
        await auditFinish(validationId, 'completed', { status: validation.status, errors: validation.errors?.length || 0, warnings: validation.warnings?.length || 0 })

        if (validation.status !== 'ok') {
          const aiRows = await aiExtractRows(buf, file.name)
          if (aiRows.length) {
            // Apply VAT policy to AI extracted rows
            const vatAuditId3 = await auditStart(supplier_id, upload_id, 'vat_normalization_ai_fallback')
            const vatResult3 = await applyVatPolicyToRows(aiRows, supplier_id)
            await auditFinish(vatAuditId3, 'completed', {
              rows_processed: vatResult3.rows.length,
              warnings: vatResult3.warnings.length,
              price_sources: vatResult3.priceSources
            })

            const mappedAi = vatResult3.rows.map((row: any, idx: number) => ({
              upload_id,
              row_num: idx + 1,
              supplier_sku: row.supplier_sku || row.sku || '',
              name: row.name || row.description || '',
              brand: row.brand || undefined,
              uom: row.uom || 'EA',
              pack_size: row.pack_size || undefined,
              cost_price_ex_vat: row.cost_price_ex_vat || 0,
              price_incl_vat: row.price_incl_vat || undefined,
              vat_rate: row.vat_rate || 0.15,
              currency: row.currency || currency || 'ZAR',
              category_raw: row.category_raw || row.category || undefined,
              stock_on_hand: row.stock_on_hand || 0,
              stock_on_order: row.stock_on_order || 0,
              barcode: row.barcode || undefined,
              attrs_json: {},
            }))
            const aiExtractionId = await auditStart(supplier_id, upload_id, 'ai_extraction')
            const aiInserted = await pricelistService.insertRows(upload_id!, mappedAi)
            await auditFinish(aiExtractionId, 'completed', { rows_inserted: aiInserted })
            const aiValidationId = await auditStart(supplier_id, upload_id, 'validation')
            validation = await pricelistService.validateUpload(upload_id!)
            await auditFinish(aiValidationId, 'completed', { status: validation.status, errors: validation.errors?.length || 0, warnings: validation.warnings?.length || 0 })
          }
        }

        await auditFinish(auditId, 'completed', { step: 'upload_and_validate', upload_id })
        return NextResponse.json({ success: true, data: { upload_id, validation } })
      } catch (e) {
        await auditFinish(auditId, 'failed', { error: e instanceof Error ? e.message : String(e) })
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Agent upload failed' }, { status: 500 })
      }
    }

    await auditFinish(auditId, 'failed', { error: 'unknown action' })
    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Agent route error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}