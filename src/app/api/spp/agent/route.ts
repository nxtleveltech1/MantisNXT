import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import * as XLSX from 'xlsx'
import { pricelistService } from '@/lib/services/PricelistService'
import { applyPricelistRulesToExcel, getSupplierRules, logRuleExecution } from '@/lib/cmm/supplier-rules-engine-enhanced'
import { applyJoinSheetsConfigFromBuffer } from '@/lib/cmm/supplier-rules-engine'
import { AIService, isAIEnabled } from '@/lib/ai'
import { applyVatPolicyToRows } from '@/lib/cmm/vat-utils'

export const runtime = 'nodejs'

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

async function aiExtractRows(buffer: Buffer, filename: string, timeoutMs?: number): Promise<any[]> {
  if (!isAIEnabled()) {
    console.warn('⚠️ AI extraction skipped: AI not enabled')
    return []
  }
  try {
    console.log(`🤖 Starting AI extraction for ${filename}`)
    const ai = new AIService()
    const isExcel = filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')
    const isPDF = filename.toLowerCase().endsWith('.pdf')
    
    let prompt = 'Extract supplier pricelist rows from this document. Provide JSON array of objects with fields: supplier_sku, name, brand, uom, pack_size, cost_price_ex_vat, price_incl_vat, vat_rate, currency, category_raw, stock_on_hand, barcode.'
    prompt += `\nFilename: ${filename}`
    
    if (isPDF) {
      const { createRequire } = await import('module')
      const requireFn = createRequire(import.meta.url)
      const pdfParseModule = requireFn('pdf-parse/dist/node/cjs/index.cjs')
      const pdfParse = pdfParseModule?.default ?? pdfParseModule
      console.log('📄 PDF detected - parsing text with pdf-parse')
      try {
        const pdfData = await pdfParse(buffer)
        const lines = pdfData.text
          ?.split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean) ?? []
        const sample = lines.slice(0, 200)
        prompt += `\nDocument type: PDF with ${pdfData.numpages ?? 'unknown'} pages.`
        prompt += '\nPDF text sample (first lines): ' + JSON.stringify(sample)
      } catch (pdfError) {
        console.error('❌ Failed to parse PDF text:', pdfError)
        const fallbackText = buffer.toString('utf-8')
        const fallbackLines = fallbackText.split(/\r?\n/).slice(0, 100)
        prompt += '\nPDF text sample (fallback): ' + JSON.stringify(fallbackLines)
      }
    } else if (isExcel) {
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
    
    prompt += '\nReturn ONLY JSON array, no commentary. Ensure all price fields are numeric.'
    
    // Use extended timeout for large files (120s default, configurable, longer for PDFs)
    const extractionTimeout = timeoutMs ?? (isPDF ? 180000 : parseInt(process.env.AI_EXTRACTION_TIMEOUT_MS || '120000'))
    
    const res = await ai.generateText(prompt, { 
      temperature: 0,
      metadata: { timeoutMs: extractionTimeout }
    } as any)
    
    const txt = (res?.text || '').trim()
    const m = txt.match(/\[([\s\S]*)\]$/)
    const jsonStr = m ? m[0] : txt
    const json = JSON.parse(jsonStr)
    const rows = Array.isArray(json) ? json : []
    console.log(`✅ AI extraction completed: ${rows.length} rows extracted`)
    return rows
  } catch (error) {
    console.error('❌ AI extraction failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      filename
    })
    return []
  }
}

/**
 * Use AI to correct validation errors by extracting missing fields from original file
 */
