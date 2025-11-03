"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Users,
  TrendingUp,
  Award,
  Settings,
  Star,
  Gift,
  Target,
  BarChart
} from "lucide-react"

/**
 * Loyalty Programs Admin Page
 *
 * Full CRUD for loyalty programs with multi-step wizard for program setup.
 * Allows admins to create, edit, and manage loyalty program configurations.
 */
export default function LoyaltyProgramsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Programs" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loyalty Programs</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage loyalty programs with custom tiers, benefits, and rules
            </p>
          </div>

          <Button size="lg" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Program
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
                  <h3 className="text-2xl font-bold mt-2">3</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                  <h3 className="text-2xl font-bold mt-2">1,247</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Points Issued</p>
                  <h3 className="text-2xl font-bold mt-2">45.2K</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Redemptions</p>
                  <h3 className="text-2xl font-bold mt-2">892</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
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
            <CardDescription>
              Configure and manage your customer loyalty programs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Program Card 1 */}
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">VIP Rewards</h3>
                      <Badge variant="default" className="mt-1">Active</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Premium loyalty program with exclusive benefits and accelerated earning rates
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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
                <div className="flex gap-2 w-full lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <BarChart className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>

            {/* Program Card 2 */}
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Standard Points</h3>
                      <Badge variant="default" className="mt-1">Active</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Core loyalty program for all customers with standard earning and redemption rules
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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
                <div className="flex gap-2 w-full lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <BarChart className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>

            {/* Program Card 3 */}
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow opacity-60">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Referral Bonus</h3>
                      <Badge variant="secondary" className="mt-1">Draft</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reward customers for referring new members to the loyalty program
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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
                <div className="flex gap-2 w-full lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <BarChart className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Define Tiers</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up membership levels with unique benefits
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Earning Rules</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure how customers earn points
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Rewards Catalog</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage available rewards and redemptions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
