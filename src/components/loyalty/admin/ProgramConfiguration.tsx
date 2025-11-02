"use client"

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Trophy,
  Settings,
  Gift,
  Calendar,
  Eye,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  LoyaltyProgram,
  LoyaltyProgramInsert,
  TierThresholds,
  TierBenefits,
  LoyaltyTier
} from '@/types/loyalty'

// Form schema
const programSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(100),
  description: z.string().optional(),
  earn_rate: z.number().min(0.01, 'Earn rate must be positive').max(100),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  points_expiry_days: z.number().min(0).optional().nullable(),
  tier_thresholds: z.object({
    bronze: z.number().min(0),
    silver: z.number().min(0),
    gold: z.number().min(0),
    platinum: z.number().min(0),
    diamond: z.number().min(0),
  }),
  tier_benefits: z.object({
    bronze: z.object({
      multiplier: z.number().min(1),
      discount: z.number().min(0).max(100).optional(),
      free_shipping: z.boolean().optional(),
      priority_support: z.boolean().optional(),
      dedicated_rep: z.boolean().optional(),
    }),
    silver: z.object({
      multiplier: z.number().min(1),
      discount: z.number().min(0).max(100).optional(),
      free_shipping: z.boolean().optional(),
      priority_support: z.boolean().optional(),
      dedicated_rep: z.boolean().optional(),
    }),
    gold: z.object({
      multiplier: z.number().min(1),
      discount: z.number().min(0).max(100).optional(),
      free_shipping: z.boolean().optional(),
      priority_support: z.boolean().optional(),
      dedicated_rep: z.boolean().optional(),
    }),
    platinum: z.object({
      multiplier: z.number().min(1),
      discount: z.number().min(0).max(100).optional(),
      free_shipping: z.boolean().optional(),
      priority_support: z.boolean().optional(),
      dedicated_rep: z.boolean().optional(),
    }),
    diamond: z.object({
      multiplier: z.number().min(1),
      discount: z.number().min(0).max(100).optional(),
      free_shipping: z.boolean().optional(),
      priority_support: z.boolean().optional(),
      dedicated_rep: z.boolean().optional(),
    }),
  }),
})

type ProgramFormData = z.infer<typeof programSchema>

interface ProgramConfigurationProps {
  programId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Settings },
  { id: 2, name: 'Tier Thresholds', icon: Trophy },
  { id: 3, name: 'Tier Benefits', icon: Gift },
  { id: 4, name: 'Points Expiry', icon: Calendar },
  { id: 5, name: 'Review', icon: Eye },
]

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-blue-400',
  diamond: 'bg-purple-500',
}

