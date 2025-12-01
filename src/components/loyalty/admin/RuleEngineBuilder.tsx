'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Plus,
  GripVertical,
  Trash2,
  Edit,
  Play,
  Zap,
  Filter,
  Gift,
  Trophy,
  Calendar,
  Users,
  ShoppingCart,
  Star,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { LoyaltyRule, RuleTriggerType } from '@/types/loyalty';

const ruleSchema = z.object({
  program_id: z.string().min(1, 'Program is required'),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  trigger_type: z.enum([
    'order_placed',
    'referral',
    'review',
    'birthday',
    'anniversary',
    'signup',
    'social_share',
  ]),
  points_multiplier: z.number().min(1).max(10),
  bonus_points: z.number().min(0),
  is_active: z.boolean().default(true),
  priority: z.number().min(0),
  valid_from: z.string().optional(),
  valid_until: z.string().optional().nullable(),
  conditions: z
    .object({
      min_order_amount: z.number().min(0).optional().nullable(),
      max_order_amount: z.number().min(0).optional().nullable(),
      product_categories: z.array(z.string()).optional(),
      customer_tier: z
        .array(z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']))
        .optional(),
      order_count_min: z.number().min(0).optional().nullable(),
      order_count_max: z.number().min(0).optional().nullable(),
    })
    .optional(),
});

type RuleFormData = z.infer<typeof ruleSchema>;

const TRIGGER_ICONS: Record<RuleTriggerType, unknown> = {
  order_placed: ShoppingCart,
  referral: Users,
  review: Star,
  birthday: Gift,
  anniversary: Trophy,
  signup: Zap,
  social_share: Share2,
};

const TRIGGER_LABELS: Record<RuleTriggerType, string> = {
  order_placed: 'Order Placed',
  referral: 'Referral',
  review: 'Product Review',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  signup: 'Sign Up',
  social_share: 'Social Share',
};

export default function RuleEngineBuilder() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<LoyaltyRule | null>(null);
  const [testOrderAmount, setTestOrderAmount] = useState(100);
  const [testResult, setTestResult] = useState<unknown>(null);

  const queryClient = useQueryClient();

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['loyalty-programs'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/loyalty/programs');
      if (!res.ok) throw new Error('Failed to fetch programs');
      return res.json();
    },
  });

  // Fetch rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['loyalty-rules'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/loyalty/rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      return data.sort((a: LoyaltyRule, b: LoyaltyRule) => a.priority - b.priority);
    },
  });

  // Form
  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      program_id: '',
      name: '',
      description: '',
      trigger_type: 'order_placed',
      points_multiplier: 1,
      bonus_points: 0,
      is_active: true,
      priority: 0,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: null,
      conditions: {
        min_order_amount: null,
        max_order_amount: null,
        product_categories: [],
        customer_tier: [],
        order_count_min: null,
        order_count_max: null,
      },
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      const res = await fetch('/api/v1/admin/loyalty/rules', {
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
        throw new Error(error.error || 'Failed to create rule');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Rule created successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty-rules'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: RuleFormData & { id: string }) => {
      const { id, ...payload } = data;
      const res = await fetch(`/api/v1/admin/loyalty/rules/${id}`, {
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
        throw new Error(error.error || 'Failed to update rule');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Rule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty-rules'] });
      setIsEditDialogOpen(false);
      setSelectedRule(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/loyalty/rules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete rule');
      }
    },
    onSuccess: () => {
      toast.success('Rule deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty-rules'] });
      setIsDeleteDialogOpen(false);
      setSelectedRule(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/v1/admin/loyalty/rules/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to toggle rule');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rules'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Test rule mutation
  const testMutation = useMutation({
    mutationFn: async ({ id, orderAmount }: { id: string; orderAmount: number }) => {
      const res = await fetch(`/api/v1/admin/loyalty/rules/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_amount: orderAmount }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to test rule');
      }
      return res.json();
    },
    onSuccess: data => {
      setTestResult(data);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (rule: LoyaltyRule) => {
    setSelectedRule(rule);
    form.reset({
      program_id: rule.program_id,
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      points_multiplier: rule.points_multiplier,
      bonus_points: rule.bonus_points,
      is_active: rule.is_active,
      priority: rule.priority,
      valid_from: rule.valid_from ? format(new Date(rule.valid_from), 'yyyy-MM-dd') : undefined,
      valid_until: rule.valid_until ? format(new Date(rule.valid_until), 'yyyy-MM-dd') : null,
      conditions: rule.conditions || {},
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (rule: LoyaltyRule) => {
    setSelectedRule(rule);
    setIsDeleteDialogOpen(true);
  };

  const handleTest = (rule: LoyaltyRule) => {
    setSelectedRule(rule);
    setTestResult(null);
    setIsTestDialogOpen(true);
  };

  const onSubmit = (data: RuleFormData) => {
    if (selectedRule) {
      updateMutation.mutate({ ...data, id: selectedRule.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rule Engine</h2>
          <p className="text-muted-foreground">Configure loyalty earning rules and conditions</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : !rules || rules.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-12 text-center">
              No rules configured. Create your first rule to get started.
            </CardContent>
          </Card>
        ) : (
          rules.map((rule: LoyaltyRule, index) => {
            const Icon = TRIGGER_ICONS[rule.trigger_type];
            const conditions = rule.conditions || {};
            const hasConditions =
              conditions.min_order_amount ||
              conditions.max_order_amount ||
              (conditions.customer_tier && conditions.customer_tier.length > 0) ||
              conditions.order_count_min;

            return (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="text-muted-foreground flex items-center gap-2">
                      <GripVertical className="h-5 w-5" />
                      <Badge variant="outline">{index + 1}</Badge>
                    </div>

                    {/* Icon */}
                    <div
                      className={`rounded-lg p-3 ${rule.is_active ? 'bg-primary/10' : 'bg-muted'}`}
                    >
                      <Icon
                        className={`h-6 w-6 ${rule.is_active ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <p className="text-muted-foreground text-sm">
                            {TRIGGER_LABELS[rule.trigger_type]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={checked =>
                              toggleActiveMutation.mutate({ id: rule.id, is_active: checked })
                            }
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleTest(rule)}>
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(rule)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {rule.description && (
                        <p className="text-muted-foreground text-sm">{rule.description}</p>
                      )}

                      {/* Points Info */}
                      <div className="flex gap-4">
                        {rule.points_multiplier > 1 && (
                          <Badge variant="secondary">{rule.points_multiplier}x multiplier</Badge>
                        )}
                        {rule.bonus_points > 0 && (
                          <Badge variant="secondary">+{rule.bonus_points} bonus points</Badge>
                        )}
                      </div>

                      {/* Conditions */}
                      {hasConditions && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <span className="text-muted-foreground text-xs">Conditions:</span>
                          {conditions.min_order_amount && (
                            <Badge variant="outline" className="text-xs">
                              Min: ${conditions.min_order_amount}
                            </Badge>
                          )}
                          {conditions.max_order_amount && (
                            <Badge variant="outline" className="text-xs">
                              Max: ${conditions.max_order_amount}
                            </Badge>
                          )}
                          {conditions.customer_tier && conditions.customer_tier.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Tiers: {conditions.customer_tier.join(', ')}
                            </Badge>
                          )}
                          {conditions.order_count_min && (
                            <Badge variant="outline" className="text-xs">
                              Min Orders: {conditions.order_count_min}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Validity */}
                      {(rule.valid_from || rule.valid_until) && (
                        <div className="text-muted-foreground flex items-center gap-2 pt-2 text-xs">
                          <Calendar className="h-4 w-4" />
                          {rule.valid_from && (
                            <span>From {format(new Date(rule.valid_from), 'MMM dd, yyyy')}</span>
                          )}
                          {rule.valid_until && (
                            <span>to {format(new Date(rule.valid_until), 'MMM dd, yyyy')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedRule(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
            <DialogDescription>
              Configure earning rules and conditions for your loyalty program
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs?.map((program: unknown) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Double Points on Orders Over $100" {...field} />
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
                      <Textarea
                        placeholder="Describe when this rule applies..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trigger_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="points_multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Multiplier *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>e.g., 2.0 = double points</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bonus_points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Points</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Fixed bonus added</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Lower = higher priority</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Filter className="h-4 w-4" />
                  Conditions (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conditions.min_order_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Order Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
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
                    name="conditions.max_order_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Order Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Unlimited"
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
                    name="conditions.order_count_min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Order Count</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
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
                    name="conditions.order_count_max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Order Count</FormLabel>
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
              </div>

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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedRule(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Rule'}
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
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedRule?.name}&rdquo;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRule && deleteMutation.mutate(selectedRule.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Rule</DialogTitle>
            <DialogDescription>
              Test &ldquo;{selectedRule?.name}&rdquo; with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-amount">Order Amount ($)</Label>
              <Input
                id="test-amount"
                type="number"
                step="0.01"
                value={testOrderAmount}
                onChange={e => setTestOrderAmount(parseFloat(e.target.value))}
              />
            </div>

            {testResult && (
              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-sm">Test Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Points:</span>
                    <span className="font-medium">{testResult.base_points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Multiplier:</span>
                    <span className="font-medium">{testResult.multiplier}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonus Points:</span>
                    <span className="font-medium">+{testResult.bonus_points}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total Points:</span>
                    <span>{testResult.total_points}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                selectedRule &&
                testMutation.mutate({ id: selectedRule.id, orderAmount: testOrderAmount })
              }
              disabled={testMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {testMutation.isPending ? 'Testing...' : 'Run Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
