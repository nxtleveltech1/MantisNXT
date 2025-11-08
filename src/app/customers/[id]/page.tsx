"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  CreditCard,
  ArrowLeft,
  Edit,
  Trash2,
  History,
  Users,
  DollarSign,
  Activity,
  Tag,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  segment: 'enterprise' | 'mid_market' | 'smb' | 'startup' | 'individual' | null;
  status: 'active' | 'inactive' | 'prospect' | 'churned' | 'suspended' | null;
  lifetime_value: number | null;
  acquisition_date: string | null;
  last_interaction_date: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
  metadata: Record<string, any> | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface CustomerLoyalty {
  id: string;
  customer_id: string;
  program_id: string | null;
  current_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | null;
  total_points_earned: number;
  total_points_redeemed: number;
  points_balance: number;
  tier_qualified_date: string | null;
  lifetime_value: number | null;
  referral_count: number;
  created_at: string;
  updated_at: string;
}

interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';
  points_amount: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);

      const customerResponse = await fetch(`/api/v1/customers/${customerId}`);
      const customerData = await customerResponse.json();

      if (customerData.success) {
        setCustomer(customerData.data);
      }

      const loyaltyResponse = await fetch(`/api/v1/customers/${customerId}/loyalty`);
      const loyaltyData = await loyaltyResponse.json();

      if (loyaltyData.success && loyaltyData.data) {
        setLoyalty(loyaltyData.data);
      }

      const transactionsResponse = await fetch(`/api/v1/customers/${customerId}/loyalty/transactions`);
      const transactionsData = await transactionsResponse.json();

      if (transactionsData.success) {
        setTransactions(transactionsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast({
        title: "Error",
        description: "Failed to load customer details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/customers/${customerId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Customer Deleted",
          description: "Customer has been deleted successfully",
        });
        router.push('/customers');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const getSegmentColor = (segment: string | null) => {
    const colors: Record<string, string> = {
      enterprise: 'bg-purple-100 text-purple-800',
      mid_market: 'bg-blue-100 text-blue-800',
      smb: 'bg-green-100 text-green-800',
      startup: 'bg-orange-100 text-orange-800',
      individual: 'bg-gray-100 text-gray-800',
    };
    return segment ? colors[segment] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      prospect: 'bg-blue-100 text-blue-800',
      churned: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800',
    };
    return status ? colors[status] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  const getTierColor = (tier: string | null) => {
    const colors: Record<string, string> = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-blue-100 text-blue-800',
      diamond: 'bg-purple-100 text-purple-800',
    };
    return tier ? colors[tier] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      earn: 'bg-green-100 text-green-800',
      redeem: 'bg-blue-100 text-blue-800',
      expire: 'bg-red-100 text-red-800',
      adjust: 'bg-orange-100 text-orange-800',
      bonus: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.warn('Failed to format date:', dateString, error);
      return 'N/A';
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Failed to format date:', dateString, error);
      return 'N/A';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || typeof value !== 'number') return '0';
    if (isNaN(value)) return '0';
    return value.toLocaleString('en-US');
  };

  if (loading) {
    return (
      <AppLayout
        title="Customer Details"
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: "Details" },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout
        title="Customer Details"
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: "Details" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Customer not found</p>
          <Button onClick={() => router.push('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={customer.name}
      breadcrumbs={[
        { label: "Customers", href: "/customers" },
        { label: customer.name },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/customers')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6" />
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(customer.status)}>
                  {customer.status || 'Unknown'}
                </Badge>
                {customer.segment && (
                  <Badge className={getSegmentColor(customer.segment)}>
                    {customer.segment}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/customers/${customerId}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCustomer}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(customer.lifetime_value)}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(loyalty?.points_balance)}</div>
              {loyalty?.current_tier && (
                <Badge className={`mt-2 ${getTierColor(loyalty.current_tier)}`}>
                  {loyalty.current_tier}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loyalty?.referral_count || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Interaction</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{formatDate(customer.last_interaction_date)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Customer contact details and communication preferences</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Email</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{customer.email || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Phone</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{customer.phone || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Company</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{customer.company || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Segment</p>
                  </div>
                  <Badge className={getSegmentColor(customer.segment)}>
                    {customer.segment || 'Unassigned'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Customer location and billing information</CardDescription>
              </CardHeader>
              <CardContent>
                {customer.address ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="space-y-1">
                        {customer.address.street && <p className="text-sm">{customer.address.street}</p>}
                        <p className="text-sm">
                          {[
                            customer.address.city,
                            customer.address.state,
                            customer.address.postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        {customer.address.country && <p className="text-sm">{customer.address.country}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No address on file</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Key dates and milestones</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Acquisition Date</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(customer.acquisition_date)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Last Interaction</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(customer.last_interaction_date)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Created At</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(customer.created_at)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Last Updated</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(customer.updated_at)}</p>
                </div>
              </CardContent>
            </Card>

            {customer.tags && customer.tags.length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>Customer classifications and labels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {customer.metadata && Object.keys(customer.metadata).length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>Custom metadata and properties</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(customer.metadata).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-4">
            {loyalty ? (
              <>
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Loyalty Tier Status</CardTitle>
                    <CardDescription>Current tier and qualification details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Current Tier</p>
                        <Badge className={`text-lg ${getTierColor(loyalty.current_tier)}`}>
                          {loyalty.current_tier ? loyalty.current_tier.toUpperCase() : 'NO TIER'}
                        </Badge>
                      </div>
                      <Award className="h-12 w-12 text-muted-foreground" />
                    </div>
                    {loyalty.tier_qualified_date && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Qualified Since</p>
                        <p className="text-sm text-muted-foreground">{formatDate(loyalty.tier_qualified_date)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Points Summary</CardTitle>
                    <CardDescription>Lifetime points activity and current balance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Total Earned</p>
                        <p className="text-2xl font-bold text-green-600">
                          +{formatNumber(loyalty.total_points_earned)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Total Redeemed</p>
                        <p className="text-2xl font-bold text-blue-600">
                          -{formatNumber(loyalty.total_points_redeemed)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current Balance</p>
                        <p className="text-2xl font-bold">{formatNumber(loyalty.points_balance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Referral Activity</CardTitle>
                    <CardDescription>Customer referral performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Total Referrals</p>
                        <p className="text-2xl font-bold">{loyalty.referral_count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {loyalty.lifetime_value !== null && (
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Loyalty Lifetime Value</CardTitle>
                      <CardDescription>Total value from loyalty program participation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Lifetime Value</p>
                          <p className="text-2xl font-bold">{formatCurrency(loyalty.lifetime_value)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">This customer is not enrolled in any loyalty program</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Loyalty Transactions</CardTitle>
                <CardDescription>
                  {transactions.length > 0
                    ? `Showing ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
                    : 'No transactions found'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                              {transaction.transaction_type}
                            </Badge>
                            <span className="text-sm font-medium">
                              {transaction.points_amount > 0 ? '+' : ''}
                              {formatNumber(transaction.points_amount)} points
                            </span>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground">{transaction.description}</p>
                          )}
                          {transaction.reference_type && transaction.reference_id && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {transaction.reference_type} #{transaction.reference_id}
                            </p>
                          )}
                          {transaction.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {formatDate(transaction.expires_at)}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                          {transaction.created_by && (
                            <p className="text-xs text-muted-foreground">By: {transaction.created_by}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <History className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No transactions recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Key metrics and performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Lifetime Value</p>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(customer.lifetime_value)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Status</p>
                    </div>
                    <Badge className={getStatusColor(customer.status)}>
                      {customer.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Segment</p>
                    </div>
                    <Badge className={getSegmentColor(customer.segment)}>
                      {customer.segment || 'Unassigned'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Days Since Acquisition</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {customer.acquisition_date
                        ? Math.floor(
                            (new Date().getTime() - new Date(customer.acquisition_date).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loyalty && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Loyalty Metrics</CardTitle>
                  <CardDescription>Engagement and rewards performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Redemption Rate</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {loyalty.total_points_earned > 0
                          ? `${((loyalty.total_points_redeemed / loyalty.total_points_earned) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Referral Count</p>
                      </div>
                      <p className="text-2xl font-bold">{loyalty.referral_count}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Available Points</p>
                      </div>
                      <p className="text-2xl font-bold">{formatNumber(loyalty.points_balance)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Current Tier</p>
                      </div>
                      <Badge className={getTierColor(loyalty.current_tier)}>
                        {loyalty.current_tier || 'No Tier'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>Recent customer activity overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Total Transactions</p>
                    </div>
                    <p className="text-lg font-bold">{transactions.length}</p>
                  </div>
                  {transactions.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Last Transaction</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transactions[0].created_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
