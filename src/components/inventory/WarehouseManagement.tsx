'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Warehouse, StockMovement, InventoryLocation } from '@/types/inventory';

import {
  Building2,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Settings,
  Eye,
  Edit,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Search,
  Grid3X3,
  Move,
  Shield,
  Target,
  QrCode,
  ArrowLeftRight,
  ArrowUpDown,
  Archive,
} from 'lucide-react';

// Enhanced Warehouse Types
export interface WarehouseLayout {
  id: string;
  warehouseId: string;
  zones: LayoutZone[];
  totalArea: number;
  usedArea: number;
  capacity: {
    volume: number;
    weight: number;
    pallets: number;
  };
}

export interface LayoutZone {
  id: string;
  name: string;
  code: string;
  coordinates: { x: number; y: number; width: number; height: number };
  type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'quarantine';
  aisles: LayoutAisle[];
  capacity: number;
  utilization: number;
  temperature?: { min: number; max: number; current: number };
  humidity?: { min: number; max: number; current: number };
}

export interface LayoutAisle {
  id: string;
  number: string;
  shelves: LayoutShelf[];
  accessibility: 'walk' | 'forklift' | 'crane';
}

export interface LayoutShelf {
  id: string;
  level: number;
  bins: LayoutBin[];
  maxWeight: number;
  currentWeight: number;
}

export interface LayoutBin {
  id: string;
  code: string;
  coordinates: string;
  status: 'empty' | 'partial' | 'full' | 'reserved' | 'damaged';
  itemId?: string;
  quantity: number;
  capacity: number;
}

