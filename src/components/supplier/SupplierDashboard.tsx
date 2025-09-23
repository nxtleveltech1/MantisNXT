"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency, formatPercentage, getStatusColor, getTierColor } from "@/lib/utils";
import {
  Supplier,
  DashboardMetrics,
  DashboardActivity
} from "@/types/supplier";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Award,
  BarChart3,
  Settings,
  Building2,
  FileText,
  Target,
  Activity
} from "lucide-react";

// Sample data - in a real app, this would come from an API
const sampleSuppliers: Supplier[] = [
  {
    id: "1",
    code: "TECH001",
    status: "active",
    tier: "strategic",
    category: "Technology",
    tags: ["preferred", "enterprise"],

    contacts: [{
      id: "c1",
      type: "primary",
      name: "John Smith",
      title: "Account Manager",
      email: "john@techcorp.com",
      phone: "+1-555-0123",
      isPrimary: true,
      isActive: true
    }],

    addresses: [{
      id: "a1",
      type: "headquarters",
      addressLine1: "123 Tech Street",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "USA",
      isPrimary: true,
      isActive: true
    }],

    businessInfo: {
      legalName: "TechCorp Solutions Inc",
      tradingName: "TechCorp",
      taxId: "12-3456789",
      registrationNumber: "REG123456",
      website: "https://techcorp.com",
      foundedYear: 2010,
      employeeCount: 250,
      annualRevenue: 50000000,
      currency: "USD"
    },

    capabilities: {
      products: ["Software Development", "Cloud Services"],
      services: ["Consulting", "Support"],
      certifications: [],
      leadTime: 30,
      paymentTerms: "Net 30"
    },

    performance: {
      overallRating: 4.8,
      qualityRating: 4.9,
      deliveryRating: 4.7,
      serviceRating: 4.8,
      priceRating: 4.6,
      metrics: {
        onTimeDeliveryRate: 95,
        qualityAcceptanceRate: 98,
        responseTime: 2,
        defectRate: 1.5,
        leadTimeVariance: 5
      },
      kpis: [],
      lastEvaluationDate: new Date("2024-01-15"),
      nextEvaluationDate: new Date("2024-07-15")
    },

    financial: {
      creditRating: "A",
      paymentTerms: "Net 30",
      currency: "USD"
    },

    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-18")
  },
  {
    id: "2",
    code: "MANUF001",
    status: "active",
    tier: "preferred",
    category: "Manufacturing",
    tags: ["reliable"],

    contacts: [{
      id: "c2",
      type: "primary",
      name: "Sarah Johnson",
      title: "Operations Manager",
      email: "sarah@globalmanuf.com",
      phone: "+1-555-0124",
      isPrimary: true,
      isActive: true
    }],

    addresses: [{
      id: "a2",
      type: "headquarters",
      addressLine1: "456 Industrial Blvd",
      city: "Detroit",
      state: "MI",
      postalCode: "48201",
      country: "USA",
      isPrimary: true,
      isActive: true
    }],

    businessInfo: {
      legalName: "Global Manufacturing Inc",
      tradingName: "Global Manuf",
      taxId: "98-7654321",
      registrationNumber: "REG789012",
      website: "https://globalmanuf.com",
      foundedYear: 1995,
      employeeCount: 500,
      annualRevenue: 120000000,
      currency: "USD"
    },

    capabilities: {
      products: ["Components", "Assembly"],
      services: ["Manufacturing", "Quality Control"],
      certifications: [],
      leadTime: 45,
      paymentTerms: "Net 45"
    },

    performance: {
      overallRating: 4.5,
      qualityRating: 4.6,
      deliveryRating: 4.3,
      serviceRating: 4.5,
      priceRating: 4.6,
      metrics: {
        onTimeDeliveryRate: 88,
        qualityAcceptanceRate: 94,
        responseTime: 4,
        defectRate: 2.8,
        leadTimeVariance: 12
      },
      kpis: [],
      lastEvaluationDate: new Date("2024-01-10"),
      nextEvaluationDate: new Date("2024-07-10")
    },

    financial: {
      creditRating: "B+",
      paymentTerms: "Net 45",
      currency: "USD"
    },

    createdAt: new Date("2022-06-20"),
    updatedAt: new Date("2024-01-15"),
    createdBy: "admin",
    lastContactDate: new Date("2024-01-12")
  }
];

