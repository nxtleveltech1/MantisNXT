"use client"

import { useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Play, RotateCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/utils/api-url"

interface JobControlPanelProps {
  onJobStarted: (jobId: string) => void
}

export const TagJobControlPanel = memo(function TagJobControlPanel({ onJobStarted }: JobControlPanelProps) {
  const [batchSize, setBatchSize] = useState(200)
  const [productLimit, setProductLimit] = useState<number | ''>('')
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7)
  const [supplierFilter, setSupplierFilter] = useState("")
  const [forceOverride, setForceOverride] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const buildPayload = useCallback(
    (
      jobType: "full_scan" | "retag",
      extraFilters: Record<string, unknown> = {},
      configOverrides: Record<string, unknown> = {}
    ) => {
      const limit = typeof productLimit === 'number' && productLimit > 0 ? productLimit : undefined
      return {
        job_type: jobType,
        filters: {
          supplier_id: supplierFilter || undefined,
          ...extraFilters,
        },
        config: {
          confidence_threshold: confidenceThreshold,
          force_retag: jobType !== "full_scan" || forceOverride,
          ...configOverrides,
        },
        batch_size: batchSize,
        product_limit: limit,
      }
    },
    [batchSize, confidenceThreshold, forceOverride, productLimit, supplierFilter]
  )

  const startFullTagging = useCallback(async () => {
    setIsStarting(true)
    try {
      const response = await fetch(buildApiUrl("/api/tag/ai-tagging/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload("full_scan", { exclude_tagged: !forceOverride })
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Tagging job started: ${data.job_id}`)
        toast.info(`Processing ${data.estimated_products} products`)
        onJobStarted(data.job_id)
      } else {
        toast.error(data.message || "Failed to start job")
      }
    } catch (error) {
      toast.error("Failed to start tagging job")
      console.error(error)
    } finally {
      setIsStarting(false)
    }
  }, [buildPayload, forceOverride, onJobStarted])

  const startLowConfidenceRetag = useCallback(async () => {
    setIsStarting(true)
    try {
      const response = await fetch(buildApiUrl("/api/tag/ai-tagging/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload("retag", { confidence_max: confidenceThreshold }, { force_retag: true })
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Low-confidence retag job started: ${data.job_id}`)
        onJobStarted(data.job_id)
      } else {
        toast.error(data.message || "Failed to start job")
      }
    } catch (error) {
      toast.error("Failed to start retag job")
      console.error(error)
    } finally {
      setIsStarting(false)
    }
  }, [buildPayload, confidenceThreshold, onJobStarted])

  const startFailedRetag = useCallback(async () => {
    setIsStarting(true)
    try {
      const response = await fetch(buildApiUrl("/api/tag/ai-tagging/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload("retag", { status: ["failed"] }, { force_retag: true })
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Failed items retag job started: ${data.job_id}`)
        onJobStarted(data.job_id)
      } else {
        toast.error(data.message || "Failed to start job")
      }
    } catch (error) {
      toast.error("Failed to start retag job")
      console.error(error)
    } finally {
      setIsStarting(false)
    }
  }, [buildPayload, onJobStarted])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tagging Job Control Panel</CardTitle>
        <CardDescription>Configure and start AI tagging jobs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="batch-size">Batch Size</Label>
            <Input
              id="batch-size"
              type="number"
              min="50"
              max="500"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 200)}
            />
            <p className="text-xs text-muted-foreground">Products per batch (50-500)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-limit">Total Products (Optional)</Label>
            <Input
              id="product-limit"
              type="number"
              min="1"
              placeholder="All"
              value={productLimit === '' ? '' : productLimit}
              onChange={(e) => {
                const value = e.target.value
                if (value === '') {
                  setProductLimit('')
                } else {
                  const parsed = parseInt(value, 10)
                  setProductLimit(Number.isFinite(parsed) && parsed > 0 ? parsed : '')
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Process only the first N products (oldest first).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-filter">Supplier Filter (Optional)</Label>
            <Input
              id="supplier-filter"
              placeholder="Supplier ID..."
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty for all suppliers</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confidence-threshold">
            Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
          </Label>
          <Slider
            id="confidence-threshold"
            min={0.5}
            max={1.0}
            step={0.05}
            value={[confidenceThreshold]}
            onValueChange={(values) => setConfidenceThreshold(values[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Minimum confidence score for auto-assignment
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="force-override"
            checked={forceOverride}
            onCheckedChange={setForceOverride}
          />
          <Label htmlFor="force-override" className="cursor-pointer">
            Force Override (Re-tag all products)
          </Label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Button
            onClick={startFullTagging}
            disabled={isStarting}
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Full Tagging
          </Button>

          <Button
            onClick={startLowConfidenceRetag}
            disabled={isStarting}
            variant="secondary"
            className="w-full"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Retag Low Confidence
          </Button>

          <Button
            onClick={startFailedRetag}
            disabled={isStarting}
            variant="outline"
            className="w-full"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Retag Failed Items
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})









