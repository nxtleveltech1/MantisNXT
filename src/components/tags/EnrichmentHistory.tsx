"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, Clock, User } from "lucide-react"

interface EnrichmentHistoryProps {
  productId: string
}

type EnrichmentLog = {
  id: string
  type: string
  source_data: Record<string, unknown> | null
  changes_applied: Record<string, unknown>
  confidence: number | null
  web_research_results: Record<string, unknown> | null
  created_at: Date
  created_by: string | null
}

export function EnrichmentHistory({ productId }: EnrichmentHistoryProps) {
  const [history, setHistory] = useState<EnrichmentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (productId) {
      fetchHistory()
    }
  }, [productId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tags/enrich/history/${productId}`)
      const data = await response.json()
      if (data.success) {
        setHistory(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch enrichment history:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enrichment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Enrichment History
          </CardTitle>
          <CardDescription>View past enrichment activities for this product</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No enrichment history found</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Enrichment History
        </CardTitle>
        <CardDescription>View past enrichment activities for this product</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((log) => (
            <div key={log.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{log.type}</Badge>
                  {log.confidence && (
                    <Badge variant="secondary">
                      {(log.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
              {log.changes_applied && Object.keys(log.changes_applied).length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">Changes Applied:</div>
                  <div className="text-sm space-y-1">
                    {Object.entries(log.changes_applied).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span>{" "}
                        {typeof value === "string" ? value : JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {log.created_by && (
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  {log.created_by}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

