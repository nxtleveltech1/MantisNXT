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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings, FileText } from 'lucide-react'

type ProfileRow = {
  id: number
  supplier_id: string
  profile_name: string
  guidelines: unknown
  processing_config: unknown
  quality_standards: unknown
  compliance_rules: unknown
  is_active: boolean
  updated_at: string
}

export default function SupplierProfilesPage() {
  const pathname = usePathname()
  const crumbs = pathname.startsWith('/nxt-spp')
    ? [{ label: 'Supplier Inventory Portfolio', href: '/nxt-spp' }, { label: 'Supplier Profiles' }]
    : [{ label: 'Administration', href: '/admin/settings/general' }, { label: 'Supplier Profiles' }]
  const [supplierId, setSupplierId] = useState<string>("")
  const [profileName, setProfileName] = useState<string>('default')
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [selected, setSelected] = useState<ProfileRow | null>(null)
  const [guidelinesText, setGuidelinesText] = useState<string>("{}")
  const [processingText, setProcessingText] = useState<string>("{}")
  const [qualityText, setQualityText] = useState<string>("{}")
  const [complianceText, setComplianceText] = useState<string>("{}")
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const guidelines = useMemo(() => { try { return JSON.parse(guidelinesText) } catch { return null } }, [guidelinesText])
  const processing = useMemo(() => { try { return JSON.parse(processingText) } catch { return null } }, [processingText])
  const quality = useMemo(() => { try { return JSON.parse(qualityText) } catch { return null } }, [qualityText])
  const compliance = useMemo(() => { try { return JSON.parse(complianceText) } catch { return null } }, [complianceText])

  useEffect(() => {
    if (!supplierId) return
    const url = `/api/supplier-profiles?supplier_id=${supplierId}`
    fetch(url).then(r => r.json()).then(res => {
      setProfiles(res.data || [])
    }).catch(() => setProfiles([]))
  }, [supplierId])

  const onSelect = (p: ProfileRow) => {
    setSelected(p)
    setProfileName(p.profile_name)
    setGuidelinesText(JSON.stringify(p.guidelines ?? {}, null, 2))
    setProcessingText(JSON.stringify(p.processing_config ?? {}, null, 2))
    setQualityText(JSON.stringify(p.quality_standards ?? {}, null, 2))
    setComplianceText(JSON.stringify(p.compliance_rules ?? {}, null, 2))
    setActive(p.is_active)
    setError(null)
  }

  const onSave = async () => {
    if (!supplierId) { setError('supplier_id required'); return }
    if (!guidelines || !processing || !quality || !compliance) { setError('Invalid JSON in one or more fields'); return }
    const body = {
      supplier_id: supplierId,
      profile_name: profileName || 'default',
      guidelines,
      processing_config: processing,
      quality_standards: quality,
      compliance_rules: compliance,
      is_active: active,
    }
    const res = await fetch('/api/supplier-profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const t = await res.json(); setError(t.error || 'Failed'); return }
    const list = await fetch(`/api/supplier-profiles?supplier_id=${supplierId}`).then(r => r.json())
    setProfiles(list.data || [])
  }

  return (
    <AppLayout title="Supplier Profiles" breadcrumbs={crumbs}>
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Supplier Profiles</div>
                <div className="text-sm text-muted-foreground">Guidelines, processing config, quality standards and compliance</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input placeholder="Supplier UUID" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-[360px]" />
              <Input placeholder="Profile name" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-[200px]" />
              <Badge variant="secondary">Profiles: {profiles.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Existing Profiles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <div className="divide-y">
                  {profiles.map(p => (
                    <button key={p.id} onClick={() => onSelect(p)} className="w-full text-left p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{p.profile_name}</div>
                        <Badge variant={p.is_active ? 'outline' : 'secondary'}>{p.is_active ? 'active' : 'inactive'}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">updated {new Date(p.updated_at).toLocaleString()}</div>
                    </button>
                  ))}
                  {profiles.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground">No profiles found for supplier</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">{selected ? 'Edit Profile' : 'Create/Update Profile'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guidelines</Label>
                  <Textarea value={guidelinesText} onChange={e => setGuidelinesText(e.target.value)} rows={8} />
                </div>
                <div className="space-y-2">
                  <Label>Processing Config</Label>
                  <Textarea value={processingText} onChange={e => setProcessingText(e.target.value)} rows={8} />
                </div>
                <div className="space-y-2">
                  <Label>Quality Standards</Label>
                  <Textarea value={qualityText} onChange={e => setQualityText(e.target.value)} rows={6} />
                </div>
                <div className="space-y-2">
                  <Label>Compliance Rules</Label>
                  <Textarea value={complianceText} onChange={e => setComplianceText(e.target.value)} rows={6} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant={active ? 'default' : 'outline'} onClick={() => setActive(v => !v)}>{active ? 'Active' : 'Inactive'}</Button>
                <Button onClick={onSave}><FileText className="h-4 w-4 mr-2" />Save Profile</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}