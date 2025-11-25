"use client"

import { useEffect, useMemo, useState } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle, Loader2, RefreshCcw, ShieldCheck, X } from "lucide-react"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/utils/api-url"

type CategorySuggestion = {
  proposed_category_id?: string | null
  category_id?: string | null
  category_name?: string | null
  confidence?: number | null
  reasoning?: string | null
  provider?: string | null
}

type CategoryConflict = {
  supplier_product_id: string
  supplier_id: string
  supplier_sku: string
  product_name: string
  conflict_type: string
  severity: "low" | "medium" | "high"
  message: string
  current_category_id?: string | null
  current_category_name?: string | null
  ai_confidence?: number | null
  ai_reasoning?: string | null
  ai_status?: string | null
  suggestions: CategorySuggestion[]
}

type CategoryOption = {
  id: string
  name: string
  path: string
}

export default function ConflictResolutionQueue() {
  const [conflicts, setConflicts] = useState<CategoryConflict[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [conflictsRes, categoriesRes] = await Promise.all([
        fetch(buildApiUrl("/api/category/conflicts")),
        fetch(buildApiUrl("/api/categories")),
      ])

      if (conflictsRes.ok) {
        const payload = await conflictsRes.json()
        if (payload?.success && Array.isArray(payload.conflicts)) {
          setConflicts(payload.conflicts as CategoryConflict[])
        } else {
          setConflicts([])
        }
      } else {
        throw new Error("Unable to load conflict queue")
      }

      if (categoriesRes.ok) {
        const categoryData: CategoryOption[] = await categoriesRes.json()
        setCategories(
          (Array.isArray(categoryData) ? categoryData : []).map((category) => ({
            id: category.id,
            name: category.name,
            path: category.path,
          })),
        )
      }
    } catch (error) {
      console.error("Failed to load conflict resolution data:", error)
      toast.error("Unable to load conflict queue. Please try again later.")
      setConflicts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssignExisting = async (
    conflict: CategoryConflict,
    categoryId: string,
    method: "manual" | "ai_manual_accept" = "manual",
  ) => {
    setResolvingId(conflict.supplier_product_id)
    try {
      const response = await fetch(buildApiUrl("/api/category/assign"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierProductId: conflict.supplier_product_id,
          categoryId,
          method,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to assign category")
      }

      toast.success("Category assignment saved")
      setConflicts((prev) => prev.filter((item) => item.supplier_product_id !== conflict.supplier_product_id))
    } catch (error) {
      console.error("Failed to assign category:", error)
      toast.error(error instanceof Error ? error.message : "Could not assign category")
    } finally {
      setResolvingId(null)
    }
  }

  const handleApproveProposal = async (conflict: CategoryConflict, suggestion: CategorySuggestion) => {
    if (!suggestion.proposed_category_id) {
      toast.error("Proposal identifier not available")
      return
    }

    setResolvingId(conflict.supplier_product_id)
    try {
      const response = await fetch(buildApiUrl("/api/category/ai-categorization/proposals/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_category_id: suggestion.proposed_category_id,
          parent_category_id: conflict.current_category_id ?? null,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to approve proposed category")
      }

      toast.success("Proposed category approved and applied")
      setConflicts((prev) => prev.filter((item) => item.supplier_product_id !== conflict.supplier_product_id))
    } catch (error) {
      console.error("Failed to approve proposed category:", error)
      toast.error(error instanceof Error ? error.message : "Could not approve proposed category")
    } finally {
      setResolvingId(null)
    }
  }

  const handleManualAssignment = async (conflict: CategoryConflict) => {
    const selected = manualAssignments[conflict.supplier_product_id]
    if (!selected) {
      toast.error("Select a category before assigning")
      return
    }
    await handleAssignExisting(conflict, selected)
  }

  const conflictSummary = useMemo(() => {
    if (conflicts.length === 0) {
      return null
    }

    const bySeverity = conflicts.reduce(
      (acc, conflict) => {
        acc[conflict.severity] = (acc[conflict.severity] ?? 0) + 1
        return acc
      },
      {} as Record<CategoryConflict["severity"], number>,
    )

    return bySeverity
  }, [conflicts])

  if (loading) {
    return (
      <AppLayout
        title="Conflict Resolution"
        breadcrumbs={[
          { label: "Category Management", href: "/catalog/categories" },
          { label: "Conflict Resolution" },
        ]}
      >
        <div className="text-center py-20 space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading the conflict queue…</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Conflict Resolution"
      breadcrumbs={[
        { label: "Category Management", href: "/catalog/categories" },
        { label: "Conflict Resolution" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Conflict Resolution Queue</h1>
            <p className="text-muted-foreground">
              Resolve category assignments flagged by AI for human review.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {conflictSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Queue Overview</CardTitle>
              <CardDescription>Conflicts grouped by severity.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {Object.entries(conflictSummary).map(([severity, count]) => (
                <Badge
                  key={severity}
                  variant="outline"
                  className={severityTone(severity as CategoryConflict["severity"])}
                >
                  {formatSeverityLabel(severity as CategoryConflict["severity"])} • {count}
                </Badge>
              ))}
              <Badge variant="secondary">Total • {conflicts.length}</Badge>
            </CardContent>
          </Card>
        )}

        {conflicts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-lg font-semibold">No conflicts detected</h2>
              <p className="text-muted-foreground">
                All categorized products currently meet confidence thresholds and hierarchy rules.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {conflicts.map((conflict) => {
              const manualSelection = manualAssignments[conflict.supplier_product_id] ?? ""
              return (
                <Card key={conflict.supplier_product_id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={severityTone(conflict.severity)}>
                            {formatConflictLabel(conflict.conflict_type)}
                          </Badge>
                          <Badge variant="outline">{conflict.severity.toUpperCase()}</Badge>
                          {conflict.ai_status && <Badge variant="outline">{conflict.ai_status}</Badge>}
                        </div>
                        <CardTitle className="text-lg">{conflict.product_name}</CardTitle>
                        <CardDescription>
                          SKU {conflict.supplier_sku}
                          {conflict.current_category_name ? ` • Current: ${conflict.current_category_name}` : ""}
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {conflict.ai_reasoning && (
                          <p>
                            <strong className="text-foreground">AI reasoning:</strong> {conflict.ai_reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <span>{conflict.message}</span>
                    </div>

                    {conflict.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">AI Suggestions</h3>
                        <div className="space-y-2">
                          {conflict.suggestions.map((suggestion, index) => {
                            const confidence = suggestion.confidence ?? 0
                            const isExistingCategory = !!suggestion.category_id
                            return (
                              <div
                                key={`${suggestion.category_id ?? suggestion.proposed_category_id ?? index}`}
                                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border rounded-md p-3"
                              >
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {suggestion.category_name ?? "New category proposal"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline">
                                      {(confidence * 100).toFixed(0)}% confidence
                                    </Badge>
                                    {index === 0 && <Badge variant="secondary">Top choice</Badge>}
                                    {suggestion.provider && (
                                      <Badge variant="outline">Provider: {suggestion.provider}</Badge>
                                    )}
                                  </div>
                                  {suggestion.reasoning && (
                                    <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {isExistingCategory ? (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleAssignExisting(conflict, suggestion.category_id!, "ai_manual_accept")
                                      }
                                      disabled={resolvingId === conflict.supplier_product_id}
                                    >
                                      {resolvingId === conflict.supplier_product_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Assign Category"
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleApproveProposal(conflict, suggestion)}
                                      disabled={resolvingId === conflict.supplier_product_id}
                                    >
                                      {resolvingId === conflict.supplier_product_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <ShieldCheck className="h-4 w-4 mr-2" />
                                          Approve &amp; Create
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-4">
                      <h3 className="text-sm font-medium">Manual Assignment</h3>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <Select
                          value={manualSelection}
                          onValueChange={(value) =>
                            setManualAssignments((prev) => ({
                              ...prev,
                              [conflict.supplier_product_id]: value,
                            }))
                          }
                          disabled={resolvingId === conflict.supplier_product_id}
                        >
                          <SelectTrigger className="md:w-80">
                            <SelectValue placeholder="Select category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.path}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManualAssignment(conflict)}
                            disabled={resolvingId === conflict.supplier_product_id}
                          >
                            {resolvingId === conflict.supplier_product_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Assign Manually"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConflicts((prev) =>
                                prev.filter((item) => item.supplier_product_id !== conflict.supplier_product_id),
                              )
                            }
                          >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function severityTone(severity: CategoryConflict["severity"]) {
  switch (severity) {
    case "high":
      return "bg-red-50 text-red-700 border border-red-200"
    case "medium":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200"
    default:
      return "bg-blue-50 text-blue-700 border border-blue-200"
  }
}

function formatSeverityLabel(severity: CategoryConflict["severity"]) {
  if (severity === "high") return "High severity"
  if (severity === "medium") return "Medium severity"
  return "Low severity"
}

function formatConflictLabel(type: string) {
  switch (type) {
    case "missing_category":
      return "Missing category"
    case "pending_review":
      return "Pending review"
    case "ai_failed":
      return "AI categorization failed"
    default:
      return type.replace(/_/g, " ")
  }
}
