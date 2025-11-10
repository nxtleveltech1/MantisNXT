"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, AlertTriangle, Zap, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BatchProgress {
  currentBatch: number
  totalBatches: number
  productsProcessed: number
  totalProducts: number
  tokensUsed?: {
    input: number
    output: number
    total: number
  }
  estimatedTimeRemaining?: number // seconds
  providerStatus?: Array<{
    provider: string
    status: 'active' | 'completed' | 'error' | 'rate_limited'
    batchesProcessed: number
    rateLimitRemaining?: number
  }>
}

interface BatchCategorizationProgressProps {
  progress: BatchProgress | null
  className?: string
}

export function BatchCategorizationProgress({ progress, className }: BatchCategorizationProgressProps) {
  if (!progress) {
    return null
  }

  const batchProgress = progress.totalBatches > 0 
    ? (progress.currentBatch / progress.totalBatches) * 100 
    : 0
  
  const productProgress = progress.totalProducts > 0
    ? (progress.productsProcessed / progress.totalProducts) * 100
    : 0

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${minutes}m ${secs}s`
  }

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return `${tokens}`
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
    return `${(tokens / 1000000).toFixed(2)}M`
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Batch Processing Progress
        </CardTitle>
        <CardDescription>
          Processing {progress.totalProducts} products in {progress.totalBatches} batches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">
              {progress.productsProcessed} / {progress.totalProducts} products
            </span>
          </div>
          <Progress value={productProgress} className="h-2" />
        </div>

        {/* Batch Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Batch Progress</span>
            <span className="font-medium">
              Batch {progress.currentBatch} / {progress.totalBatches}
            </span>
          </div>
          <Progress value={batchProgress} className="h-2" />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          {progress.tokensUsed && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Tokens Used</span>
              </div>
              <div className="text-lg font-semibold">
                {formatTokens(progress.tokensUsed.total)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTokens(progress.tokensUsed.input)} input / {formatTokens(progress.tokensUsed.output)} output
              </div>
            </div>
          )}

          {progress.estimatedTimeRemaining !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Estimated Time</span>
              </div>
              <div className="text-lg font-semibold">
                {formatTime(progress.estimatedTimeRemaining)}
              </div>
              <div className="text-xs text-muted-foreground">
                Remaining
              </div>
            </div>
          )}
        </div>

        {/* Provider Status */}
        {progress.providerStatus && progress.providerStatus.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Provider Status</div>
            <div className="space-y-2">
              {progress.providerStatus.map((provider) => (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {provider.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {provider.status === 'active' && (
                      <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
                    )}
                    {provider.status === 'error' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    {provider.status === 'rate_limited' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium capitalize">{provider.provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        provider.status === 'completed'
                          ? 'default'
                          : provider.status === 'active'
                          ? 'secondary'
                          : provider.status === 'rate_limited'
                          ? 'outline'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {provider.batchesProcessed} batches
                    </Badge>
                    {provider.rateLimitRemaining !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {provider.rateLimitRemaining} remaining
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}





