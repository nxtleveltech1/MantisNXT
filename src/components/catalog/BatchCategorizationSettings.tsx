"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Save, RotateCcw, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface BatchSettings {
  batchSize?: number
  batchDelay: number
  maxRetries: number
  confidenceThreshold: number
  autoAccept: boolean
}

interface BatchCategorizationSettingsProps {
  settings: BatchSettings
  onSettingsChange: (settings: BatchSettings) => void
  providerLimits?: Array<{
    provider: string
    maxBatchSize: number
    recommendedBatchSize: number
    contextWindow: number
  }>
  className?: string
}

const DEFAULT_SETTINGS: BatchSettings = {
  batchDelay: 2000,
  maxRetries: 2,
  confidenceThreshold: 0.7,
  autoAccept: false,
}

export function BatchCategorizationSettings({
  settings,
  onSettingsChange,
  providerLimits = [],
  className,
}: BatchCategorizationSettingsProps) {
  const [localSettings, setLocalSettings] = useState<BatchSettings>({ ...DEFAULT_SETTINGS, ...settings })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setLocalSettings({ ...DEFAULT_SETTINGS, ...settings })
    setHasChanges(false)
  }, [settings])

  const handleChange = (key: keyof BatchSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    onSettingsChange(localSettings)
    setHasChanges(false)
  }

  const handleReset = () => {
    setLocalSettings({ ...DEFAULT_SETTINGS, ...settings })
    setHasChanges(false)
  }

  // Calculate recommended batch size from provider limits
  const recommendedBatchSize = providerLimits.length > 0
    ? Math.min(...providerLimits.map(p => p.recommendedBatchSize))
    : 50

  const maxBatchSize = providerLimits.length > 0
    ? Math.min(...providerLimits.map(p => p.maxBatchSize))
    : 100

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Batch Processing Settings
        </CardTitle>
        <CardDescription>
          Configure batch processing parameters for AI categorization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Batch Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="batch-size">Batch Size</Label>
            <div className="flex items-center gap-2">
              <Input
                id="batch-size"
                type="number"
                value={localSettings.batchSize || recommendedBatchSize}
                onChange={(e) => handleChange('batchSize', parseInt(e.target.value) || undefined)}
                min={1}
                max={maxBatchSize}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">products</span>
            </div>
          </div>
          <Slider
            value={[localSettings.batchSize || recommendedBatchSize]}
            onValueChange={([value]) => handleChange('batchSize', value)}
            min={1}
            max={maxBatchSize}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Recommended: {recommendedBatchSize}
            </span>
            <span>{maxBatchSize}</span>
          </div>
          {providerLimits.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Provider limits: {providerLimits.map(p => (
                  <span key={p.provider} className="inline-block mr-2">
                    <Badge variant="outline" className="text-xs">
                      {p.provider}: max {p.maxBatchSize}
                    </Badge>
                  </span>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Batch Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="batch-delay">Batch Delay</Label>
            <div className="flex items-center gap-2">
              <Input
                id="batch-delay"
                type="number"
                value={localSettings.batchDelay}
                onChange={(e) => handleChange('batchDelay', parseInt(e.target.value) || 2000)}
                min={0}
                max={10000}
                step={100}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
          </div>
          <Slider
            value={[localSettings.batchDelay]}
            onValueChange={([value]) => handleChange('batchDelay', value)}
            min={0}
            max={5000}
            step={100}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0ms</span>
            <span>Delay between batches</span>
            <span>5s</span>
          </div>
        </div>

        {/* Max Retries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="max-retries">Max Retries</Label>
            <Input
              id="max-retries"
              type="number"
              value={localSettings.maxRetries}
              onChange={(e) => handleChange('maxRetries', parseInt(e.target.value) || 0)}
              min={0}
              max={5}
              className="w-20"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Number of retry attempts for failed batches
          </p>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
            <div className="flex items-center gap-2">
              <Input
                id="confidence-threshold"
                type="number"
                value={localSettings.confidenceThreshold}
                onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value) || 0.7)}
                min={0}
                max={1}
                step={0.05}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {(localSettings.confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <Slider
            value={[localSettings.confidenceThreshold]}
            onValueChange={([value]) => handleChange('confidenceThreshold', value)}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>Minimum confidence for auto-acceptance</span>
            <span>100%</span>
          </div>
        </div>

        {/* Auto Accept */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-accept">Auto-Accept Suggestions</Label>
            <p className="text-xs text-muted-foreground">
              Automatically accept suggestions above confidence threshold
            </p>
          </div>
          <Switch
            id="auto-accept"
            checked={localSettings.autoAccept}
            onCheckedChange={(checked) => handleChange('autoAccept', checked)}
          />
        </div>

        {/* Actions */}
        {hasChanges && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button onClick={handleSave} size="sm" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}





