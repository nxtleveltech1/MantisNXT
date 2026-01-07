"use client"

import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import DownloadGenerator from "@/components/marketing/download-generator"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function DownloadPage() {
  const router = useRouter()

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title="Marketing Materials" subtitle="Download promotional content and assets" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.push("/marketing-app")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </div>
          <DownloadGenerator />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
