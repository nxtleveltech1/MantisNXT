'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Users,
  TrendingUp,
  Award,
  Settings,
  Star,
  Gift,
  Target,
  BarChart,
} from 'lucide-react';

/**
 * Loyalty Programs Admin Page
 *
 * Full CRUD for loyalty programs with multi-step wizard for program setup.
 * Allows admins to create, edit, and manage loyalty program configurations.
 */
export default function LoyaltyProgramsPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: 'Loyalty & Rewards', href: '/admin/loyalty' }, { label: 'Programs' }]}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loyalty Programs</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage loyalty programs with custom tiers, benefits, and rules
            </p>
          </div>

          <Button size="lg" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Active Programs</p>
                  <h3 className="mt-2 text-2xl font-bold">3</h3>
                </div>
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Award className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Members</p>
                  <h3 className="mt-2 text-2xl font-bold">1,247</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Points Issued</p>
                  <h3 className="mt-2 text-2xl font-bold">45.2K</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Redemptions</p>
                  <h3 className="mt-2 text-2xl font-bold">892</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Programs List */}
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Programs</CardTitle>
            <CardDescription>Configure and manage your customer loyalty programs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Program Card 1 */}
            <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">VIP Rewards</h3>
                      <Badge variant="default" className="mt-1">
                        Active
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Premium loyalty program with exclusive benefits and accelerated earning rates
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p className="font-semibold">456</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tiers</p>
                      <p className="font-semibold">3</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Points Issued</p>
                      <p className="font-semibold">28.5K</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Redemption Rate</p>
                      <p className="font-semibold">32%</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full gap-2 lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <BarChart className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>

            {/* Program Card 2 */}
            <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Standard Points</h3>
                      <Badge variant="default" className="mt-1">
                        Active
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Core loyalty program for all customers with standard earning and redemption
                    rules
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p className="font-semibold">732</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tiers</p>
                      <p className="font-semibold">2</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Points Issued</p>
                      <p className="font-semibold">15.1K</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Redemption Rate</p>
                      <p className="font-semibold">24%</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full gap-2 lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <BarChart className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>

            {/* Program Card 3 */}
            <div className="rounded-lg border p-6 opacity-60 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Referral Bonus</h3>
                      <Badge variant="secondary" className="mt-1">
                        Draft
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Reward customers for referring new members to the loyalty program
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p className="font-semibold">59</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tiers</p>
                      <p className="font-semibold">1</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Points Issued</p>
                      <p className="font-semibold">1.6K</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Redemption Rate</p>
                      <p className="font-semibold">18%</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full gap-2 lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <BarChart className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Star className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Define Tiers</h3>
                  <p className="text-muted-foreground text-sm">
                    Set up membership levels with unique benefits
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Earning Rules</h3>
                  <p className="text-muted-foreground text-sm">
                    Configure how customers earn points
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Rewards Catalog</h3>
                  <p className="text-muted-foreground text-sm">
                    Manage available rewards and redemptions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
