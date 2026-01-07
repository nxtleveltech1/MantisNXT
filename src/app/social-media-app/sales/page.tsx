"use client"

import ProductCatalog from "@/components/social-media/sales/ProductCatalog"
import Link from "next/link"
import { Package, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function SocialMediaSalesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/social-media-app")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">💰</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Sales Management</h1>
                  <p className="text-sm text-gray-500">Browse products and manage orders</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/social-media-app/sales/products">
                <Button variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Manage Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <ProductCatalog />
        </div>
      </main>
    </div>
  )
}
