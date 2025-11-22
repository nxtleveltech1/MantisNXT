"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload'
import { FileUp, Settings, FileCog, TrendingUp, History, CheckCircle2, Edit3, Trash2 } from 'lucide-react'

type Supplier = { 
  id: string; 
  name: string; 
  code?: string; 
  status?: string; 
  tags?: string[]; 
  orgId?: string;
  tier?: string;
  category?: string;
  subcategory?: string;
  businessInfo?: {
    legalName?: string;
    tradingName?: string;
    taxId?: string;
    registrationNumber?: string;
    website?: string;
    foundedYear?: number;
    employeeCount?: number;
    annualRevenue?: number;
    currency?: string;
  };
  contacts?: Array<{
    id?: string;
    type?: string;
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    department?: string;
    isPrimary?: boolean;
    isActive?: boolean;
  }>;
  addresses?: Array<{
    id?: string;
    type?: string;
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isPrimary?: boolean;
    isActive?: boolean;
  }>;
  capabilities?: {
    products?: string[];
    services?: string[];
    leadTime?: number;
    minimumOrderValue?: number;
    paymentTerms?: string;
  };
  notes?: string;
}
type RuleRow = { id: number; rule_name: string; rule_type: string; execution_order: number; rule_config: unknown; is_blocking: boolean; updated_at: string }
type ProfileRow = { id: number; profile_name: string; guidelines?: unknown; processing_config?: unknown; quality_standards?: unknown; compliance_rules?: unknown; is_active: boolean; updated_at: string }
type UploadRow = { upload_id: string; filename: string; status: string; row_count: number; received_at: string }

