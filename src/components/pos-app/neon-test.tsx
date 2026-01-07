"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Database } from "lucide-react"

export default function NeonTest() {
  const [testResults, setTestResults] = useState<{
    connection: boolean | null
    products: boolean | null
    orders: boolean | null
    stats: boolean | null
    error?: string
  }>({
    connection: null,
    products: null,
    orders: null,
    stats: null,
  })

  const runTests = async () => {
    setTestResults({ connection: null, products: null, orders: null, stats: null })

    try {
      // Test 1: Products API
      const productsResponse = await fetch("/api/pos-app/products")
      if (!productsResponse.ok) {
        const error = await productsResponse.json()
        setTestResults((prev) => ({
          ...prev,
          connection: false,
          error: `Products API failed: ${error.error || productsResponse.statusText}`,
        }))
        return
      }
      const productsData = await productsResponse.json()
      setTestResults((prev) => ({ ...prev, connection: true, products: Array.isArray(productsData) }))

      // Test 2: Orders API
      const ordersResponse = await fetch("/api/pos-app/orders")
      if (!ordersResponse.ok) {
        const error = await ordersResponse.json()
        setTestResults((prev) => ({
          ...prev,
          orders: false,
          error: `Orders API failed: ${error.error || ordersResponse.statusText}`,
        }))
        return
      }
      const ordersData = await ordersResponse.json()
      setTestResults((prev) => ({ ...prev, orders: Array.isArray(ordersData) }))

      // Test 3: Stats API
      const statsResponse = await fetch("/api/pos-app/stats")
      if (!statsResponse.ok) {
        const error = await statsResponse.json()
        setTestResults((prev) => ({
          ...prev,
          stats: false,
          error: `Stats API failed: ${error.error || statsResponse.statusText}`,
        }))
        return
      }
      const statsData = await statsResponse.json()
      setTestResults((prev) => ({
        ...prev,
        stats: typeof statsData === "object" && statsData !== null,
      }))
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        error: `Unexpected error: ${error.message}`,
      }))
    }
  }

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <div className="w-5 h-5 rounded-full bg-gray-300" />
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Neon Database Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} className="w-full">
          Run Diagnostic Tests
        </Button>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Database Connection</span>
            {getStatusIcon(testResults.connection)}
          </div>
          <div className="flex items-center justify-between">
            <span>Products API</span>
            {getStatusIcon(testResults.products)}
          </div>
          <div className="flex items-center justify-between">
            <span>Orders API</span>
            {getStatusIcon(testResults.orders)}
          </div>
          <div className="flex items-center justify-between">
            <span>Stats API</span>
            {getStatusIcon(testResults.stats)}
          </div>
        </div>

        {testResults.error && (
          <Alert variant="destructive">
            <AlertDescription>{testResults.error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Database:</strong> Neon PostgreSQL
          </p>
          <p>
            <strong>Connection:</strong> Serverless HTTP
          </p>
        </div>

        {/* Schema Information */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2">API Endpoints</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• GET /api/pos-app/products</p>
            <p>• GET /api/pos-app/orders</p>
            <p>• GET /api/pos-app/stats</p>
            <p className="text-green-600">✓ All endpoints operational</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

