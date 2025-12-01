'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const subscriptionFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  cardNumber: z
    .string()
    .min(15, 'Card number must be at least 15 digits')
    .max(19, 'Card number must be at most 19 digits')
    .regex(/^[0-9\s]+$/, 'Card number can only contain numbers'),
  expiryDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, 'Expiry date must be in MM/YY format'),
  cvc: z
    .string()
    .min(3, 'CVC must be 3 digits')
    .max(4, 'CVC must be 3-4 digits')
    .regex(/^[0-9]+$/, 'CVC can only contain numbers'),
  plan: z.enum(['starter', 'pro']),
  notes: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter Plan',
    description: 'Perfect for small businesses',
    price: 'R299',
    period: 'per month',
    features: ['Up to 10 users', 'Basic features', 'Email support'],
  },
  {
    id: 'pro' as const,
    name: 'Pro Plan',
    description: 'More features and storage',
    price: 'R599',
    period: 'per month',
    features: ['Unlimited users', 'All features', 'Priority support', 'Advanced analytics'],
  },
];

interface SubscriptionUpgradeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function SubscriptionUpgradeForm({
  onSuccess,
  onCancel,
  className,
}: SubscriptionUpgradeFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: '',
      email: '',
      cardNumber: '',
      expiryDate: '',
      cvc: '',
      plan: 'starter',
      notes: '',
    },
  });

  const selectedPlan = plans.find(p => p.id === form.watch('plan'));

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const onSubmit = async (data: SubscriptionFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, this would call your payment API
      console.log('Subscription data:', data);

      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className={cn('border-border rounded-xl border shadow-sm', className)}>
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-success/10 rounded-full p-4">
              <CheckCircle2 className="text-success h-12 w-12" />
            </div>
          </div>
          <CardTitle className="text-success text-2xl font-bold">Subscription Upgraded!</CardTitle>
          <CardDescription>
            Your subscription has been successfully upgraded. You now have access to all{' '}
            {selectedPlan?.name} features.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border rounded-xl border shadow-sm', className)}>
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <CreditCard className="text-primary h-6 w-6" />
          Upgrade Subscription
        </CardTitle>
        <CardDescription className="text-sm">
          Choose a plan and enter your payment details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        {error && (
          <Alert variant="destructive" className="rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Smith"
                          className="bg-input border-border h-11 rounded-lg"
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          className="bg-input border-border h-11 rounded-lg"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Information</h3>
              <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Card Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        className="bg-input border-border h-11 rounded-lg"
                        autoComplete="cc-number"
                        maxLength={19}
                        {...field}
                        onChange={e => {
                          const formatted = formatCardNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Expiry Date</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MM/YY"
                          className="bg-input border-border h-11 rounded-lg"
                          autoComplete="cc-exp"
                          maxLength={5}
                          {...field}
                          onChange={e => {
                            const formatted = formatExpiryDate(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cvc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">CVC</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          className="bg-input border-border h-11 rounded-lg"
                          autoComplete="cc-csc"
                          maxLength={4}
                          type="text"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Plan Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Plan</h3>
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-3"
                      >
                        {plans.map(plan => (
                          <div
                            key={plan.id}
                            className={cn(
                              'relative flex items-start space-x-3 rounded-lg border p-4 transition-all',
                              field.value === plan.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-card hover:bg-accent/50'
                            )}
                          >
                            <RadioGroupItem
                              value={plan.id}
                              id={plan.id}
                              className="mt-1"
                              aria-label={`Select ${plan.name}`}
                            />
                            <div className="flex-1 space-y-1">
                              <Label
                                htmlFor={plan.id}
                                className="cursor-pointer text-sm font-semibold"
                              >
                                {plan.name}
                              </Label>
                              <p className="text-muted-foreground text-xs">{plan.description}</p>
                              <div className="flex items-baseline gap-1 pt-1">
                                <span className="text-lg font-bold">{plan.price}</span>
                                <span className="text-muted-foreground text-xs">{plan.period}</span>
                              </div>
                              <ul className="text-muted-foreground space-y-1 pt-2 text-xs">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <CheckCircle2 className="text-primary h-3 w-3" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requests or questions?"
                      className="bg-input border-border min-h-[100px] resize-none rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Let us know if you have any questions or special requirements
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="h-11 rounded-lg sm:flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-lg font-medium sm:flex-1"
              >
                {isLoading ? (
                  'Processing...'
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Upgrade to {selectedPlan?.name}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="px-6 pb-6 text-center">
        <p className="text-muted-foreground w-full text-xs">
          Your payment is secure and encrypted. You can cancel your subscription at any time.
        </p>
      </CardFooter>
    </Card>
  );
}