export default function SupplierProfilePage() {
  const params = useParams()
  const router = useRouter()
  const search = useSearchParams()
  const supplierId = String(params?.id || '')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [activeTab, setActiveTab] = useState<string>(search?.get('tab') || 'overview')
  const [rules, setRules] = useState<RuleRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [uploads, setUploads] = useState<UploadRow[]>([])

  const [ruleName, setRuleName] = useState('')
  const [ruleType, setRuleType] = useState('transformation')
  const [ruleOrder, setRuleOrder] = useState(0)
  const [ruleBlocking, setRuleBlocking] = useState(false)
  const [ruleJson, setRuleJson] = useState('{}')
  const [nlInstruction, setNlInstruction] = useState('')
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activity, setActivity] = useState<Array<{ id:number; action:string; status:string; details:any; started_at:string; finished_at:string; upload_id:string }>>([])

  useEffect(() => {
    const loadSupplier = async () => {
      try {
        const res = await fetch(`/api/suppliers/v3/${supplierId}`)
        const data = await res.json()
        if (data.success) {
          setSupplier(data.data)
        }
      } catch {}
    }
    const loadRules = async () => {
      try {
        const res = await fetch(`/api/suppliers/${supplierId}/rules`)
        const data = await res.json()
        setRules(data.data || [])
      } catch {}
    }
    const loadProfiles = async () => {
      try {
        const res = await fetch(`/api/supplier-profiles?supplier_id=${supplierId}`)
        const data = await res.json()
        setProfiles(data.data || [])
      } catch {}
    }
    const loadUploads = async () => {
      try {
        const res = await fetch(`/api/spp/uploads?supplier_id=${supplierId}`)
        const data = await res.json()
        setUploads(data.uploads || data.data || [])
      } catch {}
    }
    const loadAudit = async () => {
      try {
        const res = await fetch(`/api/spp/audit?supplier_id=${supplierId}&limit=50`)
        const data = await res.json()
        setActivity(data.data || [])
      } catch {}
    }
    if (supplierId) {
      loadSupplier(); loadRules(); loadProfiles(); loadUploads(); loadAudit()
    }
  }, [supplierId])

  const synthesizeRule = async () => {
    try {
      setError(null)
      if (!nlInstruction || nlInstruction.length < 10) { setError('Enter a natural-language instruction'); return }
      const res = await fetch('/api/suppliers/nlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_id: supplierId, instruction: nlInstruction }) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to synthesize rule')
      setRuleJson(JSON.stringify(data.data, null, 2))
    } catch (e: any) {
      setError(e?.message || 'Failed to synthesize rule')
    }
  }

  const saveRule = async () => {
    try {
      setError(null)
      const parsed = JSON.parse(ruleJson)
      
      if (editingRule) {
        // Update existing rule
        const body = { 
          rule_id: editingRule.id,
          rule_name: ruleName || 'Generated Rule', 
          rule_type: ruleType, 
          trigger_event: 'pricelist_upload', 
          execution_order: ruleOrder, 
          rule_config: parsed, 
          is_blocking: ruleBlocking 
        }
        const res = await fetch(`/api/suppliers/${supplierId}/rules`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) { const t = await res.json(); throw new Error(t.error || 'Failed to update rule') }
      } else {
        // Create new rule
        const body = { 
          supplier_id: supplierId, 
          rule_name: ruleName || 'Generated Rule', 
          rule_type: ruleType, 
          trigger_event: 'pricelist_upload', 
          execution_order: ruleOrder, 
          rule_config: parsed, 
          is_blocking: ruleBlocking 
        }
        const res = await fetch(`/api/suppliers/${supplierId}/rules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) { const t = await res.json(); throw new Error(t.error || 'Failed to save rule') }
      }
      
      const list = await fetch(`/api/suppliers/${supplierId}/rules`).then(r => r.json())
      setRules(list.data || [])
      setRuleName(''); setRuleOrder(0); setRuleBlocking(false); setRuleJson('{}'); setNlInstruction(''); setEditingRule(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to save rule')
    }
  }

  const editRule = (rule: RuleRow) => {
    setEditingRule(rule)
    setRuleName(rule.rule_name)
    setRuleType(rule.rule_type)
    setRuleOrder(rule.execution_order)
    setRuleBlocking(rule.is_blocking)
    setRuleJson(JSON.stringify(rule.rule_config || {}, null, 2))
    setError(null)
  }

  const deleteRule = async (rule: RuleRow) => {
    if (!confirm(`Delete rule "${rule.rule_name}"?`)) return
    try {
      setError(null)
      const res = await fetch(`/api/suppliers/${supplierId}/rules?rule_id=${rule.id}`, { method: 'DELETE' })
      if (!res.ok) { const t = await res.json(); throw new Error(t.error || 'Failed to delete rule') }
      const list = await fetch(`/api/suppliers/${supplierId}/rules`).then(r => r.json())
      setRules(list.data || [])
      if (editingRule && editingRule.id === rule.id) {
        setRuleName(''); setRuleOrder(0); setRuleBlocking(false); setRuleJson('{}'); setNlInstruction(''); setEditingRule(null)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to delete rule')
    }
  }

  const cancelEdit = () => {
    setEditingRule(null)
    setRuleName('')
    setRuleType('transformation')
    setRuleOrder(0)
    setRuleBlocking(false)
    setRuleJson('{}')
    setNlInstruction('')
    setError(null)
  }

  return (
    <AppLayout title={supplier ? supplier.name : 'Supplier Profile'} breadcrumbs={[{ label: 'Suppliers', href: '/suppliers' }, { label: 'Directory', href: '/directories/suppliers' }, { label: supplier?.name || 'Profile' }]}>
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">{supplier?.name || 'Supplier'}</div>
                <div className="text-sm text-muted-foreground">Code: {supplier?.code || '—'} · Status: {supplier?.status || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(supplier?.tags || []).slice(0,3).map((t, i) => (<Badge key={i} variant="secondary">{t}</Badge>))}
              <Button variant="outline" onClick={() => router.push(`/admin/supplier-rules?supplier_id=${supplierId}`)}><Settings className="h-4 w-4 mr-2" />Manage Rules</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); router.push(`/suppliers/${supplierId}/profile?tab=${v}`) }} className="space-y-6">
          <div className="border-b border-border">
            <TabsList className="inline-flex h-12 items-center justify-start gap-1 rounded-none bg-transparent p-0 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="rules">Pricelists & Rules</TabsTrigger>
              <TabsTrigger value="uploads">Uploads</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><Label>Name</Label><div className="text-sm font-medium">{supplier?.name}</div></div>
                  <div><Label>Code</Label><div className="text-sm font-medium">{supplier?.code || '—'}</div></div>
                  <div><Label>Status</Label><Badge variant="outline">{supplier?.status || '—'}</Badge></div>
                  <div><Label>Organization ID</Label><div className="text-sm font-mono text-muted-foreground">{supplier?.orgId || '—'}</div></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px]">
                  <div className="space-y-3">
                    {activity.map(ev => (
                      <div key={ev.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{ev.action}</div>
                          <Badge variant={ev.status === 'failed' ? 'destructive' : 'outline'}>{ev.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(ev.started_at).toLocaleString()} → {ev.finished_at ? new Date(ev.finished_at).toLocaleString() : '—'}</div>
                        {ev.details && <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(ev.details, null, 2)}</pre>}
                      </div>
                    ))}
                    {activity.length === 0 && (<div className="text-sm text-muted-foreground">No recent activity</div>)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg"><div className="text-xs text-muted-foreground">Total Uploads</div><div className="text-xl font-semibold">{uploads.length}</div></div>
                  <div className="p-4 border rounded-lg"><div className="text-xs text-muted-foreground">Active Rules</div><div className="text-xl font-semibold">{rules.length}</div></div>
                  <div className="p-4 border rounded-lg"><div className="text-xs text-muted-foreground">Profiles</div><div className="text-xl font-semibold">{profiles.length}</div></div>
                  <div className="p-4 border rounded-lg"><div className="text-xs text-muted-foreground">Status</div><div className="text-xl font-semibold">{supplier?.status || '—'}</div></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm lg:col-span-1">
                <CardHeader><CardTitle className="text-sm">Existing Rules</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[420px]">
                    <div className="divide-y">
                      {rules.map(r => (
                        <div key={r.id} className="group">
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{r.rule_name}</div>
                                <Badge variant="outline">{r.rule_type}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">order {r.execution_order} • updated {new Date(r.updated_at).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => editRule(r)}
                                className="h-8 px-2"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => deleteRule(r)}
                                className="h-8 px-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {rules.length === 0 && (<div className="p-6 text-sm text-muted-foreground">No rules yet</div>)}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">{editingRule ? 'Edit Rule' : 'Create Rule'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Name</Label><Input value={ruleName} onChange={e => setRuleName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Type</Label>
                      <Select value={ruleType} onValueChange={setRuleType}>
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
                    <div className="space-y-2"><Label>Order</Label><Input type="number" value={ruleOrder} onChange={e => setRuleOrder(parseInt(e.target.value || '0'))} /></div>
                    <div className="space-y-2"><Label>Blocking</Label><Button variant={ruleBlocking ? 'default' : 'outline'} onClick={() => setRuleBlocking(v => !v)}>{ruleBlocking ? 'Yes' : 'No'}</Button></div>
                  </div>
                  <div className="space-y-2"><Label>Natural-language Instruction</Label><Textarea value={nlInstruction} onChange={e => setNlInstruction(e.target.value)} rows={6} /></div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={synthesizeRule}><FileCog className="h-4 w-4 mr-2" />Generate with AI</Button>
                    {editingRule && (
                      <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                    )}
                    <Button onClick={saveRule}><CheckCircle2 className="h-4 w-4 mr-2" />{editingRule ? 'Update Rule' : 'Save Rule'}</Button>
                  </div>
                  <div className="space-y-2"><Label>Rule Config (JSON)</Label><Textarea value={ruleJson} onChange={e => setRuleJson(e.target.value)} rows={10} /></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="uploads" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Recent Uploads</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploads.map(u => (
                    <div key={u.upload_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{u.filename}</div>
                        <div className="text-xs text-muted-foreground">{new Date(u.received_at).toLocaleString()} · {u.row_count} rows</div>
                      </div>
                      <Badge variant="outline">{u.status}</Badge>
                    </div>
                  ))}
                  {uploads.length === 0 && (<div className="text-sm text-muted-foreground">No uploads yet</div>)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Upload Pricelist</CardTitle></CardHeader>
              <CardContent>
                <EnhancedPricelistUpload open={false} onOpenChange={() => {}} onComplete={async () => {}} defaultSupplierId={supplierId} autoValidate={false} autoMerge={false} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}