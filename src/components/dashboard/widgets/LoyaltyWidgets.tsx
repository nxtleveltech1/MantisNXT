/**
 * Loyalty & Rewards Widgets
 * Placeholder widgets for future loyalty program integration
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Users, Gift, TrendingUp, Award } from 'lucide-react';
import { formatCurrency } from '@/hooks/api/useDashboardWidgets';

// Helper to generate mock data (will be replaced with real data)
const generateMockLoyaltyData = () => {
  return {
    signups: {
      total: Math.floor(Math.random() * 500) + 100,
      thisMonth: Math.floor(Math.random() * 50) + 10,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendValue: `${(Math.random() * 20 + 5).toFixed(1)}%`,
    },
    members: {
      total: Math.floor(Math.random() * 2000) + 500,
      active: Math.floor(Math.random() * 1500) + 300,
      inactive: Math.floor(Math.random() * 500) + 100,
    },
    points: {
      accumulated: Math.floor(Math.random() * 500000) + 100000,
      redeemed: Math.floor(Math.random() * 200000) + 50000,
      pointsValue: Math.floor(Math.random() * 50000) + 10000,
      redemptionRate: (Math.random() * 30 + 10).toFixed(1),
    },
  };
};

// 1. Loyalty Sign-ups Widget
export function LoyaltySignupsWidget() {
  const data = generateMockLoyaltyData();

  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">New sign-ups</p>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-semibold text-foreground">{data.signups.thisMonth}</div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {data.signups.trendValue} vs last month
          </div>
          <div className="border-border border-t pt-2 text-sm">
            <span className="text-muted-foreground">Total </span>
            <span className="font-medium">{data.signups.total}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Mock data. Loyalty integration in progress.</p>
      </CardContent>
    </Card>
  );
}

// 2. Active Members Widget
export function ActiveMembersWidget() {
  const data = generateMockLoyaltyData();
  const activePercentage = ((data.members.active / data.members.total) * 100).toFixed(1);

  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Active members</p>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-semibold text-foreground">{data.members.active.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">
            of {data.members.total.toLocaleString()} total
          </div>
          <div className="border-border space-y-1 border-t pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active rate</span>
              <span className="font-medium">{activePercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inactive</span>
              <span className="font-medium">{data.members.inactive}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Mock data. Loyalty integration in progress.</p>
      </CardContent>
    </Card>
  );
}

// 3. Points Economy Widget
export function PointsEconomyWidget() {
  const data = generateMockLoyaltyData();
  const availablePoints = data.points.accumulated - data.points.redeemed;

  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Points economy</p>
          <Gift className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-semibold text-foreground">{availablePoints.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Available points</div>
          <div className="flex items-center gap-1 text-sm">
            <Award className="h-3 w-3 text-muted-foreground" />
            {formatCurrency(data.points.pointsValue)} value
          </div>
          <div className="border-border space-y-1 border-t pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accumulated</span>
              <span className="font-medium">{data.points.accumulated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Redeemed</span>
              <span className="font-medium">{data.points.redeemed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Redemption rate</span>
              <span className="font-medium">{data.points.redemptionRate}%</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Mock data. Loyalty integration in progress.</p>
      </CardContent>
    </Card>
  );
}