export interface StockMovementWithDetails extends StockMovement {
  itemName: string;
  itemSku: string;
  fromLocation?: InventoryLocation;
  toLocation?: InventoryLocation;
  authorizedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Sample warehouse data
const sampleWarehouses: Warehouse[] = [
  {
    id: 'wh_001',
    name: 'Main Distribution Center',
    code: 'MDC',
    type: 'distribution',
    address: {
      addressLine1: '123 Industrial Blvd',
      addressLine2: 'Suite 100',
      city: 'Austin',
      state: 'TX',
      postalCode: '78731',
      country: 'USA',
    },
    manager: 'John Smith',
    capacity: {
      totalSpace: 50000,
      usedSpace: 37500,
      unit: 'sqft',
    },
    zones: [
      {
        id: 'zone_001',
        name: 'Receiving Zone',
        code: 'RCV',
        type: 'receiving',
        temperature: { min: 18, max: 24, unit: 'celsius' },
        humidity: { min: 40, max: 60 },
        aisles: 4,
        isActive: true,
      },
      {
        id: 'zone_002',
        name: 'Electronics Storage',
        code: 'ELC',
        type: 'storage',
        temperature: { min: 20, max: 22, unit: 'celsius' },
        humidity: { min: 45, max: 55 },
        aisles: 12,
        isActive: true,
      },
      {
        id: 'zone_003',
        name: 'Picking Zone A',
        code: 'PKA',
        type: 'picking',
        aisles: 8,
        isActive: true,
      },
      {
        id: 'zone_004',
        name: 'Shipping Dock',
        code: 'SHP',
        type: 'shipping',
        aisles: 2,
        isActive: true,
      },
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'wh_002',
    name: 'Regional Fulfillment Center',
    code: 'RFC',
    type: 'fulfillment',
    address: {
      addressLine1: '456 Commerce Way',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
      country: 'USA',
    },
    manager: 'Lisa Rodriguez',
    capacity: {
      totalSpace: 75000,
      usedSpace: 52500,
      unit: 'sqft',
    },
    zones: [
      {
        id: 'zone_005',
        name: 'Fast Pick Zone',
        code: 'FPZ',
        type: 'picking',
        aisles: 6,
        isActive: true,
      },
      {
        id: 'zone_006',
        name: 'Bulk Storage',
        code: 'BLK',
        type: 'storage',
        aisles: 15,
        isActive: true,
      },
    ],
    isActive: true,
    createdAt: new Date('2024-02-15'),
  },
];

const sampleStockMovements: StockMovementWithDetails[] = [
  {
    id: 'mov_001',
    itemId: 'item_001',
    itemName: 'Dell Laptop XPS 13',
    itemSku: 'DELL-XPS13-001',
    type: 'inbound',
    reason: 'Purchase Order Receipt',
    quantity: 25,
    toLocationId: 'loc_002',
    referenceNumber: 'PO-2024-0892',
    referenceType: 'purchase_order',
    unitCost: 1299.99,
    totalValue: 32499.75,
    performedBy: 'warehouse.clerk@company.com',
    authorizedBy: 'warehouse.manager@company.com',
    timestamp: new Date('2024-09-22T10:30:00'),
    priority: 'medium',
    notes: 'Received in good condition',
  },
  {
    id: 'mov_002',
    itemId: 'item_002',
    itemName: 'USB-C Cable 6ft',
    itemSku: 'USB-C-6FT-001',
    type: 'outbound',
    reason: 'Sales Order Fulfillment',
    quantity: 50,
    fromLocationId: 'loc_003',
    referenceNumber: 'SO-2024-1456',
    referenceType: 'sales_order',
    unitCost: 24.99,
    totalValue: 1249.5,
    performedBy: 'picker.jane@company.com',
    authorizedBy: 'supervisor.mike@company.com',
    timestamp: new Date('2024-09-22T14:15:00'),
    priority: 'high',
    notes: 'Express shipping required',
  },
  {
    id: 'mov_003',
    itemId: 'item_003',
    itemName: 'Wireless Mouse',
    itemSku: 'WMS-001',
    type: 'transfer',
    reason: 'Zone Optimization',
    quantity: 15,
    fromLocationId: 'loc_004',
    toLocationId: 'loc_005',
    unitCost: 45.99,
    totalValue: 689.85,
    performedBy: 'operator.sam@company.com',
    authorizedBy: 'warehouse.manager@company.com',
    timestamp: new Date('2024-09-22T16:45:00'),
    priority: 'low',
    notes: 'Moving to high-velocity zone',
  },
];

interface WarehouseManagementProps {
  onWarehouseSelect?: (warehouse: Warehouse) => void;
}

const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ onWarehouseSelect }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(sampleWarehouses);
  const [stockMovements, setStockMovements] =
    useState<StockMovementWithDetails[]>(sampleStockMovements);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [movementFilter, setMovementFilter] = useState<string>('');
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);

  // Calculate warehouse metrics
  const warehouseMetrics = useMemo(() => {
    const totalWarehouses = warehouses.length;
    const activeWarehouses = warehouses.filter(w => w.isActive).length;
    const totalCapacity = warehouses.reduce((sum, w) => sum + w.capacity.totalSpace, 0);
    const totalUsed = warehouses.reduce((sum, w) => sum + w.capacity.usedSpace, 0);
    const utilizationRate = (totalUsed / totalCapacity) * 100;

    const todayMovements = stockMovements.filter(
      m => new Date(m.timestamp).toDateString() === new Date().toDateString()
    ).length;

    return {
      totalWarehouses,
      activeWarehouses,
      totalCapacity,
      totalUsed,
      utilizationRate,
      todayMovements,
      totalZones: warehouses.reduce((sum, w) => sum + w.zones.length, 0),
    };
  }, [warehouses, stockMovements]);

  // Filter stock movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter(movement => {
      const matchesSearch =
        searchQuery === '' ||
        movement.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.itemSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = movementFilter === '' || movement.type === movementFilter;

      return matchesSearch && matchesFilter;
    });
  }, [stockMovements, searchQuery, movementFilter]);

  const getTypeColor = (type: string): string => {
    const colors = {
      inbound: 'bg-green-100 text-green-800 border-green-200',
      outbound: 'bg-red-100 text-red-800 border-red-200',
      transfer: 'bg-blue-100 text-blue-800 border-blue-200',
      adjustment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return colors[type as keyof typeof colors] || colors.adjustment;
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getWarehouseTypeIcon = (type: string) => {
    const icons = {
      main: <Building2 className="h-5 w-5" />,
      distribution: <Package className="h-5 w-5" />,
      fulfillment: <Activity className="h-5 w-5" />,
      transit: <Move className="h-5 w-5" />,
      consignment: <ArrowLeftRight className="h-5 w-5" />,
    };
    return icons[type as keyof typeof icons] || icons.main;
  };

  const getZoneTypeIcon = (type: string) => {
    const icons = {
      receiving: <Download className="h-4 w-4" />,
      storage: <Archive className="h-4 w-4" />,
      picking: <Target className="h-4 w-4" />,
      packing: <Package className="h-4 w-4" />,
      shipping: <Upload className="h-4 w-4" />,
      quarantine: <Shield className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || icons.storage;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage warehouse operations, stock movements, and locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMovementDialog(true)}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Stock Movement
          </Button>
          <Button size="sm" onClick={() => setShowWarehouseDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Active Warehouses</p>
                    <p className="text-2xl font-bold">{warehouseMetrics.activeWarehouses}</p>
                    <p className="text-muted-foreground text-xs">
                      of {warehouseMetrics.totalWarehouses} total
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Capacity Utilization</p>
                    <p className="text-2xl font-bold">
                      {warehouseMetrics.utilizationRate.toFixed(1)}%
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {warehouseMetrics.totalUsed.toLocaleString()} /{' '}
                      {warehouseMetrics.totalCapacity.toLocaleString()} sqft
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Today&apos;s Movements</p>
                    <p className="text-2xl font-bold">{warehouseMetrics.todayMovements}</p>
                    <p className="text-muted-foreground text-xs">stock transactions</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Zones</p>
                    <p className="text-2xl font-bold">{warehouseMetrics.totalZones}</p>
                    <p className="text-muted-foreground text-xs">across all warehouses</p>
                  </div>
                  <Grid3X3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warehouse Status Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {warehouses.map(warehouse => (
              <Card
                key={warehouse.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedWarehouse(warehouse)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getWarehouseTypeIcon(warehouse.type)}
                      {warehouse.name}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        warehouse.isActive
                          ? 'border-green-300 text-green-700'
                          : 'border-red-300 text-red-700'
                      }
                    >
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Capacity Utilization</span>
                        <span>
                          {(
                            (warehouse.capacity.usedSpace / warehouse.capacity.totalSpace) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={(warehouse.capacity.usedSpace / warehouse.capacity.totalSpace) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Manager</p>
                        <p className="font-medium">{warehouse.manager}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Zones</p>
                        <p className="font-medium">{warehouse.zones.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {warehouse.address.city}, {warehouse.address.state}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {warehouse.zones.slice(0, 3).map(zone => (
                        <Badge key={zone.id} variant="secondary" className="text-xs">
                          {zone.name}
                        </Badge>
                      ))}
                      {warehouse.zones.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{warehouse.zones.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stockMovements.slice(0, 5).map(movement => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn('rounded-lg p-2', {
                          'bg-green-100': movement.type === 'inbound',
                          'bg-red-100': movement.type === 'outbound',
                          'bg-blue-100': movement.type === 'transfer',
                          'bg-yellow-100': movement.type === 'adjustment',
                        })}
                      >
                        {movement.type === 'inbound' && (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                        {movement.type === 'outbound' && (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        {movement.type === 'transfer' && (
                          <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                        )}
                        {movement.type === 'adjustment' && (
                          <Settings className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{movement.itemName}</p>
                        <p className="text-muted-foreground text-sm">
                          {movement.reason} • {movement.quantity} units
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getTypeColor(movement.type)}>
                        {movement.type.toUpperCase()}
                      </Badge>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDate(movement.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Zones</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map(warehouse => (
                    <TableRow key={warehouse.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                            {getWarehouseTypeIcon(warehouse.type)}
                          </div>
                          <div>
                            <div className="font-medium">{warehouse.name}</div>
                            <div className="text-muted-foreground text-sm">{warehouse.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {warehouse.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{warehouse.manager}</TableCell>
                      <TableCell>
                        {warehouse.capacity.totalSpace.toLocaleString()} {warehouse.capacity.unit}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>
                              {(
                                (warehouse.capacity.usedSpace / warehouse.capacity.totalSpace) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              (warehouse.capacity.usedSpace / warehouse.capacity.totalSpace) * 100
                            }
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{warehouse.zones.length}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            warehouse.isActive
                              ? 'border-green-300 text-green-700'
                              : 'border-red-300 text-red-700'
                          }
                        >
                          {warehouse.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedWarehouse(warehouse)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                    <Input
                      placeholder="Search movements by item, SKU, or reason..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={movementFilter} onValueChange={setMovementFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movements Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>From/To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.itemName}</div>
                          <div className="text-muted-foreground text-sm">{movement.itemSku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeColor(movement.type)}>
                          {movement.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{movement.quantity} units</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movement.type === 'inbound' && (
                            <span className="text-green-600">
                              → {movement.toLocationId || 'Unknown'}
                            </span>
                          )}
                          {movement.type === 'outbound' && (
                            <span className="text-red-600">
                              {movement.fromLocationId || 'Unknown'} →
                            </span>
                          )}
                          {movement.type === 'transfer' && (
                            <span className="text-blue-600">
                              {movement.fromLocationId} → {movement.toLocationId}
                            </span>
                          )}
                          {movement.type === 'adjustment' && (
                            <span className="text-yellow-600">Adjustment</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-32 truncate">{movement.reason}</div>
                      </TableCell>
                      <TableCell>
                        {movement.totalValue ? formatCurrency(movement.totalValue) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-medium', getPriorityColor(movement.priority))}>
                          {movement.priority.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(movement.timestamp)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{movement.performedBy.split('@')[0]}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          {selectedWarehouse ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedWarehouse.name} Layout</h3>
                  <p className="text-muted-foreground">Interactive warehouse floor plan</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedWarehouse(null)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  View All Warehouses
                </Button>
              </div>

              {/* Zone Details */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedWarehouse.zones.map(zone => (
                  <Card key={zone.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {getZoneTypeIcon(zone.type)}
                        {zone.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Code:</span>
                          <span className="font-medium">{zone.code}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Type:</span>
                          <span className="font-medium capitalize">{zone.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Aisles:</span>
                          <span className="font-medium">{zone.aisles}</span>
                        </div>
                        {zone.temperature && (
                          <div className="flex justify-between text-sm">
                            <span>Temperature:</span>
                            <span className="font-medium">
                              {zone.temperature.min}°-{zone.temperature.max}°C
                            </span>
                          </div>
                        )}
                        {zone.humidity && (
                          <div className="flex justify-between text-sm">
                            <span>Humidity:</span>
                            <span className="font-medium">
                              {zone.humidity.min}%-{zone.humidity.max}%
                            </span>
                          </div>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            zone.isActive
                              ? 'border-green-300 text-green-700'
                              : 'border-red-300 text-red-700'
                          }
                        >
                          {zone.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Visual Layout */}
              <Card>
                <CardHeader>
                  <CardTitle>Visual Layout</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
                    <div className="text-muted-foreground text-center">
                      <Grid3X3 className="mx-auto mb-4 h-16 w-16 opacity-50" />
                      <p className="text-lg font-medium">Interactive 3D Layout</p>
                      <p className="text-sm">Visual warehouse layout with real-time zone status</p>
                      <p className="mt-2 text-xs">Feature coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {warehouses.map(warehouse => (
                <Card
                  key={warehouse.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedWarehouse(warehouse)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getWarehouseTypeIcon(warehouse.type)}
                      {warehouse.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="py-8 text-center">
                      <Grid3X3 className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                      <p className="font-medium">View Layout</p>
                      <p className="text-muted-foreground text-sm">
                        {warehouse.zones.length} zones •{' '}
                        {warehouse.capacity.totalSpace.toLocaleString()} {warehouse.capacity.unit}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Movement Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['inbound', 'outbound', 'transfer', 'adjustment'].map(type => {
                    const count = stockMovements.filter(m => m.type === type).length;
                    const percentage = (count / stockMovements.length) * 100;
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{type}</span>
                          <span>
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warehouse Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {warehouses.map(warehouse => {
                    const utilization =
                      (warehouse.capacity.usedSpace / warehouse.capacity.totalSpace) * 100;
                    return (
                      <div key={warehouse.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{warehouse.name}</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <Progress value={utilization} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WarehouseManagement;
