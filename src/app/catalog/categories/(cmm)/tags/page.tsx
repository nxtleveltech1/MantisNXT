"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, LucideTag, Zap, Target, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

type SchemaMode = "core" | "legacy" | "demo"

type TagRecord = {
  id: string
  name: string
  type: string
  productCount: number
}

type TagsResponse = {
  success: boolean
  mode: SchemaMode
  tags: TagRecord[]
}

type Rule = {
  id: string
  kind: string
  keyword: string
  tagId: string
  tagName: string
}

type Product = {
  supplier_product_id?: string
  sku: string
  description: string
  brand?: string
  seriesRange?: string
  categoryId?: string | null
  tags?: string[]
}

export default function TagsPage() {
  const [schemaMode, setSchemaMode] = useState<SchemaMode>("demo")
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState<TagRecord[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagType, setNewTagType] = useState<"seasonal" | "stock" | "custom">("custom")
  const [newRuleKeyword, setNewRuleKeyword] = useState("")
  const [newRuleTagId, setNewRuleTagId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedTag, setSelectedTag] = useState("")

  useEffect(() => {
    void fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tagsRes, rulesRes, productsRes] = await Promise.all([
        fetch("/api/tags"),
        fetch("/api/tags/rules"),
        fetch("/api/products?uncategorized=true&limit=200"),
      ])

      const tagsPayload: TagsResponse = await tagsRes.json()
      if (tagsPayload?.success) {
        setSchemaMode(tagsPayload.mode)
        setTags(tagsPayload.tags ?? [])
      } else {
        setTags([])
      }

      const rulesPayload = await rulesRes.json()
      if (rulesPayload?.success && Array.isArray(rulesPayload.rules)) {
        setRules(rulesPayload.rules)
      } else if (Array.isArray(rulesPayload)) {
        setRules(rulesPayload as Rule[])
      } else {
        setRules([])
      }

      const productsPayload = await productsRes.json()
      if (Array.isArray(productsPayload)) {
        setProducts(productsPayload as Product[])
      } else if (Array.isArray(productsPayload?.products)) {
        setProducts(productsPayload.products as Product[])
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error("Failed to fetch tag data:", error)
      toast.error("Unable to load tag data right now.")
    } finally {
      setLoading(false)
    }
  }

  const totalAssignments = useMemo(
    () => tags.reduce((sum, tag) => sum + (tag.productCount || 0), 0),
    [tags],
  )

  const handleCreateTag = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newTagName.trim()) {
      toast.error("Tag name is required")
      return
    }

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), type: newTagType }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to create tag")
      }

      toast.success("Tag created successfully")
      setNewTagName("")
      await fetchData()
    } catch (error) {
      console.error("Failed to create tag:", error)
      toast.error(error instanceof Error ? error.message : "Unable to create tag")
    }
  }

  const handleCreateRule = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newRuleKeyword.trim() || !newRuleTagId) {
      toast.error("Keyword and tag are required")
      return
    }

    try {
      const response = await fetch("/api/tags/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newRuleKeyword.trim(), tagId: newRuleTagId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to create rule")
      }

      toast.success("Rule created successfully")
      setNewRuleKeyword("")
      setNewRuleTagId("")
      await fetchData()
    } catch (error) {
      console.error("Failed to create rule:", error)
      toast.error(error instanceof Error ? error.message : "Unable to create rule")
    }
  }

  const handleAssignTag = async () => {
    if (!selectedProductId || !selectedTag) {
      toast.error("Select both a product and a tag")
      return
    }

    const product = products.find(
      (item) =>
        item.supplier_product_id === selectedProductId || item.sku === selectedProductId,
    )
    if (!product) {
      toast.error("Selected product not found")
      return
    }

    const payload: Record<string, string> = {
      tagId: selectedTag,
    }

    if (schemaMode === "core") {
      if (!product.supplier_product_id) {
        toast.error("Supplier product identifier missing for this item")
        return
      }
      payload.supplierProductId = product.supplier_product_id
    } else {
      payload.sku = product.sku
    }

    try {
      const response = await fetch("/api/tags/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to assign tag")
      }

      toast.success("Tag assigned successfully")
      await fetchData()
    } catch (error) {
      console.error("Failed to assign tag:", error)
      toast.error(error instanceof Error ? error.message : "Unable to assign tag")
    }
  }

  const handleApplyRules = async () => {
    try {
      const response = await fetch("/api/tags/rules/apply", { method: "POST" })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to apply rules")
      }
      toast.success("Rules applied successfully")
      await fetchData()
    } catch (error) {
      console.error("Failed to apply rules:", error)
      toast.error(error instanceof Error ? error.message : "Unable to apply rules")
    }
  }

  const handlePredictiveAssign = async () => {
    try {
      const response = await fetch("/api/tags/predictive-assign", { method: "POST" })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to assign predictive tags")
      }
      toast.success("Predictive tagging complete")
      await fetchData()
    } catch (error) {
      console.error("Failed to assign predictive tags:", error)
      toast.error(error instanceof Error ? error.message : "Unable to run predictive tagging")
    }
  }

  const overviewMessage =
    schemaMode === "core"
      ? "AI tag management is backed by the new supplier product tables. Manual assignments update the shared tag registry."
      : schemaMode === "legacy"
        ? "Legacy tag tables detected. Operations remain compatible with the previous workflow."
        : "Demo mode: data is simulated for preview purposes."

  return (
    <AppLayout
      title="Tag Management"
      breadcrumbs={[{ label: "Category Management", href: "/catalog/categories" }, { label: "Tags" }]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tag Management</h1>
            <p className="text-muted-foreground">{overviewMessage}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleApplyRules} variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Apply Rules
            </Button>
            <Button onClick={handlePredictiveAssign} variant="outline" size="sm">
              <Target className="h-4 w-4 mr-2" />
              Predictive Assign
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tags</CardTitle>
              <LucideTag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tags.length}</div>
              <p className="text-xs text-muted-foreground">Tags available for assignment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <Badge variant="outline">{schemaMode.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssignments}</div>
              <p className="text-xs text-muted-foreground">Total tag assignments recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules.length}</div>
              <p className="text-xs text-muted-foreground">Keyword rules currently in place</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading tag data…</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LucideTag className="h-5 w-5" />
                  Create Tag
                </CardTitle>
                <CardDescription>Add tags to the shared library for quick assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTag} className="space-y-4">
                  <div>
                    <Label htmlFor="tagName">Tag Name</Label>
                    <Input
                      id="tagName"
                      value={newTagName}
                      onChange={(event) => setNewTagName(event.target.value)}
                      placeholder="e.g., Summer Collection"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tagType">Type</Label>
                    <Select value={newTagType} onValueChange={(value: "seasonal" | "stock" | "custom") => setNewTagType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tag
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Assignment</CardTitle>
                <CardDescription>Select a product and apply an existing tag.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {products.map((product) => {
                        const value = schemaMode === "core" ? product.supplier_product_id ?? product.sku : product.sku
                        return (
                          <SelectItem key={value} value={value}>
                            {product.sku} — {product.description}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tag">Tag</Label>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignTag} className="w-full">
                  Assign Tag
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Keyword Rule</CardTitle>
                <CardDescription>Automatically add tags when keywords appear in product names.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div>
                    <Label htmlFor="keyword">Keyword</Label>
                    <Input
                      id="keyword"
                      value={newRuleKeyword}
                      onChange={(event) => setNewRuleKeyword(event.target.value)}
                      placeholder="e.g., jacket"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ruleTag">Tag</Label>
                    <Select value={newRuleTagId} onValueChange={setNewRuleTagId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Create Rule
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Tags ({tags.length})</CardTitle>
                <CardDescription>Tags with assignment counts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tags found. Create a tag to get started.
                    </p>
                  ) : (
                    tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={
                          tag.type === "seasonal"
                            ? "default"
                            : tag.type === "stock"
                              ? "secondary"
                              : tag.type === "auto"
                                ? "outline"
                                : "default"
                        }
                      >
                        {tag.name} • {tag.productCount}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Active Rules ({rules.length})</CardTitle>
            <CardDescription>Keyword-based automation currently configured.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No rules created yet.</p>
              ) : (
                rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{rule.kind}</Badge>
                      <span className="font-medium">"{rule.keyword}"</span>
                      <span className="text-muted-foreground">→</span>
                      <Badge>{rule.tagName}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

"use client"

