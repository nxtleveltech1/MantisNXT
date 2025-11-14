"use client";

import React, { useEffect, useState } from "react";
import AppLayout from '@/app/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Entity = 'products' | 'orders' | 'customers' | 'categories'

export default function WooPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [entity, setEntity] = useState<Entity>('products')
  const [rows, setRows] = useState<Array<any>>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('orgId') : null
    if (stored) setOrgId(stored)
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    setIsAdmin(role === 'admin')
  }, [])

  const refresh = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/integrations/woocommerce/preview/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
        body: JSON.stringify({ entities: [entity] })
      })
      if (!r.ok) throw new Error(`Refresh failed: ${r.status}`)
      const res = await fetch(`/api/v1/integrations/woocommerce/table?entity=${entity}&orgId=${orgId}&page=1&pageSize=50`)
      const json = await res.json()
      setRows(json.data || [])
      setSelected({})
    } catch (e: any) {
      toast({ title: 'Refresh failed', description: e?.message || 'Error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [orgId, entity])

  return (
    <AppLayout title="WooCommerce" breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'WooCommerce' }] }>
      <div className="space-y-6">
        <Tabs defaultValue={entity} className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" onClick={() => setEntity('products')}>Products</TabsTrigger>
            <TabsTrigger value="orders" onClick={() => setEntity('orders')}>Orders</TabsTrigger>
            <TabsTrigger value="customers" onClick={() => setEntity('customers')}>Customers</TabsTrigger>
            <TabsTrigger value="categories" onClick={() => setEntity('categories')}>Categories</TabsTrigger>
          </TabsList>
          <TabsContent value={entity}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Woo {entity}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={refresh} aria-busy={loading} aria-label="Refresh preview" disabled={loading}>
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Refreshing...</>) : 'Refresh'}
                  </Button>
                  <Button variant="outline" onClick={selectAllNew} aria-label="Select all new" disabled={loading}>Select All New</Button>
                  <Button variant="outline" onClick={persistSelection} aria-label="Save selection" disabled={loading}>Save Selection</Button>
                  <Button onClick={startSelectedSync} aria-label="Sync selected" disabled={loading}>Sync Selected</Button>
                  {isAdmin && (
                    <Button variant="outline" onClick={scheduleFullSync} aria-label="Schedule full sync" disabled={loading}>Schedule full sync</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <>
                  {rows.length === 0 && (
                    <div className="mb-4 p-4 rounded-lg border bg-yellow-50 text-yellow-900">
                      No local records found for {entity}. This looks like an initial import — all records will be created from WooCommerce after you run a sync.
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Select</TableHead>
                        <TableHead>Status</TableHead>
                        {entity === 'products' && (<><TableHead>SKU</TableHead><TableHead>Name</TableHead></>)}
                        {entity === 'orders' && (<><TableHead>Order</TableHead><TableHead>State</TableHead></>)}
                        {entity === 'customers' && (<><TableHead>Email</TableHead><TableHead>Name</TableHead></>)}
                        {entity === 'categories' && (<><TableHead>Name</TableHead><TableHead>Slug</TableHead></>)}
                        <TableHead>External ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r: any) => (
                        <TableRow key={r.external_id}>
                          <TableCell>
                            <input type="checkbox" checked={!!selected[r.external_id]} onChange={() => toggleSelect(r.external_id)} />
                          </TableCell>
                          <TableCell>{r.status}</TableCell>
                          {entity === 'products' && (<><TableCell>{r.display?.sku || ''}</TableCell><TableCell>{r.display?.name || ''}</TableCell></>)}
                          {entity === 'orders' && (<><TableCell>{r.display?.order_number || ''}</TableCell><TableCell>{r.display?.status || ''}</TableCell></>)}
                          {entity === 'customers' && (<><TableCell>{r.display?.email || ''}</TableCell><TableCell>{r.display?.name || ''}</TableCell></>)}
                          {entity === 'categories' && (<><TableCell>{r.display?.name || ''}</TableCell><TableCell>{r.display?.slug || ''}</TableCell></>)}
                          <TableCell>{r.external_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectAllNew = () => {
    const next: Record<string, boolean> = {}
    rows.forEach((r: any) => { if (r.status === 'new') next[r.external_id] = true })
    setSelected(next)
  }

  const persistSelection = async () => {
    const selectedRows = rows.filter((r: any) => selected[r.external_id])
    if (selectedRows.length === 0 || !orgId) {
      toast({ title: 'No selection', description: 'Select at least one row', variant: 'destructive' })
      return
    }
    try {
      const ids = selectedRows.map((r: any) => r.external_id)
      const res = await fetch(`/api/v1/integrations/woocommerce/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
        body: JSON.stringify({ entity, ids, selected: true })
      })
      if (!res.ok) throw new Error(`Select failed: ${res.status}`)
      toast({ title: 'Selection saved', description: `${ids.length} item(s) selected` })
    } catch (e: any) {
      toast({ title: 'Selection failed', description: e?.message || 'Error', variant: 'destructive' })
    }
  }

  const startSelectedSync = async () => {
    const ids = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k)
    if (ids.length === 0 || !orgId) {
      toast({ title: 'No selection', description: 'Select at least one row', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/v1/integrations/woocommerce/sync/selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
        body: JSON.stringify({ org_id: orgId, entity, ids: ids.map(id => Number(id)) })
      })
      if (!res.ok) throw new Error(`Sync start failed: ${res.status}`)
      const json = await res.json()
      toast({ title: 'Selected sync', description: `Created ${json?.data?.created || 0}, Updated ${json?.data?.updated || 0}` })
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message || 'Error', variant: 'destructive' })
    }
  }

  const scheduleFullSync = async () => {
    if (!orgId) return
    const confirmed = window.confirm('Schedule full WooCommerce customer sync?')
    if (!confirmed) return
    try {
      const res = await fetch('/api/v1/integrations/woocommerce/schedule/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId, 'x-admin': 'true' },
        body: JSON.stringify({})
      })
      if (!res.ok) throw new Error(`Schedule failed: ${res.status}`)
      const json = await res.json()
      toast({ title: 'Scheduled', description: `Queue: ${json?.data?.queueId || json?.data?.queueId}` })
    } catch (e: any) {
      toast({ title: 'Schedule failed', description: e?.message || 'Error', variant: 'destructive' })
    }
  }
