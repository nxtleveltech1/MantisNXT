"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useInventoryStore } from '@/stores/inventory-store'

export function InventoryTable() {
  const { items } = useInventoryStore()
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">No items yet.</div>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(it => (
          <TableRow key={it.id}>
            <TableCell className="font-mono text-xs">{it.sku}</TableCell>
            <TableCell>{it.name}</TableCell>
            <TableCell>{it.category}</TableCell>
            <TableCell className="text-right">{it.currentStock}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">{it.status.replace(/_/g, ' ')}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}









