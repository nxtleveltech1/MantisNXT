"use client"

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { PriceExtractionResult } from '@/lib/services/supplier/AIPriceExtractionService'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ExtractionState {
  status: 'idle' | 'submitting' | 'success' | 'error'
  error?: string | null
}

export function AIPriceExtractionPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [instructions, setInstructions] = useState(
    'Normalize SKUs, currency, and pack sizes. Flag anomalies and missing currency.',
  )
  const [orgId, setOrgId] = useState<string>('')
  const [supplierId, setSupplierId] = useState<string>('')
  const [serviceName, setServiceName] = useState<string>(
    process.env.NEXT_PUBLIC_AI_SUPPLIER_EXTRACTION_SERVICE_NAME || 'Supplier Pricelist Data Extraction',
  )
  const [serviceId, setServiceId] = useState<string>('')
  const [state, setState] = useState<ExtractionState>({ status: 'idle' })
  const [result, setResult] = useState<PriceExtractionResult | null>(null)

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/suppliers?status=active&limit=500')
      if (!response.ok) {
        throw new Error('Failed to load suppliers')
      }
      const data = await response.json()
      const list = data?.data || data || []
      return Array.isArray(list)
        ? list.map((s: any) => ({
            id: s.id || s.supplier_id,
            name: s.name || s.display_name || s.company_name || 'Supplier',
            code: s.code || s.supplier_code || s.code_name,
            org_id: s.org_id || s.organization_id || s.orgId,
          }))
        : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleSupplierChange = (value: string) => {
    setSupplierId(value)
    const match = suppliers.find((s: any) => s.id === value)
    if (match?.org_id) {
      setOrgId(match.org_id)
    } else {
      setOrgId('')
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      setState({ status: 'error', error: 'Attach a supplier price sheet (.xlsx, .xls, .csv).' })
      return
    }
    if (!supplierId) {
      setState({ status: 'error', error: 'Select a supplier.' })
      return
    }
    if (!orgId) {
      setState({
        status: 'error',
        error: 'Enter org_id for this supplier. It was not found on the selected supplier record.',
      })
      return
    }
    setState({ status: 'submitting' })
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('org_id', orgId)
    formData.append('supplier_id', supplierId)
    if (serviceId) formData.append('service_id', serviceId)
    if (serviceName) formData.append('service_name', serviceName)
    if (instructions?.trim()) {
      formData.append('instructions', instructions.trim())
    }

    try {
      const response = await fetch('/api/nxt-spp/ai/price-extraction', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'AI extraction failed')
      }
      setResult(payload.data as PriceExtractionResult)
      setState({ status: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to extract pricing'
      setState({ status: 'error', error: message })
    }
  }

  const downloadCsv = () => {
    if (!result?.rows?.length) return
    const headers = [
      'supplier_sku',
      'name',
      'brand',
      'uom',
      'pack_size',
      'currency',
      'list_price',
      'net_price',
      'discount_percent',
      'lead_time_days',
      'min_order_qty',
      'notes',
    ]
    const lines = [
      headers.join(','),
      ...result.rows.map((row) =>
        headers
          .map((key) => {
            const value = (row as Record<string, unknown>)[key]
            if (value === null || value === undefined) return ''
            const str = `${value}`
            return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str
          })
          .join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'ai-price-extraction.csv')
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const hasResult = !!result && result.rows.length > 0

  const resultHeaders = useMemo(
    () => ['supplier_sku', 'name', 'currency', 'net_price', 'list_price', 'pack_size', 'uom', 'discount_percent', 'lead_time_days', 'min_order_qty', 'notes'],
    [],
  )

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 shadow-md">
        <CardHeader className="flex flex-col gap-2 border-b bg-gradient-to-r from-slate-50 via-white to-indigo-50">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <Badge variant="outline">AI Price Extraction</Badge>
          </div>
          <CardTitle className="text-2xl">Clean supplier price sheets with GPT</CardTitle>
          <CardDescription>
            Upload messy supplier spreadsheets; AI normalizes SKUs, currency, pricing, UOM, pack sizes, and lead times into production-ready rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="file">Upload spreadsheet</Label>
              <div
                className={cn(
                  'flex min-h-[140px] items-center justify-center rounded-lg border-2 border-dashed',
                  state.status === 'error' ? 'border-destructive/60 bg-destructive/5' : 'border-border bg-muted/30',
                )}
              >
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                  <UploadCloud className="h-6 w-6 text-primary" />
                  <span className="font-medium text-foreground">Drop Excel/CSV here or browse</span>
                  <span className="text-xs text-muted-foreground">We parse in-memory; nothing is stored until you decide.</span>
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                  {file && (
                    <div className="mt-2 text-xs text-foreground">
                      Selected: <strong>{file.name}</strong>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="instructions">Extraction guidance</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                className="min-h-[140px]"
                placeholder="Example: Force ZAR currency; map 'Exclusive Price' to net_price; derive pack_size from size columns."
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select value={supplierId} onValueChange={handleSupplierChange}>
                    <SelectTrigger id="supplier" className="w-full">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{s.name}</span>
                            {s.code ? <span className="text-muted-foreground text-xs">({s.code})</span> : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1 pt-2">
                    <Label htmlFor="org_id">Org ID (UUID) {orgId ? '(detected, override allowed)' : '(required)'}</Label>
                    <Input
                      id="org_id"
                      placeholder="00000000-0000-0000-0000-000000000000"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                    />
                    {orgId ? (
                      <p className="text-xs text-muted-foreground">
                        Using org_id: <code className="font-mono">{orgId}</code>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Supplier did not expose org_id; paste the org UUID to continue.
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service_name">AI Service Name (as in AI config)</Label>
                  <Input
                    id="service_name"
                    placeholder="Supplier Pricelist Data Extraction"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="service_id">AI Service ID (optional override)</Label>
                  <Input
                    id="service_id"
                    placeholder="Paste configured AI service ID"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  />
                </div>
                <div />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={state.status === 'submitting'}>
                  {state.status === 'submitting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running extraction...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Run AI Extraction
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setState({ status: 'idle', error: null })}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {state.status === 'error' && state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Extraction failed</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.status === 'success' && hasResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>AI extraction complete</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{result.rows.length} rows normalized</span>
                {result.summary.detected_currency && (
                  <Badge variant="outline">Currency: {result.summary.detected_currency}</Badge>
                )}
                <Badge variant="outline">
                  Model: {result.summary.provider}/{result.summary.model}
                </Badge>
                <Button size="sm" variant="outline" onClick={downloadCsv}>
                  Download CSV
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {hasResult && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted rows</CardTitle>
            <CardDescription>Review before merging into Supplier Inventory Portfolio.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] rounded-md border">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    {resultHeaders.map((header) => (
                      <th key={header} className="px-3 py-2 font-semibold capitalize text-muted-foreground">
                        {header.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      {resultHeaders.map((header) => (
                        <td key={header} className="px-3 py-2">
                          {renderCell(row as Record<string, unknown>, header)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function renderCell(row: Record<string, unknown>, key: string) {
  const value = row[key]
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}
