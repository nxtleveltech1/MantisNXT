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
    <Card className="bg-card border-border rounded-xl border shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">New Sign-ups</p>
            <p className="text-muted-foreground/70 text-xs">Last 30 days</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-bold">{data.signups.thisMonth}</div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp
              className={`h-4 w-4 ${data.signups.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
            />
            <span
              className={`font-medium ${data.signups.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
            >
              {data.signups.trendValue}
            </span>
            <span className="text-muted-foreground text-xs">vs last month</span>
          </div>

          <div className="border-border border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total sign-ups</span>
              <span className="font-medium">{data.signups.total}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">📦 Mock Data</p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
            Loyalty program integration in progress
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 2. Active Members Widget
export function ActiveMembersWidget() {
  const data = generateMockLoyaltyData();
  const activePercentage = ((data.members.active / data.members.total) * 100).toFixed(1);

  return (
    <Card className="bg-card border-border rounded-xl border shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Active Members</p>
            <p className="text-muted-foreground/70 text-xs">Loyalty program</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-bold">{data.members.active.toLocaleString()}</div>
          <div className="text-sm">
            <span className="text-muted-foreground">of </span>
            <span className="font-medium">{data.members.total.toLocaleString()}</span>
            <span className="text-muted-foreground"> total members</span>
          </div>

          <div className="border-border space-y-2 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active rate</span>
              <span className="font-medium text-green-600">{activePercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Inactive</span>
              <span className="font-medium">{data.members.inactive}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">📦 Mock Data</p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
            Loyalty program integration in progress
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 3. Points Economy Widget
export function PointsEconomyWidget() {
  const data = generateMockLoyaltyData();
  const availablePoints = data.points.accumulated - data.points.redeemed;

  return (
    <Card className="bg-card border-border rounded-xl border shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Points Economy</p>
            <p className="text-muted-foreground/70 text-xs">Total & value</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
            <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-3xl font-bold">{availablePoints.toLocaleString()}</div>
            <div className="text-muted-foreground text-xs">Available points</div>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <Award className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-600">
              {formatCurrency(data.points.pointsValue)}
            </span>
            <span className="text-muted-foreground text-xs">value</span>
          </div>

          <div className="border-border space-y-2 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Accumulated</span>
              <span className="font-medium">{data.points.accumulated.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Redeemed</span>
              <span className="font-medium">{data.points.redeemed.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Redemption rate</span>
              <span className="font-medium text-purple-600">{data.points.redemptionRate}%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">📦 Mock Data</p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
            Loyalty program integration in progress
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
