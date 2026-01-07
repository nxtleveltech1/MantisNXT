"use client"

import { useRouter } from "next/navigation"
import POSInterface from "@/components/pos-app/pos-interface"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Store } from "lucide-react"

export default function POSPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/pos-app")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Store className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            </div>
          </div>
        </div>
      </header>

      <main>
        <POSInterface />
      </main>
    </div>
  )
}

