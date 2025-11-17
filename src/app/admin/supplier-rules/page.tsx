"use client"
import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileCog, Plus, Save } from 'lucide-react'
import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

type RuleRow = {
  id: number
  supplier_id: string
  rule_name: string
  rule_type: string
  trigger_event: string
  execution_order: number
  rule_config: unknown
  is_blocking: boolean
  is_active: boolean
  updated_at: string
}

export default function SupplierRulesPage() {
  const pathname = usePathname()
  const crumbs = pathname.startsWith('/nxt-spp')
    ? [{ label: 'Supplier Inventory Portfolio', href: '/nxt-spp' }, { label: 'Supplier Rules' }]
    : [{ label: 'Administration', href: '/admin/settings/general' }, { label: 'Supplier Rules' }]
  const [supplierId, setSupplierId] = useState<string>("")
  const [rules, setRules] = useState<RuleRow[]>([])
  const [selected, setSelected] = useState<RuleRow | null>(null)
  const [jsonText, setJsonText] = useState<string>("{}")
  const [name, setName] = useState("")
  const [type, setType] = useState("transformation")
  const [order, setOrder] = useState(0)
  const [blocking, setBlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nlTextRef = useRef<string>('')
  const validConfig = useMemo(() => {
    try {
      const obj = JSON.parse(jsonText)
      return obj
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON')
      return null
    }
  }, [jsonText])

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers','active'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers?status=active&limit=1000')
      const json = await res.json()
      const list = json.success && json.data ? json.data : Array.isArray(json) ? json : []
      return list.map((s: any) => ({ id: s.id || s.supplier_id, name: s.name, code: s.code || s.supplier_code })) as {id:string;name:string;code?:string}[]
    },
    staleTime: 5 * 60 * 1000
  })
  const suppliers = suppliersData || []

  useEffect(() => {
    if (!supplierId) return
    fetch(`/api/supplier-rulesets?supplier_id=${supplierId}`).then(r => r.json()).then(res => {
      setRules(res.data || [])
    }).catch(() => setRules([]))
  }, [supplierId])

  const onSelect = (r: RuleRow) => {
    setSelected(r)
    setName(r.rule_name)
    setType(r.rule_type)
    setOrder(r.execution_order)
    setBlocking(r.is_blocking)
    setJsonText(JSON.stringify(r.rule_config ?? {}, null, 2))
    setError(null)
  }

  const onCreate = async () => {
    if (!supplierId) { setError('supplier_id required'); return }
    if (!name) { setError('rule_name required'); return }
    if (!validConfig) { setError('rule_config invalid'); return }
    const body = {
      supplier_id: supplierId,
      rule_name: name,
      rule_type: type,
      trigger_event: 'pricelist_upload',
      execution_order: order,
      rule_config: validConfig,
      is_blocking: blocking,
    }
    const res = await fetch('/api/supplier-rulesets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const t = await res.json(); setError(t.error || 'Failed'); return }
    setSelected(null)
    setName("")
    setJsonText("{}")
    // refresh
    const list = await fetch(`/api/supplier-rulesets?supplier_id=${supplierId}`).then(r => r.json())
    setRules(list.data || [])
  }

  const onUpdate = async () => {
    if (!selected) return
    const body: any = {}
    body.rule_name = name
    body.rule_type = type
    body.execution_order = order
    body.is_blocking = blocking
    body.rule_config = validConfig
    const res = await fetch(`/api/supplier-rulesets/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const t = await res.json(); setError(t.error || 'Failed'); return }
    const updated = await res.json()
    setSelected(updated.data)
    // refresh list
    const list = await fetch(`/api/supplier-rulesets?supplier_id=${supplierId}`).then(r => r.json())
    setRules(list.data || [])
  }

  return (
    <AppLayout title="Supplier Rules Engine" breadcrumbs={crumbs}>
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center">
                <FileCog className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Supplier Rules Engine</div>
                <div className="text-sm text-muted-foreground">Create, edit, and apply supplier-specific processing rules</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[360px]">
                <Label>Supplier</Label>
                <Select value={supplierId || undefined} onValueChange={(val) => setSupplierId(val)}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} {s.code && `(${s.code})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">Active Rules: {rules.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Existing Rules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <div className="divide-y">
                  {rules.map(r => (
                    <button key={r.id} onClick={() => onSelect(r)} className="w-full text-left p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.rule_name}</div>
                        <Badge variant="outline">{r.rule_type}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">order {r.execution_order} • updated {new Date(r.updated_at).toLocaleString()}</div>
                    </button>
                  ))}
                  {rules.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground">No rules found for supplier</div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <Button className="w-full" onClick={() => { setSelected(null); setName(''); setType('transformation'); setOrder(0); setBlocking(false); setJsonText('{}'); }}>
                  <Plus className="h-4 w-4 mr-2" />New Rule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">{selected ? 'Edit Rule' : 'Create Rule'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="validation">validation</SelectItem>
                      <SelectItem value="transformation">transformation</SelectItem>
                      <SelectItem value="approval">approval</SelectItem>
                      <SelectItem value="notification">notification</SelectItem>
                      <SelectItem value="enforcement">enforcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Input type="number" value={order} onChange={e => setOrder(parseInt(e.target.value || '0'))} />
                </div>
                <div className="space-y-2">
                  <Label>Blocking</Label>
                  <Button variant={blocking ? 'default' : 'outline'} onClick={() => setBlocking(v => !v)}>{blocking ? 'Yes' : 'No'}</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rule Config (JSON)</Label>
                <Textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={10} />
              </div>
              <div className="space-y-2">
                <Label>Natural-language Rule Instruction</Label>
                <Textarea placeholder="e.g., Join the Product List tab with Price List tab on Product Title = Description, drop the price-list SKU, set brand from tab name, map Part# to SKU, NETT EXCL to priceExVat, and Materials to category."
                  rows={6}
                  onChange={(e) => (nlTextRef.current = e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={async () => {
                    try {
                      if (!supplierId) { setError('Select supplier first'); return }
                      const instruction = nlTextRef.current || ''
                      if (!instruction || instruction.length < 10) { setError('Enter natural-language instruction'); return }
                      const res = await fetch('/api/supplier-rulesets/nlp', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ supplier_id: supplierId, instruction })
                      })
                      const data = await res.json()
                      if (!data.success) { throw new Error(data.error || 'Failed to synthesize rule') }
                      setJsonText(JSON.stringify(data.data, null, 2))
                      setError(null)
                    } catch (e: any) {
                      setError(e?.message || 'Failed to synthesize rule')
                    }
                  }}>Generate Rule from AI</Button>
                </div>
              </div>
              <div className="flex gap-3">
                {!selected && (
                  <Button onClick={onCreate}><Save className="h-4 w-4 mr-2" />Create Rule</Button>
                )}
                {selected && (
                  <Button onClick={onUpdate}><Save className="h-4 w-4 mr-2" />Update Rule</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}