const sampleActivities: DashboardActivity[] = [
  {
    id: "1",
    type: "contract_signed",
    title: "Contract Renewed",
    description: "TechCorp Solutions contract renewal completed",
    supplierId: "1",
    supplierName: "TechCorp Solutions",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    priority: "medium",
    status: "completed"
  },
  {
    id: "2",
    type: "delivery_received",
    title: "Delivery Delayed",
    description: "Global Manufacturing delivery delayed - investigating",
    supplierId: "2",
    supplierName: "Global Manufacturing Inc",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    priority: "high",
    status: "pending"
  }
];

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: "up" | "down";
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = "up",
  color = "blue"
}) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    yellow: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  trend === "up" ? "text-green-600" : "text-red-600"
                )}>
                  {change > 0 ? "+" : ""}{change}%
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-full", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ActivityFeed: React.FC<{ activities: DashboardActivity[] }> = ({ activities }) => {
  const getActivityIcon = (type: DashboardActivity["type"]) => {
    switch (type) {
      case "contract_signed": return <FileText className="h-4 w-4" />;
      case "delivery_received": return <Truck className="h-4 w-4" />;
      case "payment_made": return <DollarSign className="h-4 w-4" />;
      case "performance_review": return <Star className="h-4 w-4" />;
      case "supplier_added": return <Building2 className="h-4 w-4" />;
      case "order_placed": return <Package className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (priority: DashboardActivity["priority"]) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className={cn("p-2 rounded-full border", getStatusColor(activity.priority))}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.supplierName}</p>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SuppliersTable: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Top Performing Suppliers</span>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>On-time Delivery</TableHead>
              <TableHead>Quality Score</TableHead>
              <TableHead>Last Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.slice(0, 5).map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{supplier.businessInfo.tradingName || supplier.businessInfo.legalName}</div>
                      <div className="text-sm text-muted-foreground">{supplier.category}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn("capitalize", getStatusColor(supplier.status))}
                    variant="outline"
                  >
                    {supplier.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn("capitalize", getTierColor(supplier.tier))}
                    variant="outline"
                  >
                    {supplier.tier}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{supplier.performance.overallRating.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell>{formatPercentage(supplier.performance.metrics.onTimeDeliveryRate)}</TableCell>
                <TableCell>{formatPercentage(supplier.performance.metrics.qualityAcceptanceRate)}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {supplier.lastContactDate ?
                      new Date(supplier.lastContactDate).toLocaleDateString() :
                      'Never'
                    }
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const QuickActions: React.FC = () => {
  const actions = [
    {
      icon: <Plus className="h-4 w-4" />,
      label: "Add Supplier",
      color: "bg-blue-600 hover:bg-blue-700",
      onClick: () => console.log("Add Supplier")
    },
    {
      icon: <Search className="h-4 w-4" />,
      label: "Search",
      color: "bg-green-600 hover:bg-green-700",
      onClick: () => console.log("Search")
    },
    {
      icon: <Filter className="h-4 w-4" />,
      label: "Filter",
      color: "bg-yellow-600 hover:bg-yellow-700",
      onClick: () => console.log("Filter")
    },
    {
      icon: <Download className="h-4 w-4" />,
      label: "Export",
      color: "bg-purple-600 hover:bg-purple-700",
      onClick: () => console.log("Export")
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            className={cn("rounded-full w-12 h-12 p-0 text-white shadow-lg", action.color)}
            title={action.label}
            onClick={action.onClick}
          >
            {action.icon}
          </Button>
        ))}
      </div>
    </div>
  );
};

const SupplierDashboard: React.FC = () => {
  const [suppliers] = useState<Supplier[]>(sampleSuppliers);
  const [activities] = useState<DashboardActivity[]>(sampleActivities);

  // Calculate dashboard metrics
  const metrics = useMemo((): DashboardMetrics => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.status === "active").length;
    const pendingApprovals = suppliers.filter(s => s.status === "pending").length;

    // Contract expirations - would need actual contract data
    const contractsExpiringSoon = 2; // Mock data

    const avgPerformanceRating = suppliers.length > 0 ?
      suppliers.reduce((sum, s) => sum + s.performance.overallRating, 0) / suppliers.length : 0;

    // Mock total purchase value
    const totalPurchaseValue = 8500000;

    const onTimeDeliveryRate = suppliers.length > 0 ?
      suppliers.reduce((sum, s) => sum + s.performance.metrics.onTimeDeliveryRate, 0) / suppliers.length : 0;

    const qualityAcceptanceRate = suppliers.length > 0 ?
      suppliers.reduce((sum, s) => sum + s.performance.metrics.qualityAcceptanceRate, 0) / suppliers.length : 0;

    return {
      totalSuppliers,
      activeSuppliers,
      pendingApprovals,
      contractsExpiringSoon,
      avgPerformanceRating,
      totalPurchaseValue,
      onTimeDeliveryRate,
      qualityAcceptanceRate
    };
  }, [suppliers]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Management Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage your supplier relationships and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Last 30 days
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Primary Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Suppliers"
            value={metrics.totalSuppliers}
            change={8}
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Active Suppliers"
            value={metrics.activeSuppliers}
            change={5}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Pending Approvals"
            value={metrics.pendingApprovals}
            change={-2}
            trend="down"
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Contracts Expiring Soon"
            value={metrics.contractsExpiringSoon}
            change={1}
            icon={<AlertTriangle className="h-6 w-6" />}
            color="red"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Average Performance"
            value={`${metrics.avgPerformanceRating.toFixed(1)}/5.0`}
            change={3}
            icon={<Star className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Total Purchase Value"
            value={formatCurrency(metrics.totalPurchaseValue)}
            change={15}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="On-time Delivery Rate"
            value={formatPercentage(metrics.onTimeDeliveryRate)}
            change={2}
            icon={<Truck className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Quality Acceptance Rate"
            value={formatPercentage(metrics.qualityAcceptanceRate)}
            change={4}
            icon={<Award className="h-6 w-6" />}
            color="purple"
          />
        </div>

        {/* Activity Feed and Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Performance charts would be integrated here with a charting library like Recharts
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <ActivityFeed activities={activities} />
          </div>
        </div>

        {/* Suppliers Table */}
        <SuppliersTable suppliers={suppliers} />

        {/* Quick Actions Floating Button */}
        <QuickActions />
      </div>
    </div>
  );
};

export default SupplierDashboard;