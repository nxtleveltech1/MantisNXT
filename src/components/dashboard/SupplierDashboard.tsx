'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  Plus,
  Search,
  MoreHorizontal,
  Download,
  CheckCircle,
  XCircle,
  Activity,
  Star,
  Edit,
  Eye,
  Trash2,
  Settings,
  Upload
} from 'lucide-react';
import { cn } from '../../lib/utils';
import * as RechartsPrimitive from 'recharts';
import { DashboardMetrics, DashboardActivity, Supplier } from '../../types/supplier';

// Chart utilities
const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  );
};

// Badge component
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-transparent bg-primary text-primary-foreground': variant === 'default',
            'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
            'border-transparent bg-green-500 text-white': variant === 'success',
            'border-transparent bg-yellow-500 text-white': variant === 'warning',
            'border-transparent bg-destructive text-destructive-foreground': variant === 'destructive',
            'text-foreground': variant === 'outline',
          },
          {
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-2.5 py-0.5 text-xs': size === 'md',
            'px-3 py-1 text-sm': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

// Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'text-primary underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// Card components
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

// Dashboard Props
interface SupplierDashboardProps {
  metrics?: DashboardMetrics;
  activities?: DashboardActivity[];
  suppliers?: Supplier[];
  onAddSupplier?: () => void;
  onViewSupplier?: (supplier: Supplier) => void;
  onEditSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplier: Supplier) => void;
}

// Default sample data
const defaultMetrics: DashboardMetrics = {
  totalSuppliers: 247,
  activeSuppliers: 189,
  pendingApprovals: 12,
  contractsExpiringSoon: 8,
  avgPerformanceRating: 4.2,
  totalPurchaseValue: 1250000,
  onTimeDeliveryRate: 94.5,
  qualityAcceptanceRate: 97.8,
};

const defaultActivities: DashboardActivity[] = [
  {
    id: '1',
    type: 'supplier_added',
    title: 'New Supplier Added',
    description: 'TechCorp Solutions has been added to the system',
    supplierName: 'TechCorp Solutions',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    priority: 'medium',
    status: 'completed',
  },
  {
    id: '2',
    type: 'order_placed',
    title: 'Purchase Order Created',
    description: 'New order #PO-12345 placed for $15,000',
    supplierName: 'Global Manufacturing',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    priority: 'high',
    status: 'processing',
  },
  {
    id: '3',
    type: 'payment_made',
    title: 'Payment Processed',
    description: 'Payment of $8,500 processed successfully',
    supplierName: 'Premium Logistics',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    priority: 'low',
    status: 'completed',
  },
  {
    id: '4',
    type: 'delivery_received',
    title: 'Delivery Completed',
    description: 'Order #PO-12340 delivered successfully',
    supplierName: 'Quality Materials',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    priority: 'medium',
    status: 'completed',
  },
];

const defaultSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'TechCorp Solutions',
    code: 'TECH001',
    status: 'active',
    tier: 'strategic',
    category: 'Technology',
    subcategory: 'Software',
    tags: ['AI', 'Cloud', 'SaaS'],
    contacts: [],
    addresses: [],
    businessInfo: {
      legalName: 'TechCorp Solutions Inc.',
      taxId: '12-3456789',
      registrationNumber: 'TC123456',
      currency: 'USD',
    },
    capabilities: {
      products: ['Software Development', 'Cloud Services'],
      services: ['Consulting', 'Support'],
      certifications: [],
      leadTime: 30,
      paymentTerms: 'Net 30',
    },
    performance: {
      overallRating: 4.8,
      qualityRating: 4.9,
      deliveryRating: 4.7,
      serviceRating: 4.8,
      priceRating: 4.6,
      metrics: {
        onTimeDeliveryRate: 96.5,
        qualityAcceptanceRate: 98.2,
        responseTime: 2.5,
        defectRate: 1.8,
        leadTimeVariance: 5.2,
      },
      kpis: [],
      lastEvaluationDate: new Date(),
      nextEvaluationDate: new Date(),
    },
    financial: {
      creditRating: 'A+',
      paymentTerms: 'Net 30',
      currency: 'USD',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
];

