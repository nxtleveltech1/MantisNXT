import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createDecksaverJoinRule, applyPricelistRulesToExcel } from '@/lib/cmm/supplier-rules-engine'

async function main() {
  const wb = XLSX.utils.book_new()
  const leftData = [
    ['Part#', 'Product Title', 'Materials'],
    ['DS-001', 'Mixer Cover A', 'Polycarbonate'],
    ['DS-002', 'Controller Cover B', 'Polycarbonate']
  ]
  const rightData = [
    ['Description', 'NETT EXCL', 'sku'],
    ['Mixer Cover A', 499.0, 'IGNORE-1'],
    ['Controller Cover B', 599.0, 'IGNORE-2']
  ]
  const leftWs = XLSX.utils.aoa_to_sheet(leftData)
  const rightWs = XLSX.utils.aoa_to_sheet(rightData)
  XLSX.utils.book_append_sheet(wb, leftWs, 'Decksaver product list')
  XLSX.utils.book_append_sheet(wb, rightWs, 'Decksaver price list')
  const tmp = join(tmpdir(), `decksaver_test_${Date.now()}.xlsx`)
  XLSX.writeFile(wb, tmp)

  const supplierId = '00000000-0000-0000-0000-000000000001'
  await createDecksaverJoinRule(supplierId)
  const rows = await applyPricelistRulesToExcel(tmp, supplierId)
  console.log(JSON.stringify({ count: rows.length, sample: rows.slice(0, 2) }, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})