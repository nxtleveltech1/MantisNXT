import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import * as XLSX from 'xlsx'
import { pricelistService } from '@/lib/services/PricelistService'
import { applyJoinSheetsConfigFromBuffer } from '@/lib/cmm/supplier-rules-engine'
import { AIService, isAIEnabled } from '@/lib/ai'

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

    if (ct.includes('multipart/form-data')) {
      const form = await request.formData()
      action = (form.get('action') as string) || 'upload_and_validate'
      file = form.get('file') as File | null
      supplier_id = (form.get('supplier_id') as string) || null
      currency = (form.get('currency') as string) || null
      valid_from = (form.get('valid_from') as string) || null
      auto_validate = form.get('auto_validate') === 'true'
      auto_merge = form.get('auto_merge') === 'true'
    } else {
      const body = await request.json()
      action = body?.action
      upload_id = body?.upload_id ?? null
      supplier_id = body?.supplier_id ?? null
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
      const rerun = await fetch(new URL('/api/process/rerun', request.url).toString(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upload_id })
      })
      const rerunJson = await rerun.json()
      await auditFinish(auditId, rerun.ok ? 'queued' : 'failed', { step: 'apply_rules', result: rerunJson })
      return NextResponse.json({ success: true, data: rerunJson }, { status: rerun.ok ? 202 : rerun.status })
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

      let aiSummary: any = null
      try {
        if (isAIEnabled()) {
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
        }
      } catch (e) {
        const reviewFailId = await auditStart(supplier_id, upload_id, 'ai_review')
        await auditFinish(reviewFailId, 'failed', { error: e instanceof Error ? e.message : String(e) })
      }

      try {
        const buf = Buffer.from(await file.arrayBuffer())
        // AI-first structured extraction
        const aiRowsImmediate = await aiExtractRows(buf, file.name)
        if (aiRowsImmediate.length) {
          const mappedAiImmediate = aiRowsImmediate.map((row: any, idx: number) => ({
            upload_id,
            row_num: idx + 1,
            supplier_sku: row.supplier_sku || row.sku || '',
            name: row.name || row.description || '',
            brand: row.brand || undefined,
            uom: row.uom || 'EA',
            pack_size: row.pack_size || undefined,
            price: typeof row.price === 'number' ? Math.max(0, row.price) : 0,
            currency: row.currency || currency || 'ZAR',
            category_raw: row.category_raw || row.category || undefined,
            vat_code: row.vat_code || undefined,
            barcode: row.barcode || undefined,
            attrs_json: {},
          }))
          const aiExtractionId = await auditStart(supplier_id, upload_id, 'ai_extraction')
          const aiInserted = await pricelistService.insertRows(upload_id!, mappedAiImmediate)
          await auditFinish(aiExtractionId, 'completed', { rows_inserted: aiInserted })
          const aiValidationId = await auditStart(supplier_id, upload_id, 'validation')
          const aiValidation = await pricelistService.validateUpload(upload_id!)
          await auditFinish(aiValidationId, 'completed', { status: aiValidation.status, errors: aiValidation.errors?.length || 0, warnings: aiValidation.warnings?.length || 0 })
          return NextResponse.json({ success: true, data: { upload_id, validation: aiValidation } })
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
        const mapped = rows.map((row: any, idx: number) => {
          if (usedJoin) {
            const priceValue = row['priceExVat'] ?? row['price_ex_vat']
            return {
              upload_id,
              row_num: idx + 1,
              supplier_sku: row['sku'] || row['part'] || '',
              name: row['description'] || row['name'] || '',
              brand: row['brand'] || undefined,
              uom: 'EA',
              pack_size: undefined,
              price: parsePrice(priceValue),
              currency: currency || 'ZAR',
              category_raw: row['category'] || undefined,
              vat_code: undefined,
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
              price: parsePrice(priceValue),
              currency: currency || 'ZAR',
              category_raw: category || undefined,
              vat_code: undefined,
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
            const mappedAi = aiRows.map((row: any, idx: number) => ({
              upload_id,
              row_num: idx + 1,
              supplier_sku: row.supplier_sku || row.sku || '',
              name: row.name || row.description || '',
              brand: row.brand || undefined,
              uom: row.uom || 'EA',
              pack_size: row.pack_size || undefined,
              price: typeof row.price === 'number' ? Math.max(0, row.price) : 0,
              currency: row.currency || currency || 'ZAR',
              category_raw: row.category_raw || row.category || undefined,
              vat_code: row.vat_code || undefined,
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

        return NextResponse.json({ success: true, data: { upload_id, validation } })
      } catch (e) {
        await auditFinish(auditId, 'failed', { error: e instanceof Error ? e.message : String(e) })
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Agent upload failed' }, { status: 500 })
      }
    }

    await auditFinish(auditId, 'ignored', { reason: 'unknown action' })
    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Agent error' }, { status: 500 })
  }
}