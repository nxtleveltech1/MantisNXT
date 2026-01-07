"use client"

import { useRouter } from "next/navigation"
import NeonTest from "@/components/pos-app/neon-test"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Settings, Store, Database, Info } from "lucide-react"

export default function SettingsPage() {
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
              <Settings className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">System Settings</h1>
        </div>

        {/* System Diagnostics */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NeonTest />
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Database Connection</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Database:</strong> Neon PostgreSQL
                  </p>
                  <p>
                    <strong>Environment:</strong> Production
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">System Status</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Mode:</strong> Open Access
                  </p>
                  <p>
                    <strong>Status:</strong> Online
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent" onClick={() => router.push("/pos-app")}>
                <Store className="h-6 w-6" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
                onClick={() => router.push("/pos-app/pos")}
              >
                <Store className="h-6 w-6" />
                Point of Sale
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
                onClick={() => router.push("/pos-app/products")}
              >
                <Store className="h-6 w-6" />
                Products
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

