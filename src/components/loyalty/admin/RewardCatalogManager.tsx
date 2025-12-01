'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Star,
  TrendingUp,
  DollarSign,
  Gift,
  Truck,
  ArrowUpCircle,
  Percent,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { RewardCatalog, RewardType, RewardAnalytics } from '@/types/loyalty';

const rewardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  reward_type: z.enum(['points', 'discount', 'cashback', 'free_shipping', 'upgrade', 'gift']),
  points_required: z.number().min(1, 'Points required must be positive'),
  monetary_value: z.number().min(0).optional().nullable(),
  max_redemptions_per_customer: z.number().min(1).optional().nullable(),
  stock_quantity: z.number().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  valid_from: z.string().optional(),
  valid_until: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
});

type RewardFormData = z.infer<typeof rewardSchema>;

const REWARD_TYPE_ICONS: Record<RewardType, LucideIcon> = {
  points: Gift,
  discount: Percent,
  cashback: DollarSign,
  free_shipping: Truck,
  upgrade: ArrowUpCircle,
  gift: Package,
};

const REWARD_TYPE_COLORS: Record<RewardType, string> = {
  points: 'text-purple-500',
  discount: 'text-green-500',
  cashback: 'text-blue-500',
  free_shipping: 'text-orange-500',
  upgrade: 'text-pink-500',
  gift: 'text-yellow-500',
};

