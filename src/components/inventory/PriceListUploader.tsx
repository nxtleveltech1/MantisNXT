"use client"

import React, { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, CheckCircle, AlertTriangle, FileSpreadsheet, RefreshCw } from 'lucide-react'
import type { PriceListBuildResult, PriceListMapping, PriceListParseResult } from '@/types/pricelist'
import { buildPriceList, detectHeaders } from '@/lib/utils/pricelist-parser'

export interface PriceListUploaderProps {
  supplierId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApply: (result: PriceListBuildResult) => Promise<void> | void;
}

const readTextFromFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(file)
  })

const PriceListUploader: React.FC<PriceListUploaderProps> = ({ supplierId, open, onOpenChange, onApply }) => {
  const [localOpen, setLocalOpen] = useState(false)
  const isOpen = open ?? localOpen
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setLocalOpen(v))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | undefined>()
  const [raw, setRaw] = useState<PriceListParseResult | undefined>()
  const [mapping, setMapping] = useState<Partial<PriceListMapping>>({})
  const [built, setBuilt] = useState<PriceListBuildResult | undefined>()
  const [busy, setBusy] = useState(false)

  const effectiveMapping: PriceListMapping | undefined = useMemo(() => {
    if (!raw) return undefined
    return {
      sku: mapping.sku || (raw.mapping.sku as string) || raw.headers[0],
      unitCost: mapping.unitCost || (raw.mapping.unitCost as string) || raw.headers[1],
      supplierId: mapping.supplierId || (raw.mapping.supplierId as string),
      supplierName: mapping.supplierName || (raw.mapping.supplierName as string),
      supplierSku: mapping.supplierSku || (raw.mapping.supplierSku as string),
      currency: mapping.currency || (raw.mapping.currency as string),
      unit: mapping.unit || (raw.mapping.unit as string),
      minQty: mapping.minQty || (raw.mapping.minQty as string),
      effectiveDate: mapping.effectiveDate || (raw.mapping.effectiveDate as string),
      notes: mapping.notes || (raw.mapping.notes as string),
    }
  }, [raw, mapping])

  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const text = await readTextFromFile(file)
      const parsed = detectHeaders(text)
      setRaw(parsed)
      setMapping(parsed.mapping)
      setFileName(file.name)
      setBuilt(undefined)
    } finally {
      setBusy(false)
    }
  }

  const buildNow = () => {
    if (!raw || !effectiveMapping) return
    const result = buildPriceList(raw.rowsRaw, effectiveMapping)
    setBuilt(result)
  }

  const apply = async () => {
    if (!built) return
    await onApply(built)
    setOpen(false)
    // reset state after close
    setTimeout(() => {
      setRaw(undefined)
      setMapping({})
      setBuilt(undefined)
      setFileName(undefined)
    }, 300)
  }

  const headerOptions = raw?.headers ?? []

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Price List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Supplier Price List</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {fileName && <div className="text-xs text-muted-foreground">{fileName}</div>}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose CSV
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setRaw(undefined); setBuilt(undefined); setFileName(undefined); }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {raw && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Column Mapping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([
                    ['sku', 'SKU (required)'],
                    ['unitCost', 'Unit Cost (required)'],
                    ['supplierSku', 'Supplier SKU'],
                    ['supplierId', 'Supplier ID'],
                    ['supplierName', 'Supplier Name'],
                    ['currency', 'Currency'],
                    ['unit', 'Unit/UoM'],
                    ['minQty', 'Min Qty/MOQ'],
                    ['effectiveDate', 'Effective Date'],
                    ['notes', 'Notes'],
                  ] as Array<[keyof PriceListMapping, string]>).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Select value={(effectiveMapping as unknown)?.[key] ?? ''} onValueChange={(v) => setMapping(m => ({ ...m, [key]: v || undefined }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headerOptions.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <Button size="sm" onClick={buildNow} disabled={busy}>
                    Build Preview
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {!built && <div className="text-sm text-muted-foreground">Upload a CSV and click Build Preview.</div>}
                {built && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" /> {built.valid} valid
                      </Badge>
                      {built.invalid > 0 && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <AlertTriangle className="h-3 w-3 mr-1" /> {built.invalid} invalid
                        </Badge>
                      )}
                      <div className="text-xs text-muted-foreground">Total: {built.total}</div>
                    </div>
                    {built.errors.length > 0 && (
                      <ScrollArea className="h-24 border rounded p-2">
                        <ul className="text-xs space-y-1">
                          {built.errors.slice(0, 50).map((e, i) => (
                            <li key={i} className="text-orange-700">Row {e.rowIndex}: {e.field} - {e.error}</li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                    <div className="border rounded">
                      <ScrollArea className="h-72">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Supplier SKU</TableHead>
                              <TableHead>Unit Cost</TableHead>
                              <TableHead>Currency</TableHead>
                              <TableHead>Min Qty</TableHead>
                              <TableHead>Effective</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {built.rows.slice(0, 200).map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                                <TableCell className="font-mono text-xs">{r.supplierSku}</TableCell>
                                <TableCell className="text-right">{r.unitCost.toFixed(2)}</TableCell>
                                <TableCell>{r.currency}</TableCell>
                                <TableCell>{r.minQty ?? ''}</TableCell>
                                <TableCell>{r.effectiveDate ? r.effectiveDate.toISOString().slice(0, 10) : ''}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={apply} disabled={!built || built.valid === 0}>Apply</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PriceListUploader


