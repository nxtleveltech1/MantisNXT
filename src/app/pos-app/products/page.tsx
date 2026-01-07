"use client"

import { useRouter } from "next/navigation"
import ProductManagement from "@/components/pos-app/product-management"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package } from "lucide-react"

export default function ProductsPage() {
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
              <Package className="h-8 w-4 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            </div>
          </div>
        </div>
      </header>

      <main>
        <ProductManagement />
      </main>
    </div>
  )
}