export default function RewardCatalogManager() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RewardType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedReward, setSelectedReward] = useState<RewardCatalog | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  // Fetch rewards
  const { data: rewards, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/loyalty/rewards');
      if (!res.ok) throw new Error('Failed to fetch rewards');
      const response = await res.json();
      // API returns paginated response { success: true, data: [...], pagination: {...} }
      return (response.data || []) as RewardCatalog[];
    },
  });

  // Fetch analytics for selected reward
  const { data: analytics } = useQuery({
    queryKey: ['reward-analytics', selectedReward?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/loyalty/rewards/${selectedReward!.id}/analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json() as Promise<RewardAnalytics>;
    },
    enabled: !!selectedReward && isAnalyticsDialogOpen,
  });

  // Form
  const form = useForm<RewardFormData>({
    resolver: zodResolver(rewardSchema),
    defaultValues: {
      name: '',
      description: '',
      reward_type: 'gift',
      points_required: 100,
      monetary_value: null,
      max_redemptions_per_customer: null,
      stock_quantity: null,
      is_active: true,
      is_featured: false,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: null,
      image_url: '',
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: RewardFormData) => {
      const res = await fetch('/api/v1/admin/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          valid_from: data.valid_from ? new Date(data.valid_from) : undefined,
          valid_until: data.valid_until ? new Date(data.valid_until) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create reward');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Reward created successfully');
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: RewardFormData & { id: string }) => {
      const { id, ...payload } = data;
      const res = await fetch(`/api/v1/admin/loyalty/rewards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          valid_from: payload.valid_from ? new Date(payload.valid_from) : undefined,
          valid_until: payload.valid_until ? new Date(payload.valid_until) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update reward');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Reward updated successfully');
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setIsEditDialogOpen(false);
      setSelectedReward(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/loyalty/rewards/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete reward');
      }
    },
    onSuccess: () => {
      toast.success('Reward deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setIsDeleteDialogOpen(false);
      setSelectedReward(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Stock update mutation
  const stockMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const res = await fetch(`/api/v1/admin/loyalty/rewards/${id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: quantity, operation: 'set' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update stock');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Stock updated successfully');
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setIsStockDialogOpen(false);
      setSelectedReward(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Filtered and paginated rewards
  const filteredRewards = useMemo(() => {
    if (!rewards) return [];

    return rewards.filter(reward => {
      const matchesSearch = reward.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || reward.reward_type === typeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && reward.is_active) ||
        (statusFilter === 'inactive' && !reward.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rewards, search, typeFilter, statusFilter]);

  const paginatedRewards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRewards.slice(start, start + pageSize);
  }, [filteredRewards, page]);

  const totalPages = Math.ceil(filteredRewards.length / pageSize);

  const handleEdit = (reward: RewardCatalog) => {
    setSelectedReward(reward);
    form.reset({
      name: reward.name,
      description: reward.description || '',
      reward_type: reward.reward_type,
      points_required: reward.points_required,
      monetary_value: reward.monetary_value,
      max_redemptions_per_customer: reward.max_redemptions_per_customer,
      stock_quantity: reward.stock_quantity,
      is_active: reward.is_active,
      is_featured: reward.is_featured,
      valid_from: reward.valid_from ? format(new Date(reward.valid_from), 'yyyy-MM-dd') : undefined,
      valid_until: reward.valid_until ? format(new Date(reward.valid_until), 'yyyy-MM-dd') : null,
      image_url: reward.image_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (reward: RewardCatalog) => {
    setSelectedReward(reward);
    setIsDeleteDialogOpen(true);
  };

  const handleStockManagement = (reward: RewardCatalog) => {
    setSelectedReward(reward);
    setIsStockDialogOpen(true);
  };

  const handleViewAnalytics = (reward: RewardCatalog) => {
    setSelectedReward(reward);
    setIsAnalyticsDialogOpen(true);
  };

  const onSubmit = (data: RewardFormData) => {
    if (selectedReward) {
      updateMutation.mutate({ ...data, id: selectedReward.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Reward Catalog</CardTitle>
            <CardDescription>Manage your loyalty rewards and redemptions</CardDescription>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Reward
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="w-full md:flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search rewards..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="w-full sm:w-auto">
                <Select
                  value={typeFilter}
                  onValueChange={value => setTypeFilter(value as RewardType | 'all')}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="cashback">Cashback</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="gift">Gift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={value => setStatusFilter(value as typeof statusFilter)}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Catalog Items</CardTitle>
            <CardDescription>Track availability and redemption activity</CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            {isLoading ? 'Loading...' : `${filteredRewards.length.toLocaleString()} rewards`}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-8">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reward</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRewards.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground py-12 text-center text-sm"
                      >
                        No rewards match your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRewards.map(reward => {
                      const Icon = REWARD_TYPE_ICONS[reward.reward_type];
                      const lowStock = reward.stock_quantity !== null && reward.stock_quantity < 10;

                      return (
                        <TableRow key={reward.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {reward.image_url && (
                                <img
                                  src={reward.image_url}
                                  alt={reward.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-2 font-medium">
                                  {reward.name}
                                  {reward.is_featured && (
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                  )}
                                </div>
                                {reward.description && (
                                  <div className="text-muted-foreground line-clamp-1 text-sm">
                                    {reward.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon
                                className={`h-4 w-4 ${REWARD_TYPE_COLORS[reward.reward_type]}`}
                              />
                              <span className="capitalize">
                                {reward.reward_type.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reward.points_required.toLocaleString()} pts
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reward.stock_quantity !== null ? (
                              <Badge variant={lowStock ? 'destructive' : 'secondary'}>
                                {reward.stock_quantity}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Unlimited</span>
                            )}
                          </TableCell>
                          <TableCell>{reward.redemption_count.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={reward.is_active ? 'default' : 'secondary'}>
                              {reward.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(reward)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {reward.stock_quantity !== null && (
                                  <DropdownMenuItem onClick={() => handleStockManagement(reward)}>
                                    <Package className="mr-2 h-4 w-4" />
                                    Manage Stock
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleViewAnalytics(reward)}>
                                  <TrendingUp className="mr-2 h-4 w-4" />
                                  View Analytics
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(reward)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <div className="text-muted-foreground text-sm">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, filteredRewards.length)} of {filteredRewards.length}{' '}
                    rewards
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedReward(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReward ? 'Edit Reward' : 'Create Reward'}</DialogTitle>
            <DialogDescription>
              {selectedReward ? 'Update reward details' : 'Add a new reward to your catalog'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., $10 Gift Card" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Reward description..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reward_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="cashback">Cashback</SelectItem>
                          <SelectItem value="free_shipping">Free Shipping</SelectItem>
                          <SelectItem value="upgrade">Upgrade</SelectItem>
                          <SelectItem value="gift">Gift</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="points_required"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Required *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monetary_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monetary Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Optional"
                          {...field}
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          {...field}
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="max_redemptions_per_customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Redemptions Per Customer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        {...field}
                        value={field.value || ''}
                        onChange={e =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid From</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Featured</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedReward(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedReward?.name}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedReward && deleteMutation.mutate(selectedReward.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Management Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Stock</DialogTitle>
            <DialogDescription>
              Update stock quantity for &ldquo;{selectedReward?.name}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Stock</Label>
              <div className="text-2xl font-bold">{selectedReward?.stock_quantity || 0}</div>
            </div>
            <div>
              <Label htmlFor="new-stock">New Stock Quantity</Label>
              <Input
                id="new-stock"
                type="number"
                min="0"
                defaultValue={selectedReward?.stock_quantity || 0}
                onKeyDown={e => {
                  if (e.key !== 'Enter' || !selectedReward) {
                    return;
                  }
                  const input = e.target as HTMLInputElement;
                  stockMutation.mutate({
                    id: selectedReward.id,
                    quantity: parseInt(input.value, 10),
                  });
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const input = document.getElementById('new-stock') as HTMLInputElement | null;
                if (!input || !selectedReward) {
                  return;
                }
                stockMutation.mutate({
                  id: selectedReward.id,
                  quantity: parseInt(input.value, 10),
                });
              }}
              disabled={stockMutation.isPending}
            >
              {stockMutation.isPending ? 'Updating...' : 'Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={isAnalyticsDialogOpen} onOpenChange={setIsAnalyticsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reward Analytics</DialogTitle>
            <DialogDescription>{selectedReward?.name}</DialogDescription>
          </DialogHeader>
          {analytics ? (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.total_redemptions.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.unique_customers.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Points Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.total_points_spent.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Avg Fulfillment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.avg_fulfillment_hours?.toFixed(1) || 'N/A'}
                    {analytics.avg_fulfillment_hours && 'h'}
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fulfilled:</span>
                    <span className="font-medium">{analytics.fulfilled_redemptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="font-medium">{analytics.pending_redemptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancelled:</span>
                    <span className="font-medium">{analytics.cancelled_redemptions}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
