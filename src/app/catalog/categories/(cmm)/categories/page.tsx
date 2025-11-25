"use client"

import { useEffect, useMemo, useState } from "react"
import AppLayout, { findSectionForPath } from "@/components/layout/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GitBranch, Plus } from "lucide-react"
import { toast } from "sonner"
import { SectionQuickLinks } from "@/components/layout/SectionQuickLinks"
import { usePathname } from "next/navigation"

type Category = {
  id: string
  name: string
  parentId: string | null
  path: string
  level?: number
  isActive?: boolean
  productCount?: number
  pendingReviewCount?: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [parentCategory, setParentCategory] = useState<string>("")
  const pathname = usePathname() || ""
  const sectionLinks = useMemo(
    () => findSectionForPath(pathname)?.items ?? [],
    [pathname],
  )

  useEffect(() => {
    void fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/categories")
      if (!response.ok) {
        throw new Error("Failed to load categories")
      }
      const data: Category[] = await response.json()
      if (process.env.NODE_ENV !== "production") {
        console.info("[Categories] fetched", Array.isArray(data) ? data.length : 0)
      }
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      toast.error("Failed to load categories")
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newCategoryName.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      setCreating(true)
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parentId: parentCategory || null,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to create category")
      }

      toast.success("Category created successfully")
      setNewCategoryName("")
      setParentCategory("")
      await fetchCategories()
    } catch (error) {
      console.error("Failed to create category:", error)
      toast.error(
        error instanceof Error ? error.message : "Could not create category. Try again later.",
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppLayout
      title="Categories"
      breadcrumbs={[{ label: "Category Management", href: "/catalog/categories" }, { label: "Categories" }]}
      showQuickLinks={false}
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            {sectionLinks.length > 0 ? (
              <SectionQuickLinks
                sectionTitle="Categories"
                links={sectionLinks}
                activePath={pathname}
                className="hidden md:flex"
              />
            ) : null}
          </div>
          <p className="text-muted-foreground">
            Build and maintain the category hierarchy powering AI product classification.
          </p>
          {/* Mobile QuickLinks fallback if needed, or keep it hidden on mobile as per design */}
          {sectionLinks.length > 0 ? (
            <div className="md:hidden pt-2">
               <SectionQuickLinks
                sectionTitle="Categories"
                links={sectionLinks}
                activePath={pathname}
                className="justify-start"
              />
            </div>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Category
            </CardTitle>
            <CardDescription>Create a new category node in the hierarchy.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="categoryName">Category Name</Label>
                <Input
                  id="categoryName"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g., Electric Guitars"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
                <Select value={parentCategory} onValueChange={setParentCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Top-level category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Top Level)</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create Category"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Categories ({categories.length})</CardTitle>
            <CardDescription>Review category coverage, depth, and outstanding reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((key) => (
                  <div key={key} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No categories found.</p>
                <p className="text-sm text-muted-foreground">Create your first category to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => {
                  const depth = category.level ?? 0
                  const pending = category.pendingReviewCount ?? 0
                  const products = category.productCount ?? 0

                  return (
                    <div
                      key={category.id}
                      className="flex flex-col gap-2 border rounded-lg p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div
                        className="flex items-start gap-3"
                        style={{ paddingLeft: depth > 0 ? Math.min(depth * 12, 48) : 0 }}
                      >
                        <GitBranch className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-muted-foreground">{category.path}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Badge variant={category.parentId ? "outline" : "default"}>
                          {category.parentId ? "Child" : "Root"}
                        </Badge>
                        <Badge variant="secondary">{products} products</Badge>
                        {pending > 0 && (
                          <Badge variant="destructive">{pending} pending review</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
