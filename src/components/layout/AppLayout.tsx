"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { sidebarData } from "@/components/app-sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SectionQuickLinks } from "@/components/layout/SectionQuickLinks"
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
  showQuickLinks?: boolean
}

const normalizePath = (path: string) => {
  if (!path) return "/"
  const [base] = path.split("?")
  if (base === "/") return base
  return base.endsWith("/") ? base.slice(0, -1) : base
}

export const findSectionForPath = (pathname: string) => {
  const normalizedPath = normalizePath(pathname)
  let bestMatch: { item: (typeof sidebarData.navMain)[number]; score: number } | null = null

  const registerMatch = (item: (typeof sidebarData.navMain)[number], url: string) => {
    const normalizedTarget = normalizePath(url)
    if (normalizedTarget === "/") {
      if (normalizedPath === "/") {
        bestMatch = { item, score: 1 }
      }
      return
    }

    const isMatch =
      normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)

    if (isMatch) {
      const score = normalizedTarget.length
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { item, score }
      }
    }
  }

  sidebarData.navMain.forEach((item) => {
    registerMatch(item, item.url)
    item.items?.forEach((subItem) => registerMatch(item, subItem.url))
  })

  return bestMatch?.item ?? null
}

export default function AppLayout({
  children,
  title = "MantisNXT Dashboard",
  breadcrumbs = [],
  showQuickLinks = true,
}: AppLayoutProps) {
  const pathname = usePathname()
  const currentSection = React.useMemo(
    () => (pathname ? findSectionForPath(pathname) : null),
    [pathname],
  )
  const quickLinks = currentSection?.items ?? []

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="font-semibold truncate">{title}</span>
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 text-sm truncate">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span className="text-muted-foreground">/</span>
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="truncate text-muted-foreground hover:text-foreground"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="truncate text-muted-foreground">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-2 p-4 md:p-6 lg:p-8">
          {showQuickLinks && quickLinks.length > 0 ? (
            <div className="flex justify-end mb-0">
              <SectionQuickLinks
                sectionTitle={currentSection?.title ?? title}
                links={quickLinks}
                activePath={pathname ?? ""}
                className="w-full justify-end gap-3"
              />
            </div>
          ) : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

