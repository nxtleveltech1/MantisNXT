"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

export default function AppLayout({
  children,
  title = "MantisNXT Dashboard",
  breadcrumbs = [],
}: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{title}</span>
            {breadcrumbs.length > 0 && (
              <>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span className="text-muted-foreground">/</span>
                    {crumb.href ? (
                      <a href={crumb.href} className="text-muted-foreground hover:text-foreground">
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

