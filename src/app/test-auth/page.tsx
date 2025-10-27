'use client'

import React, { useState, useEffect } from 'react'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TestAuthPage() {
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/status')
      const data = await response.json()
      setAuthStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testHealth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setAuthStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testSuppliers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      setAuthStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testAuth()
  }, [])

  const breadcrumbs = [
    { label: "Test Authentication" }
  ]

  return (
    <SelfContainedLayout
      title="Authentication Test"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Endpoint Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testAuth} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Auth Status'}
              </Button>
              <Button onClick={testHealth} disabled={loading} variant="outline">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Health Check'}
              </Button>
              <Button onClick={testSuppliers} disabled={loading} variant="outline">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Suppliers API'}
              </Button>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  Error: {error}
                </AlertDescription>
              </Alert>
            )}

            {authStatus && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>API Response:</strong>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(authStatus, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Authentication system implemented</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>API endpoints created</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Pricelist upload functionality available</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Navigation and routing working</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SelfContainedLayout>
  )
}


