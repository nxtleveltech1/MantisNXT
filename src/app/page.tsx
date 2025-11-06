"use client"

import React from "react"
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  CheckCircle,
  Star,
  Award,
  TrendingUp,
  Activity,
  Plus,
  UserCog,
  Shield,
  Settings,
  Monitor,
  Database,
  Lock
} from "lucide-react"

// MagicUI Dashboard - Animated components with stunning effects
import MagicDashboard from '@/components/dashboard/MagicDashboard'
import AsyncBoundary from '@/components/ui/AsyncBoundary'

export default function Home() {
  const breadcrumbs = [
    { label: "Live Dashboard" }
  ]

  return (
    <SelfContainedLayout
      title="MantisNXT Dashboard"
      breadcrumbs={breadcrumbs}
    >
      {/* MagicUI Dashboard - Animated and Interactive */}
      <AsyncBoundary>
        <MagicDashboard />
      </AsyncBoundary>

      {/* Floating Action Button for Quick Actions */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className="h-12 w-12 rounded-full shadow-lg"
          size="icon"
          asChild
        >
          <a href="/suppliers/new">
            <Plus className="h-5 w-5" />
          </a>
        </Button>
      </div>
    </SelfContainedLayout>
  )
}
