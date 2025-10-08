/**
 * Bulletproof Dashboard Example
 * Demonstrates how to integrate all the bulletproof UI components together
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Import all our bulletproof components
import { BulletproofDataLoader, ActivityDataLoader, MetricsDataLoader } from '@/components/ui/BulletproofDataLoader'
import { BulletproofActivityList } from '@/components/ui/BulletproofActivityList'
import { SystemHealthMonitor, HealthMonitorProvider } from '@/components/ui/SystemHealthMonitor'
import { ResponsiveUIProvider, PerformanceStatusIndicator, OperationManager, SmartLoadingWrapper } from '@/components/ui/ResponsiveUIManager'
import { InventoryBoundary, SupplierBoundary, AnalyticsBoundary } from '@/components/error-boundaries/GranularErrorBoundary'
import { resilientFetch } from '@/utils/resilientApi'
import { TimestampValidator, NumberValidator, SafeSorter } from '@/utils/dataValidation'

import {
  Activity,
  BarChart3,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'

// ============================================================================
// EXAMPLE DATA LOADING FUNCTIONS
// ============================================================================

// Simulate loading inventory data with potential timestamp issues
const loadInventoryData = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000))

  // Simulate occasional errors (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Database connection timeout')
  }

  return [
    { id: '1', name: 'Widget A', quantity: 100, price: 25.99, timestamp: Date.now() },
    { id: '2', name: 'Widget B', quantity: 75, price: 15.50, timestamp: 'invalid-date' }, // Bad timestamp
    { id: '3', name: 'Widget C', quantity: 0, price: null, timestamp: new Date('2024-01-15') }, // Null price
    { id: '4', name: 'Widget D', quantity: 'not-a-number', price: 35.00, timestamp: Date.now() - 86400000 } // Bad quantity
  ]
}

// Simulate loading activity data with various timestamp formats
const loadActivityData = async () => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1500))

  if (Math.random() < 0.15) {
    throw new Error('API rate limit exceeded')
  }

  return [
    {
      id: '1',
      type: 'inventory_update',
      description: 'Updated Widget A quantity',
      timestamp: Date.now(),
      amount: 1250.00,
      user: 'john.doe'
    },
    {
      id: '2',
      type: 'order_created',
      description: 'New purchase order created',
      timestamp: 'not-a-date', // Invalid timestamp
      amount: null,
      user: 'jane.smith'
    },
    {
      id: '3',
      type: 'supplier_added',
      description: 'Added new supplier: ACME Corp',
      timestamp: new Date('2024-01-14T10:30:00Z'),
      amount: undefined,
      user: 'admin'
    },
    {
      id: '4',
      type: 'inventory_alert',
      description: 'Low stock alert for Widget C',
      created_at: Date.now() - 3600000, // Use created_at instead of timestamp
      status: 'warning',
      user: 'system'
    }
  ]
}

// Simulate loading metrics with potential data issues
const loadMetricsData = async () => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))

  if (Math.random() < 0.05) {
    throw new Error('Metrics service unavailable')
  }

  return {
    totalRevenue: 'not-a-number', // Will be sanitized to 0
    totalOrders: 156,
    averageOrderValue: null, // Will be handled gracefully
    conversionRate: 0.045,
    activeUsers: 1247,
    responseTime: '250ms' // Will be converted to number
  }
}

// Simulate loading supplier data
const loadSupplierData = async () => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1200))

  return [
    { id: '1', name: 'ACME Corp', rating: 4.8, lastOrder: Date.now() - 86400000 },
    { id: '2', name: 'Global Supplies Inc', rating: 'invalid', lastOrder: 'yesterday' }, // Bad data
    { id: '3', name: 'Quick Parts LLC', rating: 4.2, lastOrder: new Date('2024-01-10') }
  ]
}

// ============================================================================
// DASHBOARD COMPONENTS
// ============================================================================

const MetricsCards: React.FC = () => (
  <AnalyticsBoundary>
    <MetricsDataLoader
      loadData={loadMetricsData}
      enableCaching={true}
      cacheKey="dashboard-metrics"
      autoRefresh={true}
      refreshInterval={60000} // 1 minute
    >
      {(metrics) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    ${NumberValidator.formatSafe(metrics.totalRevenue, {
                      style: 'currency',
                      currency: 'USD'
                    }, '$0')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">
                    {NumberValidator.formatSafe(metrics.totalOrders, {}, '0')}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">
                    {metrics.averageOrderValue !== null
                      ? NumberValidator.formatSafe(metrics.averageOrderValue, {
                          style: 'currency',
                          currency: 'USD'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">
                    {NumberValidator.formatSafe(metrics.activeUsers, {}, '0')}
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MetricsDataLoader>
  </AnalyticsBoundary>
)

const InventoryTable: React.FC = () => (
  <InventoryBoundary>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BulletproofDataLoader
          loadData={loadInventoryData}
          enableCaching={true}
          cacheKey="inventory-overview"
          autoRefresh={true}
          refreshInterval={30000}
          sanitizeData={(data) => {
            return data.map(item => ({
              ...item,
              quantity: NumberValidator.validate(item.quantity, { fallback: 0, min: 0 }).data || 0,
              price: NumberValidator.validate(item.price, { fallback: 0, min: 0, decimals: 2 }).data || 0,
              timestamp: TimestampValidator.validate(item.timestamp, { fallbackToNow: true }).data || new Date()
            }))
          }}
          skeletonType="table"
        >
          {(inventory) => (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">Total Items</div>
                  <div className="text-xl font-bold text-blue-800">{inventory.length}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">In Stock</div>
                  <div className="text-xl font-bold text-green-800">
                    {inventory.filter(item => item.quantity > 0).length}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-sm text-red-600">Out of Stock</div>
                  <div className="text-xl font-bold text-red-800">
                    {inventory.filter(item => item.quantity === 0).length}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Price</th>
                      <th className="text-left p-2">Last Updated</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SafeSorter.byTimestamp(inventory, item => item.timestamp, 'desc').map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">
                          <span className={item.quantity === 0 ? 'text-red-600 font-bold' : ''}>
                            {NumberValidator.formatSafe(item.quantity)}
                          </span>
                        </td>
                        <td className="p-2">
                          {NumberValidator.formatSafe(item.price, {
                            style: 'currency',
                            currency: 'USD'
                          })}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {TimestampValidator.formatSafe(item.timestamp, 'MMM dd, HH:mm')}
                        </td>
                        <td className="p-2">
                          <Badge variant={item.quantity > 0 ? 'default' : 'destructive'}>
                            {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </BulletproofDataLoader>
      </CardContent>
    </Card>
  </InventoryBoundary>
)

const SupplierList: React.FC = () => (
  <SupplierBoundary>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top Suppliers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BulletproofDataLoader
          loadData={loadSupplierData}
          enableCaching={true}
          cacheKey="supplier-list"
          sanitizeData={(data) => {
            return data.map(supplier => ({
              ...supplier,
              rating: NumberValidator.validate(supplier.rating, { min: 0, max: 5, fallback: 0 }).data || 0,
              lastOrder: TimestampValidator.validate(supplier.lastOrder, { allowNull: true }).data
            }))
          }}
          skeletonType="list"
        >
          {(suppliers) => (
            <div className="space-y-3">
              {SafeSorter.byNumber(suppliers, s => s.rating, 'desc').map((supplier) => (
                <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{supplier.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Last order: {supplier.lastOrder
                        ? TimestampValidator.formatRelativeSafe(supplier.lastOrder)
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < Math.floor(supplier.rating) ? 'bg-yellow-400' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {supplier.rating.toFixed(1)} / 5.0
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BulletproofDataLoader>
      </CardContent>
    </Card>
  </SupplierBoundary>
)

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export const BulletproofDashboardExample: React.FC = () => {
  return (
    <HealthMonitorProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header with System Status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bulletproof Dashboard</h1>
            <p className="text-muted-foreground">
              Demonstrating resilient UI components with comprehensive error handling
            </p>
          </div>
          <PerformanceStatusIndicator />
        </div>

        {/* System Health Monitor */}
        <SystemHealthMonitor showCompact={false} />

        {/* Metrics Cards */}
        <OperationManager
          operationName="metrics-load"
          showProgress={true}
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <MetricsCards />
        </OperationManager>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventory Table */}
          <div className="lg:col-span-2">
            <SmartLoadingWrapper
              threshold={2}
              fallback={
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Inventory Overview
                      <Badge variant="outline" className="ml-2">
                        <Clock className="h-3 w-3 mr-1" />
                        Loading...
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      System is busy. Please wait...
                    </div>
                  </CardContent>
                </Card>
              }
            >
              <InventoryTable />
            </SmartLoadingWrapper>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SupplierList />

            {/* Activity Feed */}
            <BulletproofActivityList
              loadActivities={loadActivityData}
              title="Recent Activity"
              showFilters={true}
              showStats={true}
              autoRefresh={true}
              refreshInterval={45000}
              maxItems={10}
            />
          </div>
        </div>

        {/* Example Error Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Test Error Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  // This will trigger error boundaries
                  throw new Error('Test error boundary')
                }}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Trigger Error
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Simulate network error
                  resilientFetch.get('/api/nonexistent-endpoint')
                    .catch(() => {
                      // Error will be handled by resilient API
                    })
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Network Error
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Clear all caches to test fresh loading
                  resilientFetch.clearCache()
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HealthMonitorProvider>
  )
}

export default BulletproofDashboardExample