const performanceData = [
  { month: 'Jan', orders: 120, revenue: 85000, satisfaction: 4.2 },
  { month: 'Feb', orders: 135, revenue: 92000, satisfaction: 4.3 },
  { month: 'Mar', orders: 148, revenue: 98000, satisfaction: 4.4 },
  { month: 'Apr', orders: 162, revenue: 105000, satisfaction: 4.5 },
  { month: 'May', orders: 178, revenue: 112000, satisfaction: 4.6 },
  { month: 'Jun', orders: 195, revenue: 125000, satisfaction: 4.7 }
];

const chartConfig = {
  orders: {
    label: 'Orders',
    color: 'hsl(var(--chart-1))',
  },
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-2))',
  },
  satisfaction: {
    label: 'Satisfaction',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

// Main Dashboard Component
export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  metrics = defaultMetrics,
  activities = defaultActivities,
  suppliers = defaultSuppliers,
  onAddSupplier,
  onViewSupplier,
  onEditSupplier,
  onDeleteSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending' | 'suspended'>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const kpis = [
    {
      title: 'Total Suppliers',
      value: metrics.totalSuppliers.toLocaleString(),
      change: 12,
      trend: 'up' as const,
      icon: Users
    },
    {
      title: 'Active Suppliers',
      value: metrics.activeSuppliers.toLocaleString(),
      change: 8,
      trend: 'up' as const,
      icon: Package
    },
    {
      title: 'Monthly Spend',
      value: `$${(metrics.totalPurchaseValue / 1000).toFixed(0)}K`,
      change: -3,
      trend: 'down' as const,
      icon: DollarSign
    },
    {
      title: 'Pending Approvals',
      value: metrics.pendingApprovals.toString(),
      change: -25,
      trend: 'down' as const,
      icon: AlertTriangle
    }
  ];

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactive</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_placed':
        return <Package className="h-4 w-4" />;
      case 'payment_made':
        return <DollarSign className="h-4 w-4" />;
      case 'delivery_received':
        return <CheckCircle className="h-4 w-4" />;
      case 'supplier_added':
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Management Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your suppliers, track performance, and monitor activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={onAddSupplier}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className="flex items-center mt-2">
                    {kpi.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      kpi.trend === 'up' ? "text-green-600" : "text-red-600"
                    )}>
                      {Math.abs(kpi.change)}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <kpi.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Suppliers</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search suppliers..."
                      className="pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      onViewSupplier?.(supplier);
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {supplier.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{supplier.name}</h4>
                        <p className="text-sm text-muted-foreground">{supplier.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{supplier.code}</p>
                        <p className="text-xs text-muted-foreground">{supplier.tier}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm">{supplier.performance.overallRating}</span>
                      </div>
                      {getStatusBadge(supplier.status)}
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      getActivityColor(activity.priority),
                      "bg-current/10"
                    )}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <RechartsPrimitive.LineChart data={performanceData}>
              <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
              <RechartsPrimitive.XAxis dataKey="month" />
              <RechartsPrimitive.YAxis />
              <RechartsPrimitive.Tooltip />
              <RechartsPrimitive.Line
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                strokeWidth={2}
              />
              <RechartsPrimitive.Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
            </RechartsPrimitive.LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" onClick={onAddSupplier}>
              <Plus className="h-6 w-6 mb-2" />
              Add Supplier
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Upload className="h-6 w-6 mb-2" />
              Import Data
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Eye className="h-6 w-6 mb-2" />
              View Reports
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedSupplier.name}</CardTitle>
                  <p className="text-muted-foreground">{selectedSupplier.category}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedSupplier(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedSupplier.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                    <span>{selectedSupplier.performance.overallRating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tier</p>
                  <p className="text-lg font-semibold capitalize">{selectedSupplier.tier}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code</p>
                  <p className="text-lg font-semibold">{selectedSupplier.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Legal Name</p>
                  <p>{selectedSupplier.businessInfo.legalName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                  <p>{selectedSupplier.businessInfo.taxId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onEditSupplier?.(selectedSupplier)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Supplier
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Orders
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDeleteSupplier?.(selectedSupplier)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;