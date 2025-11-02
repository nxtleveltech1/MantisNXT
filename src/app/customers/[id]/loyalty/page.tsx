/**
 * Customer Loyalty Portal Page
 *
 * Main page that integrates all customer loyalty components
 * This demonstrates how to use all 6 components together
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  Gift,
  History,
  TrendingUp,
  Users,
  Package,
} from 'lucide-react';
import {
  LoyaltyDashboard,
  TierProgressTracker,
  RewardCatalog,
  TransactionHistory,
  RedemptionStatus,
  ReferralProgram,
} from '@/components/loyalty/customer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

interface PageProps {
  params: {
    id: string;
  };
}

function LoyaltyPortalContent({ customerId }: { customerId: string }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPoints, setCurrentPoints] = useState(8500); // Will be fetched from API

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Loyalty Rewards</h1>
        <p className="text-muted-foreground">
          Manage your rewards, track your progress, and redeem exclusive benefits
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Rewards</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Redemptions</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Referrals</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <LoyaltyDashboard
            customerId={customerId}
            onBrowseRewards={() => setActiveTab('rewards')}
            onViewTransactions={() => setActiveTab('transactions')}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-6">
          <TierProgressTracker customerId={customerId} />
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4 mt-6">
          <RewardCatalog
            customerId={customerId}
            currentPoints={currentPoints}
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-6">
          <TransactionHistory customerId={customerId} />
        </TabsContent>

        <TabsContent value="redemptions" className="space-y-4 mt-6">
          <RedemptionStatus customerId={customerId} />
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4 mt-6">
          <ReferralProgram customerId={customerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CustomerLoyaltyPage({ params }: PageProps) {
  // In production, verify the user has access to this customer ID
  const { data: session } = useSession();

  // Example: Check if user can access this customer
  // if (!session || session.user.customerId !== params.id) {
  //   redirect('/unauthorized');
  // }

  return (
    <QueryClientProvider client={queryClient}>
      <LoyaltyPortalContent customerId={params.id} />
    </QueryClientProvider>
  );
}
