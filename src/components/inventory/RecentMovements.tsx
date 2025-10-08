"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

export function RecentMovements({ showAll = false }: { showAll?: boolean }) {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <Card key={i}><CardContent className="p-3 text-sm text-muted-foreground">Movement #{i} placeholder</CardContent></Card>
      ))}
      {!showAll && <div className="text-xs text-muted-foreground">Showing latest movements</div>}
    </div>
  )
}









