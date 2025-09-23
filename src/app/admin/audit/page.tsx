"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Clock,
  User,
  Shield,
  Database,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  ExternalLink
} from "lucide-react"
import { format } from "date-fns"

interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  action: string
  resource: string
  resourceId: string
  details: string
  ipAddress: string
  userAgent: string
  status: 'success' | 'warning' | 'error' | 'info'
  organizationId: string
  organizationName: string
  metadata?: Record<string, any>
}

export default function AuditPage() {
  const [auditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2023-12-15T14:30:00Z',
      userId: 'user1',
      userName: 'John Smith',
      userEmail: 'john@acme.com',
      action: 'CREATE',
      resource: 'supplier',
      resourceId: 'SUP-001',
      details: 'Created new supplier: TechCorp Solutions',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { supplierName: 'TechCorp Solutions', category: 'Technology' }
    },
    {
      id: '2',
      timestamp: '2023-12-15T14:25:00Z',
      userId: 'user2',
      userName: 'Sarah Davis',
      userEmail: 'sarah@acme.com',
      action: 'UPDATE',
      resource: 'purchase_order',
      resourceId: 'PO-2023-125',
      details: 'Updated purchase order status to approved',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { oldStatus: 'pending', newStatus: 'approved', amount: 15750.00 }
    },
    {
      id: '3',
      timestamp: '2023-12-15T14:20:00Z',
      userId: 'system',
      userName: 'System',
      userEmail: 'system@mantisnxt.com',
      action: 'LOGIN_FAILED',
      resource: 'authentication',
      resourceId: 'auth-attempt-123',
      details: 'Failed login attempt from IP 203.45.67.89',
      ipAddress: '203.45.67.89',
      userAgent: 'curl/7.68.0',
      status: 'warning',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { attempts: 3, locked: false }
    },
    {
      id: '4',
      timestamp: '2023-12-15T14:15:00Z',
      userId: 'user3',
      userName: 'Mike Johnson',
      userEmail: 'mike@acme.com',
      action: 'DELETE',
      resource: 'invoice',
      resourceId: 'INV-2023-089',
      details: 'Deleted draft invoice INV-2023-089',
      ipAddress: '192.168.1.110',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { amount: 2500.00, supplier: 'Global Manufacturing' }
    },
    {
      id: '5',
      timestamp: '2023-12-15T14:10:00Z',
      userId: 'admin1',
      userName: 'System Admin',
      userEmail: 'admin@mantisnxt.com',
      action: 'CONFIG_CHANGE',
      resource: 'system_settings',
      resourceId: 'settings-backup',
      details: 'Modified backup configuration settings',
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Ubuntu; Linux x86_64) AppleWebKit/537.36',
      status: 'info',
      organizationId: 'system',
      organizationName: 'System Administration',
      metadata: { setting: 'backup_frequency', oldValue: 'daily', newValue: 'twice_daily' }
    },
    {
      id: '6',
      timestamp: '2023-12-15T14:05:00Z',
      userId: 'user1',
      userName: 'John Smith',
      userEmail: 'john@acme.com',
      action: 'EXPORT',
      resource: 'report',
      resourceId: 'RPT-SUPPLIERS-2023',
      details: 'Exported supplier report for December 2023',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { format: 'PDF', recordCount: 125 }
    },
    {
      id: '7',
      timestamp: '2023-12-15T14:00:00Z',
      userId: 'user4',
      userName: 'Lisa Brown',
      userEmail: 'lisa@acme.com',
      action: 'ACCESS_DENIED',
      resource: 'financial_reports',
      resourceId: 'finance-dashboard',
      details: 'Attempted to access financial reports without permission',
      ipAddress: '192.168.1.115',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      status: 'error',
      organizationId: 'org1',
      organizationName: 'Acme Corporation',
      metadata: { requiredPermission: 'finance.view', userRole: 'supplier_manager' }
    }
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterResource, setFilterResource] = useState("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = filterAction === "all" || log.action === filterAction
    const matchesStatus = filterStatus === "all" || log.status === filterStatus
    const matchesResource = filterResource === "all" || log.resource === filterResource

    // Date filtering would be implemented here
    const matchesDate = true

    return matchesSearch && matchesAction && matchesStatus && matchesResource && matchesDate
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'info':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <FileText className="h-4 w-4" />
      case 'update':
        return <Settings className="h-4 w-4" />
      case 'delete':
        return <XCircle className="h-4 w-4" />
      case 'login':
      case 'login_failed':
        return <User className="h-4 w-4" />
      case 'export':
        return <Download className="h-4 w-4" />
      case 'access_denied':
        return <Shield className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const exportLogs = () => {
    // Export audit logs functionality
    console.log('Exporting audit logs...')
  }

  const refreshLogs = () => {
    // Refresh audit logs functionality
    console.log('Refreshing audit logs...')
  }

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log)
  }

  // Get unique values for filters
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))]
  const uniqueResources = [...new Set(auditLogs.map(log => log.resource))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor system activity and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <a href="/admin/audit/reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Actions</p>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round((auditLogs.filter(log => log.status === 'success').length / auditLogs.length) * 100)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed Actions</p>
                <p className="text-2xl font-bold">{auditLogs.filter(log => log.status === 'error').length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Users</p>
                <p className="text-2xl font-bold">{new Set(auditLogs.map(log => log.userId)).size}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger>
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Trail</span>
            <Badge variant="outline">{filteredLogs.length} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  {getStatusIcon(log.status)}
                  {getActionIcon(log.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getStatusColor(log.status)} variant="secondary">
                      {log.action.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {log.resource.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-gray-500">#{log.resourceId}</span>
                  </div>

                  <p className="text-sm font-medium text-gray-900 mb-1">{log.details}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={log.userAvatar} alt={log.userName} />
                        <AvatarFallback>
                          {log.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {log.userName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.timestamp), 'PPpp')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {log.organizationName}
                    </div>
                    <div className="text-gray-400">
                      {log.ipAddress}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewLogDetails(log)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
              <p className="text-gray-500">
                {searchTerm || filterAction !== "all" || filterStatus !== "all" || filterResource !== "all"
                  ? "Try adjusting your search or filters"
                  : "Audit logs will appear here as users interact with the system"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal would go here */}
      {selectedLog && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Selected log: {selectedLog.id} - {selectedLog.details}
            <Button variant="link" className="p-0 h-auto ml-2" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}