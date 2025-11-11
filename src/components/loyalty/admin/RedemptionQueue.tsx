"use client"

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { RewardRedemption, RedemptionStatus } from '@/types/loyalty'
import { Label } from '@/components/ui/label'

const STATUS_COLORS: Record<RedemptionStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-blue-500',
  fulfilled: 'bg-green-500',
  cancelled: 'bg-red-500',
  expired: 'bg-gray-500',
}

const STATUS_LABELS: Record<RedemptionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

interface RedemptionWithDetails extends RewardRedemption {
  customer_name?: string
  customer_email?: string
  reward_name?: string
}

export default function RedemptionQueue() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | 'all'>('all')
  const [selectedRedemptions, setSelectedRedemptions] = useState<Set<string>>(new Set())
  const [selectedRedemption, setSelectedRedemption] = useState<RedemptionWithDetails | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isFulfillDialogOpen, setIsFulfillDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [fulfillmentNotes, setFulfillmentNotes] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const queryClient = useQueryClient()

  // Fetch redemptions
  const { data: redemptions, isLoading } = useQuery({
    queryKey: ['redemptions'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/loyalty/redemptions')
      if (!res.ok) throw new Error('Failed to fetch redemptions')
      return res.json() as Promise<RedemptionWithDetails[]>
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/v1/admin/loyalty/redemptions/bulk/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemption_ids: ids }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to approve redemptions')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Redemptions approved successfully')
      queryClient.invalidateQueries({ queryKey: ['redemptions'] })
      setSelectedRedemptions(new Set())
      setIsApproveDialogOpen(false)
      setSelectedRedemption(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Fulfill mutation
  const fulfillMutation = useMutation({
    mutationFn: async ({ ids, notes }: { ids: string[]; notes: string }) => {
      const res = await fetch('/api/v1/admin/loyalty/redemptions/bulk/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemption_ids: ids,
          fulfillment_notes: notes,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fulfill redemptions')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Redemptions fulfilled successfully')
      queryClient.invalidateQueries({ queryKey: ['redemptions'] })
      setSelectedRedemptions(new Set())
      setIsFulfillDialogOpen(false)
      setSelectedRedemption(null)
      setFulfillmentNotes('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const res = await fetch('/api/v1/admin/loyalty/redemptions/bulk/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemption_ids: ids,
          cancel_reason: reason,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to cancel redemptions')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Redemptions cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['redemptions'] })
      setSelectedRedemptions(new Set())
      setIsCancelDialogOpen(false)
      setSelectedRedemption(null)
      setCancelReason('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Filtered and paginated redemptions
  const filteredRedemptions = useMemo(() => {
    if (!redemptions) return []

    return redemptions.filter((redemption) => {
      const matchesSearch =
        redemption.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        redemption.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
        redemption.reward_name?.toLowerCase().includes(search.toLowerCase()) ||
        redemption.redemption_code.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || redemption.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [redemptions, search, statusFilter])

  const paginatedRedemptions = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRedemptions.slice(start, start + pageSize)
  }, [filteredRedemptions, page])

  const totalPages = Math.ceil(filteredRedemptions.length / pageSize)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRedemptions(new Set(paginatedRedemptions.map((r) => r.id)))
    } else {
      setSelectedRedemptions(new Set())
    }
  }

  const handleSelectRedemption = (id: string, checked: boolean) => {
    const newSet = new Set(selectedRedemptions)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedRedemptions(newSet)
  }

  const handleApprove = (redemption?: RedemptionWithDetails) => {
    if (redemption) {
      setSelectedRedemption(redemption)
      setSelectedRedemptions(new Set([redemption.id]))
    }
    setIsApproveDialogOpen(true)
  }

  const handleFulfill = (redemption?: RedemptionWithDetails) => {
    if (redemption) {
      setSelectedRedemption(redemption)
      setSelectedRedemptions(new Set([redemption.id]))
    }
    setIsFulfillDialogOpen(true)
  }

  const handleCancel = (redemption?: RedemptionWithDetails) => {
    if (redemption) {
      setSelectedRedemption(redemption)
      setSelectedRedemptions(new Set([redemption.id]))
    }
    setIsCancelDialogOpen(true)
  }

  const stats = useMemo(() => {
    if (!redemptions) return { pending: 0, approved: 0, fulfilled: 0 }
    return {
      pending: redemptions.filter((r) => r.status === 'pending').length,
      approved: redemptions.filter((r) => r.status === 'approved').length,
      fulfilled: redemptions.filter((r) => r.status === 'fulfilled').length,
    }
  }, [redemptions])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Redemption Queue</h2>
          <p className="text-muted-foreground">Manage reward redemptions and fulfillment</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fulfilled</p>
                <p className="text-2xl font-bold">{stats.fulfilled}</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, reward, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as unknown)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRedemptions.size > 0 && (
              <div className="flex gap-2">
                <Badge variant="secondary">{selectedRedemptions.size} selected</Badge>
                <Button size="sm" variant="outline" onClick={() => handleApprove()}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleFulfill()}>
                  <Package className="w-4 h-4 mr-2" />
                  Fulfill
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCancel()}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          paginatedRedemptions.length > 0 &&
                          paginatedRedemptions.every((r) => selectedRedemptions.has(r.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRedemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No redemptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRedemptions.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRedemptions.has(redemption.id)}
                            onCheckedChange={(checked) =>
                              handleSelectRedemption(redemption.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-2 text-left hover:underline">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{redemption.customer_name || 'Unknown'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {redemption.customer_email || 'N/A'}
                                  </div>
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-semibold">Customer Details</h4>
                                <div className="grid gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span className="font-medium">{redemption.customer_name || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium">{redemption.customer_email || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer ID:</span>
                                    <span className="font-mono text-xs">{redemption.customer_id}</span>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{redemption.reward_name || 'Unknown Reward'}</div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {redemption.redemption_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{redemption.points_spent.toLocaleString()} pts</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[redemption.status]}`} />
                            <span className="capitalize">{STATUS_LABELS[redemption.status]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(redemption.redeemed_at), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(redemption.redeemed_at), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="end">
                              <div className="flex flex-col gap-1">
                                {redemption.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start"
                                    onClick={() => handleApprove(redemption)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                )}
                                {redemption.status === 'approved' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start"
                                    onClick={() => handleFulfill(redemption)}
                                  >
                                    <Package className="w-4 h-4 mr-2" />
                                    Fulfill
                                  </Button>
                                )}
                                {(redemption.status === 'pending' || redemption.status === 'approved') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start text-destructive"
                                    onClick={() => handleCancel(redemption)}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancel
                                  </Button>
                                )}
                                {redemption.fulfillment_notes && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="justify-start">
                                        <FileText className="w-4 h-4 mr-2" />
                                        View Notes
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">Fulfillment Notes</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {redemption.fulfillment_notes}
                                        </p>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRedemptions.length)}{' '}
                    of {filteredRedemptions.length} redemptions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Redemptions</DialogTitle>
            <DialogDescription>
              Approve {selectedRedemptions.size} redemption{selectedRedemptions.size > 1 ? 's' : ''}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate(Array.from(selectedRedemptions))}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfill Dialog */}
      <Dialog open={isFulfillDialogOpen} onOpenChange={setIsFulfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Redemptions</DialogTitle>
            <DialogDescription>
              Mark {selectedRedemptions.size} redemption{selectedRedemptions.size > 1 ? 's' : ''} as fulfilled
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fulfillment-notes">Fulfillment Notes</Label>
              <Textarea
                id="fulfillment-notes"
                placeholder="Add any fulfillment notes..."
                rows={3}
                value={fulfillmentNotes}
                onChange={(e) => setFulfillmentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFulfillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                fulfillMutation.mutate({
                  ids: Array.from(selectedRedemptions),
                  notes: fulfillmentNotes,
                })
              }
              disabled={fulfillMutation.isPending}
            >
              {fulfillMutation.isPending ? 'Fulfilling...' : 'Fulfill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Redemptions</DialogTitle>
            <DialogDescription>
              Cancel {selectedRedemptions.size} redemption{selectedRedemptions.size > 1 ? 's' : ''}?
              Points will be refunded to customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Explain why this redemption is being cancelled..."
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                cancelMutation.mutate({
                  ids: Array.from(selectedRedemptions),
                  reason: cancelReason,
                })
              }
              disabled={cancelMutation.isPending || !cancelReason}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Redemptions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
