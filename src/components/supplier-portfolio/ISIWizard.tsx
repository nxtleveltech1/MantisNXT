"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  Info,
  TrendingUp,
  AlertCircle,
  Loader2,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  useActiveSelection,
  useSelections,
  useCreateSelection,
  useAddProductsToSelection,
  useActivateSelection,
  useSelectionProducts,
} from '@/hooks/useNeonSpp'
import SupplierProductDataTable from './SupplierProductDataTable'
import type { InventorySelection } from '@/types/nxt-spp'

interface ISIWizardProps {
  defaultSupplierId?: string
  defaultSelectionId?: string
  onComplete?: (selection: InventorySelection) => void
  onCancel?: () => void
  onNavigateToReports?: () => void
}

export function ISIWizard({
  defaultSupplierId,
  defaultSelectionId,
  onComplete,
  onCancel,
  onNavigateToReports,
}: ISIWizardProps) {
  // State
  const [selectionId, setSelectionId] = useState<string | null>(defaultSelectionId || null)
  const [selectionName, setSelectionName] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(!defaultSelectionId)
  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictInfo, setConflictInfo] = useState<{
    active_selection_id: string
    active_selection_name: string
  } | null>(null)
  const [selections, setSelections] = useState<InventorySelection[]>([])
  const [activeSelection, setActiveSelection] = useState<InventorySelection | null>(null)
  const [selectionSummary, setSelectionSummary] = useState({
    count: 0,
    totalValue: 0,
    supplierCount: 0,
    categoryCount: 0,
  })

  // Load existing selections and active selection
  useEffect(() => {
    fetchSelections()
    fetchActiveSelection()
  }, [])

  const fetchSelections = async () => {
    try {
      const response = await fetch('/api/core/selections?status=draft,active')
      if (response.ok) {
        const data = await response.json()
        setSelections(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch selections:', err)
    }
  }

  const fetchActiveSelection = async () => {
    try {
      const response = await fetch('/api/core/selections/active')
      if (response.ok) {
        const data = await response.json()
        setActiveSelection(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch active selection:', err)
    }
  }

  // Create new selection
  const handleCreateSelection = async () => {
    if (!selectionName.trim()) {
      setError('Please enter a selection name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/core/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection_name: selectionName,
          description: 'Created via ISI Wizard',
          created_by: '00000000-0000-0000-0000-000000000000', // System user placeholder
          status: 'draft',
        }),
      })

      if (!response.ok) throw new Error('Failed to create selection')

      const result = await response.json()
      setSelectionId(result.selection.selection_id)
      setShowCreateDialog(false)
      fetchSelections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create selection')
    } finally {
      setLoading(false)
    }
  }

  // Add products to selection
  const handleAddToSelection = async () => {
    if (!selectionId || selectedProductIds.length === 0) {
      setError('No products selected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/core/selections/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection_id: selectionId,
          supplier_product_ids: selectedProductIds,
          action: 'select',
          selected_by: '00000000-0000-0000-0000-000000000000', // System user placeholder
        }),
      })

      if (!response.ok) throw new Error('Failed to add products')

      const result = await response.json()

      // Clear selection and show success
      setSelectedProductIds([])
      updateSelectionSummary()

      // Show success notification
      alert(`Successfully added ${result.items_affected} products to selection`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add products')
    } finally {
      setLoading(false)
    }
  }

  // Activate selection with single-active enforcement
  const handleActivateSelection = async (deactivateOthers = false) => {
    if (!selectionId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/core/selections/${selectionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivate_others: deactivateOthers }),
      })

      const result = await response.json()

      if (response.status === 409) {
        // Conflict: Another selection is active
        setConflictInfo(result.conflict)
        setShowActivateDialog(false)
        setShowConflictDialog(true)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate selection')
      }

      // Success! Invalidate caches and refresh
      setShowActivateDialog(false)
      setShowConflictDialog(false)

      // Trigger cache invalidation on frontend
      await fetchActiveSelection()
      await fetchSelections()

      // Show success message
      alert('Selection activated successfully! All stock reports now reflect this selection.')

      // Call completion handler
      if (onComplete) {
        onComplete(result.data)
      }

      // Navigate to stock reports
      if (onNavigateToReports) {
        onNavigateToReports()
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate selection')
    } finally {
      setLoading(false)
    }
  }

  // Update selection summary
  const updateSelectionSummary = useCallback(async () => {
    if (!selectionId) return

    try {
      const response = await fetch(`/api/core/selections/${selectionId}/items`)
      if (response.ok) {
        const data = await response.json()
        const items = data.data || []

        setSelectionSummary({
          count: items.length,
          totalValue: items.reduce((sum: number, item: any) => sum + (item.current_price || 0), 0),
          supplierCount: new Set(items.map((item: any) => item.supplier_id)).size,
          categoryCount: new Set(items.map((item: any) => item.category_id)).size,
        })
      }
    } catch (err) {
      console.error('Failed to update summary:', err)
    }
  }, [selectionId])

  useEffect(() => {
    if (selectionId) {
      updateSelectionSummary()
    }
  }, [selectionId, updateSelectionSummary])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Inventory Selection Interface (ISI)
            </div>
            {selectionId && (
              <div className="flex items-center gap-2">
                {activeSelection?.selection_id === selectionId && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
                <Button
                  onClick={() => setShowActivateDialog(true)}
                  disabled={selectionSummary.count === 0 || activeSelection?.selection_id === selectionId}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Activate Selection
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Selection Info */}
            <div className="flex items-center gap-4">
              <div>
                <Label>Current Selection</Label>
                <Select
                  value={selectionId || ''}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setShowCreateDialog(true)
                    } else {
                      setSelectionId(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select or create selection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Create New Selection</SelectItem>
                    {selections.map(sel => (
                      <SelectItem key={sel.selection_id} value={sel.selection_id}>
                        {sel.selection_name}
                        <Badge variant="outline" className="ml-2">
                          {sel.status}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Metrics */}
            {selectionId && (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectionSummary.count}
                  </div>
                  <div className="text-xs text-muted-foreground">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectionSummary.totalValue)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectionSummary.supplierCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Suppliers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectionSummary.categoryCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Categories</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Selection Banner */}
      {activeSelection && activeSelection.selection_id !== selectionId && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong className="text-yellow-900">Current Active Selection:</strong>{' '}
            <span className="text-yellow-700">{activeSelection.selection_name}</span>
            <span className="text-yellow-600 ml-2">
              (This is currently shown in all stock reports)
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      {!selectionId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Create or select an inventory selection to begin choosing products to stock.
            Only products in the active selection will appear in stock reports.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Product Selection Table */}
      {selectionId && (
        <>
          {/* Selection Actions */}
          {selectedProductIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-0 z-10 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-900">
                  {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddToSelection}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Add to Selection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProductIds([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Data Table */}
          <SupplierProductDataTable
            supplier_id={defaultSupplierId}
            selection_id={selectionId}
            enable_selection={true}
            on_selection_change={setSelectedProductIds}
          />
        </>
      )}

      {/* Create Selection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Inventory Selection</DialogTitle>
            <DialogDescription>
              Name this selection to start choosing products to stock
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="selection-name">Selection Name</Label>
              <Input
                id="selection-name"
                placeholder="e.g., Q1 2025 Inventory"
                value={selectionName}
                onChange={(e) => setSelectionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSelection()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSelection} disabled={loading || !selectionName.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Inventory Selection?</DialogTitle>
            <DialogDescription>
              This will make {selectionSummary.count} products available for stock tracking in NXT SOH reports.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Business Rule:</strong> Only ONE selection can be active at a time.
                Activating this selection will ensure all stock reports show only these products.
              </AlertDescription>
            </Alert>

            {activeSelection && activeSelection.selection_id !== selectionId && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Another selection "{activeSelection.selection_name}" is currently active.
                  Activating this selection will automatically archive the current one.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleActivateSelection(true)} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Activate Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selection Conflict</DialogTitle>
            <DialogDescription>
              Another selection is currently active
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Conflict:</strong> "{conflictInfo?.active_selection_name}" is currently the active selection.
                Only one selection can be active at a time.
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
              Would you like to deactivate "{conflictInfo?.active_selection_name}" and activate this selection instead?
            </p>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The current selection will be archived (not deleted) and can be reactivated later.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleActivateSelection(true)} disabled={loading} variant="destructive">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate Current & Activate This
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
