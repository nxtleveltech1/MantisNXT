'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Download,
  Eye,
  Plus,
  Crown,
  Shield,
  Users,
  CheckCircle,
  Clock,
  Receipt,
  Send,
} from 'lucide-react';

interface BillingPlan {
  id: string;
  name: string;
  tier: 'starter' | 'professional' | 'enterprise';
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  storage: number;
  apiCalls: number;
  support: string;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  description: string;
  downloadUrl?: string;
}

interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export default function BillingPage() {
  const [plans] = useState<BillingPlan[]>([
    {
      id: 'starter',
      name: 'Starter',
      tier: 'starter',
      price: 99,
      interval: 'monthly',
      features: ['Basic Analytics', 'Email Support', 'Standard Integrations'],
      maxUsers: 25,
      storage: 10,
      apiCalls: 10000,
      support: 'Email',
    },
    {
      id: 'professional',
      name: 'Professional',
      tier: 'professional',
      price: 449,
      interval: 'monthly',
      features: ['Advanced Analytics', 'Priority Support', 'API Access', 'Custom Workflows'],
      maxUsers: 100,
      storage: 50,
      apiCalls: 50000,
      support: 'Email & Phone',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tier: 'enterprise',
      price: 2499,
      interval: 'monthly',
      features: [
        'All Features',
        '24/7 Support',
        'Custom Integrations',
        'White Label',
        'Dedicated Support',
      ],
      maxUsers: 500,
      storage: 100,
      apiCalls: 250000,
      support: '24/7 Dedicated',
    },
  ]);

  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-2023-001',
      date: '2023-12-01',
      dueDate: '2023-12-31',
      amount: 2499,
      status: 'paid',
      description: 'Enterprise Plan - December 2023',
      downloadUrl: '/invoices/inv-2023-001.pdf',
    },
    {
      id: '2',
      number: 'INV-2023-002',
      date: '2023-11-01',
      dueDate: '2023-11-30',
      amount: 2499,
      status: 'paid',
      description: 'Enterprise Plan - November 2023',
      downloadUrl: '/invoices/inv-2023-002.pdf',
    },
    {
      id: '3',
      number: 'INV-2023-003',
      date: '2023-10-01',
      dueDate: '2023-10-31',
      amount: 2499,
      status: 'paid',
      description: 'Enterprise Plan - October 2023',
      downloadUrl: '/invoices/inv-2023-003.pdf',
    },
    {
      id: '4',
      number: 'INV-2024-001',
      date: '2024-01-01',
      dueDate: '2024-01-31',
      amount: 2499,
      status: 'pending',
      description: 'Enterprise Plan - January 2024',
    },
  ]);

  const [subscription] = useState<Subscription>({
    id: 'sub_123',
    organizationId: 'org_1',
    planId: 'enterprise',
    status: 'active',
    currentPeriodStart: '2023-12-01',
    currentPeriodEnd: '2024-01-01',
    cancelAtPeriodEnd: false,
  });

  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const currentPlan = plans.find(plan => plan.id === subscription.planId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
      case 'past_due':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Crown className="h-5 w-5" />;
      case 'professional':
        return <Shield className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const calculateNextBilling = () => {
    const currentEnd = new Date(subscription.currentPeriodEnd);
    return currentEnd.toLocaleDateString();
  };

  const downloadInvoice = (invoiceId: string) => {
    // Simulate download
    console.log(`Downloading invoice ${invoiceId}`);
  };

  const sendInvoiceEmail = (invoiceId: string) => {
    // Simulate email sending
    console.log(`Sending invoice ${invoiceId} via email`);
  };

  const changePlan = (newPlanId: string) => {
    setSelectedPlan(newPlanId);
    // Handle plan change logic here
    setIsChangePlanDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage subscriptions, billing, and invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Invoices
          </Button>
          <Dialog open={isChangePlanDialogOpen} onOpenChange={setIsChangePlanDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Change Subscription Plan</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {plans.map(plan => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-colors ${
                      plan.id === currentPlan?.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <CardHeader className="text-center">
                      <div className="mb-2 flex justify-center">{getPlanIcon(plan.tier)}</div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-2xl font-bold">
                        {formatCurrency(plan.price)}
                        <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• {plan.maxUsers} users</li>
                        <li>• {plan.storage} GB storage</li>
                        <li>• {plan.apiCalls.toLocaleString()} API calls</li>
                        <li>• {plan.support} support</li>
                      </ul>
                      {plan.id === currentPlan?.id && (
                        <Badge className="mt-3 w-full justify-center">Current Plan</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsChangePlanDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => changePlan(selectedPlan)}
                  disabled={!selectedPlan || selectedPlan === currentPlan?.id}
                >
                  Change Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Current Subscription */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentPlan && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      {getPlanIcon(currentPlan.tier)}
                      <div>
                        <h3 className="font-semibold">{currentPlan.name} Plan</h3>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(currentPlan.price)} per {currentPlan.interval}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(subscription.status)} variant="secondary">
                      {subscription.status}
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Current Period</p>
                    <p className="font-medium">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Next Billing</p>
                    <p className="font-medium">{calculateNextBilling()}</p>
                  </div>
                </div>

                {currentPlan && (
                  <div>
                    <p className="mb-2 text-sm text-gray-500">Plan Features</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {currentPlan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsChangePlanDialogOpen(true)}>
                    Change Plan
                  </Button>
                  <Button variant="outline">Cancel Subscription</Button>
                </div>
              </CardContent>
            </Card>

            {/* Billing Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Current Month</span>
                    <span className="font-semibold">{formatCurrency(2499)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Year to Date</span>
                    <span className="font-semibold">{formatCurrency(29988)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Outstanding</span>
                    <span className="font-semibold text-red-600">{formatCurrency(2499)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Recent Invoices</h4>
                  {invoices.slice(0, 3).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{invoice.number}</p>
                        <p className="text-gray-500">
                          {new Date(invoice.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <Badge className={getStatusColor(invoice.status)} variant="secondary">
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <a href="#invoices">View All Invoices</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscription Details */}
        <TabsContent value="subscription">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subscription ID</Label>
                  <code className="block rounded bg-gray-100 p-2 text-sm">{subscription.id}</code>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Badge className={getStatusColor(subscription.status)} variant="secondary">
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Cancel at Period End</Label>
                    <Badge variant={subscription.cancelAtPeriodEnd ? 'destructive' : 'default'}>
                      {subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Period</Label>
                  <p className="text-sm">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>

                {subscription.trialEnd && (
                  <div className="space-y-2">
                    <Label>Trial Ends</Label>
                    <p className="text-sm">
                      {new Date(subscription.trialEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Clock className="mr-2 h-4 w-4" />
                    Pause Subscription
                  </Button>
                  <Button variant="destructive" className="w-full">
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentPlan && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Users</span>
                        <span>125 / {currentPlan.maxUsers}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${(125 / currentPlan.maxUsers) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Storage</span>
                        <span>45.2 GB / {currentPlan.storage} GB</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{ width: `${(45.2 / currentPlan.storage) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>API Calls (this month)</span>
                        <span>45,230 / {currentPlan.apiCalls.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-purple-600"
                          style={{ width: `${(45230 / currentPlan.apiCalls) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Overage Charges</h4>
                  <div className="text-sm text-gray-600">
                    <p>Additional users: R50 per user per month</p>
                    <p>Extra storage: R10 per GB per month</p>
                    <p>API calls: R0.01 per 1,000 calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Invoice History</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded bg-gray-100 p-2">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{invoice.number}</p>
                        <p className="text-sm text-gray-500">{invoice.description}</p>
                        <p className="text-xs text-gray-400">
                          Issued: {new Date(invoice.date).toLocaleDateString()} | Due:{' '}
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                        <Badge className={getStatusColor(invoice.status)} variant="secondary">
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.downloadUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInvoice(invoice.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendInvoiceEmail(invoice.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods */}
        <TabsContent value="payment-methods">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded bg-blue-100 p-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-500">Expires 12/2025</p>
                      </div>
                    </div>
                    <Badge variant="default">Primary</Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billingName">Name</Label>
                  <Input id="billingName" value="Acme Corporation" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingAddress">Address</Label>
                  <Input id="billingAddress" value="123 Business Park" readOnly />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingCity">City</Label>
                    <Input id="billingCity" value="Johannesburg" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingPostal">Postal Code</Label>
                    <Input id="billingPostal" value="2000" readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingCountry">Country</Label>
                  <Input id="billingCountry" value="South Africa" readOnly />
                </div>
                <Button variant="outline" className="w-full">
                  Update Billing Address
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
