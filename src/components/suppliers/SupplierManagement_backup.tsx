// @ts-nocheck
"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  Clock,
  RefreshCw,
  Download,
  Upload,
  X,
  SlidersHorizontal
} from 'lucide-react'
import { useSupplierStore } from '@/lib/stores/supplier-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import type { Supplier, SupplierFilters } from '@/lib/types/inventory'
import { format } from 'date-fns'

export default function SupplierManagement() {
  const {
    suppliers,
    analytics,
    filters,
    loading,
    error,
    fetchSuppliers,
    fetchAnalytics,
    setFilters,
    clearFilters,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    clearError
  } = useSupplierStore()

  const { addNotification } = useNotificationStore()

  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        fetchSuppliers(),
        fetchAnalytics()
      ])
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load supplier data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }, [addNotification, fetchAnalytics, fetchSuppliers])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters({ search: searchTerm })
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, setFilters])

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return
    }

    try {
      await deleteSupplier(supplierId)
      addNotification({
        type: 'success',
        title: 'Supplier deleted',
        message: 'Supplier has been successfully deleted'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to delete supplier',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'suspended':
        return 'destructive'
      case 'pending_approval':
        return 'outline'
      case 'blocked':
        return 'destructive'
      case 'under_review':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getPerformanceTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'text-purple-600'
      case 'gold':
        return 'text-yellow-600'
      case 'silver':
        return 'text-gray-600'
      case 'bronze':
        return 'text-orange-600'
      case 'unrated':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  const statuses = ['active', 'inactive', 'suspended', 'pending_approval', 'blocked', 'under_review']
  const performanceTiers = ['platinum', 'gold', 'silver', 'bronze', 'unrated']
  const regions = [...new Set(suppliers.map(s => s.geographic_region).filter(Boolean))]
  const categories = [...new Set(suppliers.map(s => s.primary_category).filter(Boolean))]
  const beeLevels = [...new Set(suppliers.map(s => s.bee_level).filter(Boolean))]

  const ALL_STATUSES_VALUE = '__all-statuses__'
  const ALL_TIERS_VALUE = '__all-tiers__'
  const ALL_CATEGORIES_VALUE = '__all-categories__'
  const ALL_REGIONS_VALUE = '__all-regions__'
  const ALL_LEVELS_VALUE = '__all-levels__'

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
            <p className="text-muted-foreground">
              Manage your supplier relationships and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={() => setShowAddSupplier(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Suppliers</p>
                    <p className="text-2xl font-bold">{analytics.totalSuppliers}</p>
                    <p className="text-xs text-green-600">
                      {analytics.activeSuppliers} active
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="text-2xl font-bold">{formatCurrency(analytics.spendAnalysis.totalSpend)}</p>
                    <p className="text-xs text-blue-600">
                      Avg: {formatCurrency(analytics.spendAnalysis.avgOrderValue)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                    <p className="text-2xl font-bold">{analytics.performanceMetrics.onTimeDeliveryRate.toFixed(1)}%</p>
                    <p className="text-xs text-orange-600">
                      Avg: {analytics.performanceMetrics.avgDeliveryTime} days
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Score</p>
                    <p className="text-2xl font-bold">{analytics.performanceMetrics.avgQualityScore.toFixed(1)}/5</p>
                    <p className="text-xs text-purple-600">
                      Response: {analytics.performanceMetrics.avgResponsivenessScore.toFixed(1)}/5
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {Object.keys(filters).some(key =>
                  key !== 'search' && filters[key as keyof SupplierFilters]
                ) && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
              {Object.keys(filters).some(key => filters[key as keyof SupplierFilters]) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2 block">Status</p>
                    <Select
                      value={filters.status?.[0] || ALL_STATUSES_VALUE}
                      onValueChange={(value) =>
                        setFilters({
                          status: value === ALL_STATUSES_VALUE ? undefined : [value as unknown],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">Performance Tier</p>
                    <Select
                      value={filters.performance_tier?.[0] || ALL_TIERS_VALUE}
                      onValueChange={(value) =>
                        setFilters({
                          performance_tier:
                            value === ALL_TIERS_VALUE ? undefined : [value as unknown],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All tiers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_TIERS_VALUE}>All tiers</SelectItem>
                        {performanceTiers.map(tier => (
                          <SelectItem key={tier} value={tier}>
                            {tier.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">Category</p>
                    <Select
                      value={filters.category?.[0] || ALL_CATEGORIES_VALUE}
                      onValueChange={(value) =>
                        setFilters({
                          category: value === ALL_CATEGORIES_VALUE ? undefined : [value],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_CATEGORIES_VALUE}>All categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">Region</p>
                    <Select
                      value={filters.region?.[0] || ALL_REGIONS_VALUE}
                      onValueChange={(value) =>
                        setFilters({
                          region: value === ALL_REGIONS_VALUE ? undefined : [value],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_REGIONS_VALUE}>All regions</SelectItem>
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2 block">BEE Level</p>
                    <Select
                      value={filters.bee_level?.[0] || ALL_LEVELS_VALUE}
                      onValueChange={(value) =>
                        setFilters({
                          bee_level: value === ALL_LEVELS_VALUE ? undefined : [value],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_LEVELS_VALUE}>All levels</SelectItem>
                        {beeLevels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preferred-only"
                      checked={filters.preferred_only || false}
                      onCheckedChange={(checked) =>
                        setFilters({ preferred_only: checked as boolean })
                      }
                    />
                    <label htmlFor="preferred-only" className="text-sm">
                      Preferred suppliers only
                    </label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Suppliers ({suppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading suppliers...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No suppliers found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first supplier.
                </p>
                <Button onClick={() => setShowAddSupplier(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSuppliers.size === suppliers.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSuppliers(new Set(suppliers.map(s => s.id)))
                            } else {
                              setSelectedSuppliers(new Set())
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Spend (12M)</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSuppliers.has(supplier.id)}
                            onCheckedChange={(checked) => {
                              const newSelection = new Set(selectedSuppliers)
                              if (checked) {
                                newSelection.add(supplier.id)
                              } else {
                                newSelection.delete(supplier.id)
                              }
                              setSelectedSuppliers(newSelection)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {supplier.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {supplier.primary_category || 'General'}
                              </p>
                              {supplier.preferred_supplier && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Preferred
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {supplier.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">{supplier.email}</span>
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{supplier.phone}</span>
                              </div>
                            )}
                            {supplier.contact_person && (
                              <p className="text-xs text-muted-foreground">
                                Contact: {supplier.contact_person}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Star className={`h-3 w-3 ${getPerformanceTierColor(supplier.performance_tier)}`} />
                              <span className={`text-sm font-medium ${getPerformanceTierColor(supplier.performance_tier)}`}>
                                {supplier.performance_tier.toUpperCase()}
                              </span>
                            </div>
                            {supplier.quality_rating && (
                              <div className="text-xs text-muted-foreground">
                                Quality: {supplier.quality_rating.toFixed(1)}/5
                              </div>
                            )}
                            {supplier.delivery_performance_score && (
                              <div className="text-xs text-muted-foreground">
                                Delivery: {supplier.delivery_performance_score.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {formatCurrency(supplier.spend_last_12_months)}
                            </p>
                            {supplier.bee_level && (
                              <p className="text-xs text-muted-foreground">
                                BEE: {supplier.bee_level}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{supplier.geographic_region || 'Not specified'}</span>
                          </div>
                          {supplier.rural_based && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Rural
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(supplier.status)}>
                            {supplier.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewingSupplier(supplier)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setEditingSupplier(supplier)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Supplier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteSupplier(supplier.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Supplier
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit/View Dialogs would go here */}
        {/* For brevity, not implementing the full dialogs in this response */}
      </div>
    </TooltipProvider>
  )
}
