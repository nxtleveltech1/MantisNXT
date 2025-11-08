'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { authProvider } from '@/lib/auth/mock-provider'
import { USER_ROLES } from '@/types/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Shield,
  Activity,
} from 'lucide-react'
import { parse } from 'csv-parse/sync'

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{
    row: number
    email?: string
    errors: string[]
  }>
}

interface BulkOperation {
  type: 'activate' | 'deactivate' | 'assign-role' | 'import'
  status: 'idle' | 'processing' | 'complete' | 'error'
  progress: number
  result?: ImportResult
}

export default function BulkOperationsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [operation, setOperation] = useState<BulkOperation>({
    type: 'import',
    status: 'idle',
    progress: 0,
  })

  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const downloadTemplate = () => {
    const csvContent = [
      'name,email,role,department,phone,password,id_number,employment_equity',
      'John Doe,john@example.co.za,user,Sales,+27 11 123 4567,Password123!,8001015009087,white',
      'Jane Smith,jane@example.co.za,manager,Procurement,+27 21 456 7890,Password123!,8505125234086,african',
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      setOperation({ ...operation, status: 'processing', progress: 0 })

      const text = await file.text()
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
      })

      const errors: ImportResult['errors'] = []
      let successCount = 0

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        const rowErrors: string[] = []

        // Validate required fields
        if (!record.name) rowErrors.push('Name is required')
        if (!record.email) rowErrors.push('Email is required')
        if (!record.role) rowErrors.push('Role is required')
        if (!record.department) rowErrors.push('Department is required')
        if (!record.phone) rowErrors.push('Phone is required')

        // Validate email format
        if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
          rowErrors.push('Invalid email format')
        }

        // Validate role
        if (record.role && !USER_ROLES.find((r) => r.value === record.role)) {
          rowErrors.push('Invalid role')
        }

        if (rowErrors.length > 0) {
          errors.push({
            row: i + 2, // +2 because CSV is 1-indexed and has header row
            email: record.email,
            errors: rowErrors,
          })
        } else {
          successCount++
        }

        // Update progress
        setOperation((prev) => ({
          ...prev,
          progress: Math.round(((i + 1) / records.length) * 100),
        }))
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setOperation({
        ...operation,
        status: errors.length > 0 ? 'error' : 'complete',
        progress: 100,
        result: {
          total: records.length,
          success: successCount,
          failed: errors.length,
          errors,
        },
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process CSV file'
      )
      setOperation({ ...operation, status: 'error', progress: 0 })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetOperation = () => {
    setOperation({
      type: 'import',
      status: 'idle',
      progress: 0,
    })
    setError(null)
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Users', href: '/admin/users' },
        { label: 'Bulk Operations' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Bulk Operations</h1>
          <p className="text-muted-foreground">
            Import users, assign roles, and manage multiple accounts at once
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="role-assignment">
              <Shield className="h-4 w-4 mr-2" />
              Bulk Role Assignment
            </TabsTrigger>
            <TabsTrigger value="status">
              <Activity className="h-4 w-4 mr-2" />
              Bulk Status Change
            </TabsTrigger>
          </TabsList>

          {/* CSV Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Import Users from CSV
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to create multiple user accounts at once
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {operation.status === 'idle' && (
                  <>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold mb-2">Before importing:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Download the CSV template below</li>
                            <li>Fill in all required fields (name, email, role, department, phone)</li>
                            <li>Ensure email addresses are unique and valid</li>
                            <li>Use valid role values: {USER_ROLES.map((r) => r.value).join(', ')}</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <div className="flex justify-center">
                        <Button onClick={downloadTemplate} variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download CSV Template
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium mb-2">Upload CSV File</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Click the button below to select your CSV file
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {operation.status === 'processing' && (
                  <div className="space-y-4 text-center py-8">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <div>
                      <p className="font-medium mb-2">Processing CSV...</p>
                      <Progress value={operation.progress} className="w-64 mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {operation.progress}% complete
                      </p>
                    </div>
                  </div>
                )}

                {(operation.status === 'complete' || operation.status === 'error') &&
                  operation.result && (
                    <div className="space-y-6">
                      {/* Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Total Rows</p>
                                <p className="text-2xl font-bold">
                                  {operation.result.total}
                                </p>
                              </div>
                              <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Successful</p>
                                <p className="text-2xl font-bold text-green-600">
                                  {operation.result.success}
                                </p>
                              </div>
                              <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Failed</p>
                                <p className="text-2xl font-bold text-red-600">
                                  {operation.result.failed}
                                </p>
                              </div>
                              <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Errors */}
                      {operation.result.errors.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Import Errors</CardTitle>
                            <CardDescription>
                              The following rows contain errors and were not imported
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {operation.result.errors.map((error, index) => (
                                <div
                                  key={index}
                                  className="flex items-start space-x-3 p-3 border rounded-lg bg-red-50 border-red-200"
                                >
                                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">
                                      Row {error.row}
                                      {error.email && (
                                        <span className="text-muted-foreground">
                                          {' '}
                                          - {error.email}
                                        </span>
                                      )}
                                    </p>
                                    <ul className="mt-1 space-y-1 text-sm text-red-600">
                                      {error.errors.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Actions */}
                      <div className="flex justify-center gap-3">
                        <Button onClick={resetOperation} variant="outline">
                          Import Another File
                        </Button>
                        {operation.result.success > 0 && (
                          <Button onClick={() => router.push('/admin/users')}>
                            View Users
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Role Assignment Tab */}
          <TabsContent value="role-assignment">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Role Assignment</CardTitle>
                <CardDescription>
                  Assign roles to multiple selected users at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      To use bulk role assignment, first select users from the{' '}
                      <a href="/admin/users" className="underline font-semibold">
                        Users page
                      </a>{' '}
                      and click &quot;Assign Role&quot; from the bulk actions menu.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="bulk-role">Select Role to Assign</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger id="bulk-role">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button disabled className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Assign Role to Selected Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Status Change Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Status Change</CardTitle>
                <CardDescription>
                  Activate or deactivate multiple user accounts at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      To use bulk status change, first select users from the{' '}
                      <a href="/admin/users" className="underline font-semibold">
                        Users page
                      </a>{' '}
                      and click &quot;Activate&quot; or &quot;Deactivate&quot; from the bulk actions menu.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="bulk-status">Select Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="bulk-status">
                        <SelectValue placeholder="Choose status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" disabled className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Activate Selected
                    </Button>
                    <Button variant="outline" disabled className="w-full">
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

const Separator = ({ className }: { className?: string }) => (
  <div className={`border-t ${className}`} />
)
