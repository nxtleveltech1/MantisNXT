"use client"

import * as React from "react"
import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import MagicDashboard from '@/components/dashboard/MagicDashboard'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { Separator } from "@/components/ui/separator"

export default function Home() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">MantisNXT Dashboard</span>
            <Link href="/">Live Dashboard</Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <AsyncBoundary>
            <MagicDashboard />
          </AsyncBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