export default function ProgramConfiguration({
  programId,
  onSuccess,
  onCancel,
}: ProgramConfigurationProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const queryClient = useQueryClient()

  // Fetch existing program if editing
  const { data: program, isLoading } = useQuery({
    queryKey: ['loyalty-program', programId],
    queryFn: async () => {
      if (!programId) return null
      const res = await fetch(`/api/v1/admin/loyalty/programs/${programId}`)
      if (!res.ok) throw new Error('Failed to fetch program')
      return res.json() as Promise<LoyaltyProgram>
    },
    enabled: !!programId,
  })

  // Default values
  const defaultValues: Partial<ProgramFormData> = {
    name: '',
    description: '',
    earn_rate: 1,
    is_active: true,
    is_default: false,
    points_expiry_days: 365,
    tier_thresholds: {
      bronze: 0,
      silver: 1000,
      gold: 5000,
      platinum: 15000,
      diamond: 50000,
    },
    tier_benefits: {
      bronze: { multiplier: 1.0, discount: 0, free_shipping: false, priority_support: false, dedicated_rep: false },
      silver: { multiplier: 1.2, discount: 5, free_shipping: false, priority_support: false, dedicated_rep: false },
      gold: { multiplier: 1.5, discount: 10, free_shipping: true, priority_support: false, dedicated_rep: false },
      platinum: { multiplier: 2.0, discount: 15, free_shipping: true, priority_support: true, dedicated_rep: false },
      diamond: { multiplier: 2.5, discount: 20, free_shipping: true, priority_support: true, dedicated_rep: true },
    },
  }

  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues,
  })

  // Update form when program data loads
  useEffect(() => {
    if (program) {
      form.reset({
        name: program.name,
        description: program.description || '',
        earn_rate: program.earn_rate,
        is_active: program.is_active,
        is_default: program.is_default,
        points_expiry_days: program.points_expiry_days || null,
        tier_thresholds: program.tier_thresholds,
        tier_benefits: program.tier_benefits,
      })
    }
  }, [program, form])

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      const url = programId
        ? `/api/v1/admin/loyalty/programs/${programId}`
        : '/api/v1/admin/loyalty/programs'

      const res = await fetch(url, {
        method: programId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save program')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success(programId ? 'Program updated successfully' : 'Program created successfully')
      queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] })
      queryClient.invalidateQueries({ queryKey: ['loyalty-program', programId] })
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (data: ProgramFormData) => {
    mutation.mutate(data)
  }

  const nextStep = async () => {
    const fields = getStepFields(currentStep)
    const isValid = await form.trigger(fields as any)
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 1: return ['name', 'description', 'earn_rate', 'is_active', 'is_default']
      case 2: return ['tier_thresholds']
      case 3: return ['tier_benefits']
      case 4: return ['points_expiry_days']
      case 5: return []
      default: return []
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/25 bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.name}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Configure basic program information'}
                {currentStep === 2 && 'Set points thresholds for each tier'}
                {currentStep === 3 && 'Define benefits for each tier level'}
                {currentStep === 4 && 'Configure points expiration settings'}
                {currentStep === 5 && 'Review and save your loyalty program'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., VIP Rewards Program" {...field} />
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
                            placeholder="Describe your loyalty program..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="earn_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Earn Rate (points per $1) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1.0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          How many points customers earn per dollar spent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Active</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Default Program</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Tier Thresholds */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as LoyaltyTier[]).map((tier) => (
                    <FormField
                      key={tier}
                      control={form.control}
                      name={`tier_thresholds.${tier}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${TIER_COLORS[tier]}`} />
                            <span className="capitalize">{tier} Tier</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Points threshold"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum points required to reach this tier
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Step 3: Tier Benefits */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as LoyaltyTier[]).map((tier) => (
                    <Card key={tier}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <div className={`w-4 h-4 rounded-full ${TIER_COLORS[tier]}`} />
                          <span className="capitalize">{tier} Benefits</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <FormField
                          control={form.control}
                          name={`tier_benefits.${tier}.multiplier`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Points Multiplier</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`tier_benefits.${tier}.discount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount %</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`tier_benefits.${tier}.free_shipping`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Free Shipping</FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`tier_benefits.${tier}.priority_support`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Priority Support</FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`tier_benefits.${tier}.dedicated_rep`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Dedicated Rep</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Step 4: Points Expiry */}
              {currentStep === 4 && (
                <FormField
                  control={form.control}
                  name="points_expiry_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Expiry (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="365"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days before points expire. Leave empty for no expiration.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Review your program configuration before saving. You can edit it later if needed.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Basic Information</h3>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <dt className="text-muted-foreground">Name:</dt>
                        <dd className="font-medium">{form.watch('name')}</dd>
                        <dt className="text-muted-foreground">Earn Rate:</dt>
                        <dd className="font-medium">{form.watch('earn_rate')} pts/$1</dd>
                        <dt className="text-muted-foreground">Status:</dt>
                        <dd>
                          <Badge variant={form.watch('is_active') ? 'default' : 'secondary'}>
                            {form.watch('is_active') ? 'Active' : 'Inactive'}
                          </Badge>
                        </dd>
                        <dt className="text-muted-foreground">Points Expiry:</dt>
                        <dd className="font-medium">
                          {form.watch('points_expiry_days') || 'Never'}
                          {form.watch('points_expiry_days') && ' days'}
                        </dd>
                      </dl>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Tier Configuration</h3>
                      <div className="space-y-2">
                        {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as LoyaltyTier[]).map((tier) => {
                          const threshold = form.watch(`tier_thresholds.${tier}`)
                          const benefits = form.watch(`tier_benefits.${tier}`)
                          return (
                            <div key={tier} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${TIER_COLORS[tier]}`} />
                                <span className="font-medium capitalize">{tier}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({threshold.toLocaleString()} pts)
                                </span>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <Badge variant="outline">{benefits.multiplier}x</Badge>
                                {benefits.discount && <Badge variant="outline">{benefits.discount}% off</Badge>}
                                {benefits.free_shipping && <Badge variant="outline">Free Ship</Badge>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {onCancel && (
                  <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                )}

                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={mutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {mutation.isPending ? 'Saving...' : programId ? 'Update Program' : 'Create Program'}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}