async function aiCorrectErrors(
  buffer: Buffer,
  filename: string,
  validationErrors: any[],
  existingRows: any[],
  supplierId: string
): Promise<any[]> {
  if (!isAIEnabled() || validationErrors.length === 0) {
    return []
  }
  try {
    console.log(`🤖 Starting AI error correction for ${filename} (${validationErrors.length} errors)`)
    const ai = new AIService()
    
    // Group errors by row number
    const errorsByRow = new Map<number, any[]>()
    validationErrors.forEach(err => {
      const rowNum = err.row_num || err.row || 1
      if (!errorsByRow.has(rowNum)) {
        errorsByRow.set(rowNum, [])
      }
      errorsByRow.get(rowNum)!.push(err)
    })
    
    // Get original file data for rows with errors
    const isExcel = filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')
    let originalData: any = null
    
    if (isExcel) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
      const headers = (allRows[0] || []) as string[]
      originalData = {
        headers,
        rows: allRows.slice(1).map((row, idx) => ({
          row_num: idx + 2, // +2 because header is row 1, data starts at row 2
          data: row
        })).filter(r => errorsByRow.has(r.row_num))
      }
    } else {
      const text = buffer.toString('utf-8')
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      const headers = (lines[0] || '').split(/[,;]/).map(h => h.trim().replace(/^"|"$/g, ''))
      originalData = {
        headers,
        rows: lines.slice(1).map((line, idx) => {
          const values = line.split(/[,;]/).map(v => v.trim().replace(/^"|"$/g, ''))
          return {
            row_num: idx + 2,
            data: values
          }
        }).filter(r => errorsByRow.has(r.row_num))
      }
    }
    
    const prompt = `Fix validation errors in pricelist rows by extracting missing required fields from the original file data.

Filename: ${filename}
Supplier ID: ${supplierId}

Validation Errors:
${JSON.stringify(Array.from(errorsByRow.entries()).slice(0, 50), null, 2)}

Original File Data (rows with errors):
${JSON.stringify(originalData, null, 2)}

Existing Row Data (partial):
${JSON.stringify(existingRows.slice(0, 10), null, 2)}

Required fields: supplier_sku, name, cost_price_ex_vat (or price), uom, currency
Optional fields: brand, pack_size, price_incl_vat, vat_rate, category_raw, stock_on_hand, barcode

For each row with errors, extract the missing fields from the original file data. Return a JSON array of corrected row objects with ALL required fields filled.
Each object must have: supplier_sku (string), name (string), cost_price_ex_vat (number > 0), uom (string, default "EA"), currency (string, default "ZAR"), price (number, same as cost_price_ex_vat).

Return ONLY the JSON array, no commentary.`
    
    const correctionTimeout = parseInt(process.env.AI_EXTRACTION_TIMEOUT_MS || '120000')
    const res = await ai.generateText(prompt, { 
      temperature: 0,
      metadata: { timeoutMs: correctionTimeout }
    } as any)
    
    const txt = (res?.text || '').trim()
    const m = txt.match(/\[([\s\S]*)\]$/)
    const jsonStr = m ? m[0] : txt
    const json = JSON.parse(jsonStr)
    const correctedRows = Array.isArray(json) ? json : []
    
    console.log(`✅ AI error correction completed: ${correctedRows.length} rows corrected`)
    return correctedRows
  } catch (error) {
    console.error('❌ AI error correction failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      filename,
      errorCount: validationErrors.length
    })
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
      // Ensure price field is set for database schema requirement
      const costPrice = row.cost_price_ex_vat || row.price || 0
      valid.push({
        ...row,
        price: costPrice, // Required by database schema (spp.pricelist_row.price NOT NULL)
        cost_price_ex_vat: costPrice
      })
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
                errors: (validation.errors || []).length,
                warnings: (validation.warnings || []).length
              },
              errors: (validation.errors || []).slice(0, 10), // First 10 errors
              warnings: (validation.warnings || [])
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
          const safeRulesRows = Array.isArray(rulesResult.rows) ? rulesResult.rows : []
          const vatResult = applyVatPolicyToRows(safeRulesRows, supplier_id)
          await auditFinish(vatAuditId, 'completed', {
            rows_processed: (vatResult?.rows || []).length,
            warnings: (vatResult?.warnings || []).length,
            price_sources: vatResult?.priceSources || []
          })

          // Validate the processed rows
          const validation = await validateRows(vatResult?.rows || [], supplier_id, upload_id)
          
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
                  rows: (vatResult?.rows || []).length,
                  valid: validation.valid.length,
                  errors: (validation.errors || []).length,
                  warnings: (validation.warnings || []).length + (vatResult?.warnings || []).length
                },
                errors: (validation.errors || []).slice(0, 10), // First 10 errors
                warnings: [...(validation.warnings || []), ...(vatResult?.warnings || [])]
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

      // Heuristic extraction (primary method when no rules)
      try {
        const buf = Buffer.from(await file.arrayBuffer())
        const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
        
        // For PDFs, use AI extraction directly
        if (isPDF && isAIEnabled() && allow_ai_fallback) {
          console.log(`📄 PDF detected, using AI extraction for ${file.name}`)
          const aiRows = await aiExtractRows(buf, file.name, 180000) // 3 min timeout for PDFs
          if (aiRows && aiRows.length > 0) {
            console.log(`✅ AI extracted ${aiRows.length} rows from PDF`)
            
            // Map AI rows to pricelist_row format
            const mapped = aiRows.map((row: any, idx: number) => {
              const parsePrice = (value: unknown): number => {
                if (!value && value !== 0) return 0
                if (typeof value === 'number') return Math.max(0, value)
                const str = String(value).trim()
                if (!str) return 0
                const cleaned = str.replace(/^[R$€£¥₹]\s*/i, '').replace(/,/g, '').replace(/\s+/g, '').trim()
                const parsed = parseFloat(cleaned)
                return isNaN(parsed) ? 0 : Math.max(0, parsed)
              }
              
              const costPrice = row.cost_price_ex_vat || parsePrice(row.price) || 0
              const attrs: any = {}
              if (row.cost_excluding !== undefined) attrs.cost_excluding = parsePrice(row.cost_excluding)
              if (row.cost_including !== undefined) attrs.cost_including = parsePrice(row.cost_including)
              if (row.rsp !== undefined) attrs.rsp = parsePrice(row.rsp)
              
              return {
                upload_id,
                row_num: idx + 1,
                supplier_sku: row.supplier_sku || row.sku || '',
                name: row.name || row.product_name || '',
                brand: row.brand || undefined,
                uom: row.uom || 'EA',
                pack_size: row.pack_size || undefined,
                price: costPrice,
                cost_price_ex_vat: costPrice,
                price_incl_vat: row.price_incl_vat || row.price_including || undefined,
                vat_rate: row.vat_rate || 0.15,
                currency: row.currency || currency || 'ZAR',
                category_raw: row.category_raw || row.category || undefined,
                stock_on_hand: row.stock_on_hand || 0,
                barcode: row.barcode || undefined,
                attrs_json: attrs
              }
            })
            
            const inserted = await pricelistService.insertRows(upload_id!, mapped)
            const extractionId = await auditStart(supplier_id, upload_id, 'ai_pdf_extraction')
            await auditFinish(extractionId, 'completed', { rows_inserted: inserted })
            
            // Validate extracted rows
            const validation = await pricelistService.validateUpload(upload_id!)
            const validationId = await auditStart(supplier_id, upload_id, 'validation')
            await auditFinish(validationId, 'completed', { 
              status: validation.status, 
              errors: validation.errors?.length || 0, 
              warnings: validation.warnings?.length || 0 
            })
            
            return NextResponse.json({
              success: true,
              data: {
                upload_id,
                processing_method: 'ai_pdf_extraction',
                validation: {
                  totals: {
                    rows: mapped.length,
                    valid: validation.valid_rows,
                    errors: validation.invalid_rows,
                    warnings: validation.warnings?.length || 0
                  },
                  errors: validation.errors?.slice(0, 10) || [],
                  warnings: validation.warnings || []
                }
              }
            })
          }
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
        const isCSV = file.name.toLowerCase().endsWith('.csv') || (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls') && !isPDF)
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
        const safeRows = Array.isArray(rows) ? rows : []
        const vatResult2 = applyVatPolicyToRows(safeRows, supplier_id)
        await auditFinish(vatAuditId2, 'completed', {
          rows_processed: (vatResult2?.rows || []).length,
          warnings: (vatResult2?.warnings || []).length,
          price_sources: vatResult2?.priceSources || []
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
        const mapped = (vatResult2?.rows || []).map((row: any, idx: number) => {
          if (usedJoin) {
            const costPrice = row['cost_price_ex_vat'] || parsePrice(row['priceExVat'] ?? row['price_ex_vat']) || 0
            const attrs: any = {}
            
            // Extract cost_excluding, cost_including, and rsp from raw_data if available
            if (row['_cost_excluding'] !== undefined) {
              attrs.cost_excluding = typeof row['_cost_excluding'] === 'number' ? row['_cost_excluding'] : parsePrice(row['_cost_excluding'])
            }
            if (row['_cost_including'] !== undefined) {
              attrs.cost_including = typeof row['_cost_including'] === 'number' ? row['_cost_including'] : parsePrice(row['_cost_including'])
            }
            if (row['_rsp'] !== undefined) {
              attrs.rsp = typeof row['_rsp'] === 'number' ? row['_rsp'] : parsePrice(row['_rsp'])
            }
            
            // Also check for direct column mappings
            if (row['Cost Excluding'] && !attrs.cost_excluding) {
              attrs.cost_excluding = parsePrice(row['Cost Excluding'])
            }
            if (row['Cost Including'] && !attrs.cost_including) {
              attrs.cost_including = parsePrice(row['Cost Including'])
            }
            if (row['Recommended Retail Price'] && !attrs.rsp) {
              attrs.rsp = parsePrice(row['Recommended Retail Price'])
            }
            
            // Calculate missing values if we have one but not the other
            const vatRate = row['vat_rate'] || 0.15
            if (attrs.cost_excluding && !attrs.cost_including) {
              attrs.cost_including = attrs.cost_excluding * (1 + vatRate)
            } else if (attrs.cost_including && !attrs.cost_excluding) {
              attrs.cost_excluding = attrs.cost_including / (1 + vatRate)
            }
            
            return {
              upload_id,
              row_num: idx + 1,
              supplier_sku: row['sku'] || row['part'] || '',
              name: row['description'] || row['name'] || '',
              brand: row['brand'] || undefined,
              uom: 'EA',
              pack_size: undefined,
              price: costPrice, // Required by database schema
              cost_price_ex_vat: costPrice,
              price_incl_vat: row['price_incl_vat'] || undefined,
              vat_rate: row['vat_rate'] || 0.15,
              currency: currency || 'ZAR',
              category_raw: row['category'] || undefined,
              stock_on_hand: row['stock_on_hand'] || 0,
              stock_on_order: row['stock_on_order'] || 0,
              barcode: undefined,
              attrs_json: attrs,
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
            
            // Extract cost_excluding, cost_including, and rsp from raw_data if available (from ExtractionWorker)
            if (row['_cost_excluding'] !== undefined) {
              attrs.cost_excluding = typeof row['_cost_excluding'] === 'number' ? row['_cost_excluding'] : parsePrice(row['_cost_excluding'])
            }
            if (row['_cost_including'] !== undefined) {
              attrs.cost_including = typeof row['_cost_including'] === 'number' ? row['_cost_including'] : parsePrice(row['_cost_including'])
            }
            if (row['_rsp'] !== undefined) {
              attrs.rsp = typeof row['_rsp'] === 'number' ? row['_rsp'] : parsePrice(row['_rsp'])
            }
            
            // Also check for direct column mappings (Cost Excluding, Cost Including, Recommended Retail Price)
            const costExcludingValue = getColumn(row, ['Cost Excluding', 'COST EXCLUDING', 'Cost Ex VAT', 'COST EX VAT'])
            const costIncludingValue = getColumn(row, ['Cost Including', 'COST INCLUDING', 'Cost Inc VAT', 'COST INC VAT'])
            const rspValue = getColumn(row, ['Recommended Retail Price', 'RECOMMENDED RETAIL PRICE', 'Recommended Selling Price', 'RSP', 'RRP'])
            
            if (costExcludingValue && !attrs.cost_excluding) {
              attrs.cost_excluding = parsePrice(costExcludingValue)
            }
            if (costIncludingValue && !attrs.cost_including) {
              attrs.cost_including = parsePrice(costIncludingValue)
            }
            if (rspValue && !attrs.rsp) {
              attrs.rsp = parsePrice(rspValue)
            }
            
            // Calculate missing values if we have one but not the other
            const vatRate = row['vat_rate'] || 0.15
            if (attrs.cost_excluding && !attrs.cost_including) {
              attrs.cost_including = attrs.cost_excluding * (1 + vatRate)
            } else if (attrs.cost_including && !attrs.cost_excluding) {
              attrs.cost_excluding = attrs.cost_including / (1 + vatRate)
            }
            
            const costPrice = row['cost_price_ex_vat'] || attrs.cost_excluding || parsePrice(priceValue) || 0
            return {
              upload_id,
              row_num: idx + 1,
              supplier_sku: supplierSku,
              name: productName,
              brand: brand || undefined,
              uom: uom || 'EA',
              pack_size: packSize || undefined,
              price: costPrice, // Required by database schema
              cost_price_ex_vat: costPrice,
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

        // Validate extracted rows
        let validation = await pricelistService.validateUpload(upload_id!)
        const validationId = await auditStart(supplier_id, upload_id, 'validation')
        await auditFinish(validationId, 'completed', { 
          status: validation.status, 
          errors: validation.errors?.length || 0, 
          warnings: validation.warnings?.length || 0 
        })

        // If validation has errors and AI is enabled, use AI to correct them
        // Note: AI error correction should run even if allow_ai_fallback was false initially,
        // because error correction is different from initial extraction - it's fixing existing data
        if (validation.status !== 'valid' && validation.status !== 'warning' && isAIEnabled()) {
          const errorCount = validation.errors?.length || 0
          if (errorCount > 0) {
            console.log(`🔄 Validation found ${errorCount} errors, attempting AI error correction`)
            const correctionAuditId = await auditStart(supplier_id, upload_id, 'ai_error_correction')
            
            try {
              // Get existing rows from DB to understand what we have
              const existingRowsResult = await query(`
                SELECT row_num, supplier_sku, name, uom, price, currency, brand, pack_size, 
                       cost_price_ex_vat, price_incl_vat, vat_rate, category_raw, stock_on_hand, barcode
                FROM spp.pricelist_row
                WHERE upload_id = $1
                ORDER BY row_num
              `, [upload_id])
              
              const correctedRows = await aiCorrectErrors(
                buf,
                file.name,
                validation.errors || [],
                existingRowsResult.rows,
                supplier_id
              )
              
              if (correctedRows.length > 0) {
                // Apply VAT policy to corrected rows
                const vatAuditId3 = await auditStart(supplier_id, upload_id, 'vat_normalization_corrected')
                const safeCorrectedRows = Array.isArray(correctedRows) ? correctedRows : []
                const vatResult3 = applyVatPolicyToRows(safeCorrectedRows, supplier_id)
                await auditFinish(vatAuditId3, 'completed', {
                  rows_processed: (vatResult3?.rows || []).length,
                  warnings: (vatResult3?.warnings || []).length,
                  price_sources: vatResult3?.priceSources || []
                })
                
                // Delete old invalid rows and insert corrected ones
                const errorRowNums = [...new Set((validation.errors || []).map((e: any) => e.row_num))]
                if (errorRowNums.length > 0) {
                  await query(`
                    DELETE FROM spp.pricelist_row 
                    WHERE upload_id = $1 AND row_num = ANY($2::int[])
                  `, [upload_id, errorRowNums])
                }
                
                const mappedCorrected = (vatResult3?.rows || []).map((row: any, idx: number) => {
                  const costPrice = row.cost_price_ex_vat || row.price || 0
                  return {
                    upload_id,
                    row_num: row.row_num || idx + 1,
                    supplier_sku: row.supplier_sku || row.sku || '',
                    name: row.name || row.description || '',
                    brand: row.brand || undefined,
                    uom: row.uom || 'EA',
                    pack_size: row.pack_size || undefined,
                    price: costPrice,
                    cost_price_ex_vat: costPrice,
                    price_incl_vat: row.price_incl_vat || undefined,
                    vat_rate: row.vat_rate || 0.15,
                    currency: row.currency || currency || 'ZAR',
                    category_raw: row.category_raw || row.category || undefined,
                    stock_on_hand: row.stock_on_hand || 0,
                    stock_on_order: row.stock_on_order || 0,
                    barcode: row.barcode || undefined,
                    attrs_json: {},
                  }
                })
                
                const correctedInserted = await pricelistService.insertRows(upload_id!, mappedCorrected)
                await auditFinish(correctionAuditId, 'completed', { 
                  rows_corrected: correctedInserted,
                  errors_fixed: errorCount,
                  ai_correction_used: true
                })
                
                // Re-validate after correction
                validation = await pricelistService.validateUpload(upload_id!)
                const revalidationId = await auditStart(supplier_id, upload_id, 'revalidation_after_correction')
                await auditFinish(revalidationId, 'completed', { 
                  status: validation.status, 
                  errors: validation.errors?.length || 0, 
                  warnings: validation.warnings?.length || 0 
                })
              } else {
                await auditFinish(correctionAuditId, 'failed', { 
                  error: 'AI correction returned no rows',
                  errors_attempted: errorCount
                })
              }
            } catch (correctionError) {
              await auditFinish(correctionAuditId, 'failed', { 
                error: correctionError instanceof Error ? correctionError.message : String(correctionError)
              })
              console.error('❌ AI error correction failed:', correctionError)
            }
          }
        } else if (validation.status !== 'valid' && validation.status !== 'warning' && !isAIEnabled()) {
          // Validation failed but AI is not enabled
          console.warn(`⚠️ Validation failed with ${validation.errors?.length || 0} errors, but AI is not enabled`)
        }

        await auditFinish(auditId, 'completed', { step: 'upload_and_validate', upload_id })
        return NextResponse.json({ success: true, data: { upload_id, validation } })
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        const errorStack = e instanceof Error ? e.stack : undefined
        console.error('❌ Agent upload_and_validate failed:', {
          error: errorMessage,
          stack: errorStack,
          supplier_id,
          upload_id,
          filename: file?.name
        })
        await auditFinish(auditId, 'failed', { 
          error: errorMessage,
          stack: errorStack,
          step: 'upload_and_validate'
        })
        return NextResponse.json({ 
          success: false, 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errorStack : undefined
        }, { status: 500 })
      }
    }

    await auditFinish(auditId, 'failed', { error: 'unknown action' })
    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('❌ Agent route top-level error:', {
      error: errorMessage,
      stack: errorStack,
      action,
      upload_id,
      supplier_id
    })
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}