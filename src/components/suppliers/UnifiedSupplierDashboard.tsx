// @ts-nocheck
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierMutations } from '@/hooks/useRealTimeDataFixed';
import { cn, formatCurrency, formatDate, getStatusColor, getTierColor } from '@/lib/utils';
import { getDisplayUrl } from '@/lib/utils/url-validation';
import { SafeLink } from '@/components/ui/SafeLink';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  DollarSign,
  Phone,
  Mail,
  Star,
  BarChart3,
  Activity,
  Globe,
  MapPin,
  Eye,
  Edit,
  Download,
  Upload,
  RefreshCw,
  Search,
  Plus,
  MoreHorizontal,
  ShoppingCart,
  Target,
  Award,
  X,
  Trash2,
  SlidersHorizontal,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Types
interface SupplierMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  totalSpend: number;
  avgRating: number;
  avgOnTimeDelivery: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface SupplierData {
  id: string;
  code: string;
  name: string;
  legalName: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  tier: 'strategic' | 'preferred' | 'approved' | 'conditional';
  category: string;
  subcategory?: string;
  website?: string;
  rating: number;
  onTimeDelivery: number;
  totalSpend: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastContact: Date | null;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  address: {
    city: string;
    country: string;
    full: string;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Transformation function to convert DatabaseSupplier to SupplierData
function transformDatabaseSupplierToSupplierData(dbSupplier: unknown): SupplierData {
  // Generate a risk level based on performance tier
  const getRiskLevel = (performanceTier: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (performanceTier) {
      case 'tier_1':
        return 'low';
      case 'tier_2':
        return 'low';
      case 'tier_3':
        return 'medium';
      case 'unrated':
      default:
        return 'high';
    }
  };

  // Parse address or use defaults
  const parseAddress = (address: string | null) => {
    if (!address) {
      return {
        city: 'Unknown',
        country: 'South Africa',
        full: 'Address not provided',
      };
    }
    // Simple parsing - could be enhanced
    return {
      city: 'Various',
      country: 'South Africa',
      full: address,
    };
  };

  const rawStatus = dbSupplier.status;
  const normalizedStatus =
    typeof rawStatus === 'string' ? rawStatus.toLowerCase() : rawStatus ? 'active' : 'inactive';
  const status: SupplierData['status'] =
    normalizedStatus === 'active' ||
    normalizedStatus === 'inactive' ||
    normalizedStatus === 'pending' ||
    normalizedStatus === 'suspended'
      ? normalizedStatus
      : 'inactive';

  return {
    id: dbSupplier.id,
    code: dbSupplier.supplier_code || 'N/A',
    name: dbSupplier.name,
    companyName: dbSupplier.company_name || dbSupplier.name,
    status,
    tier:
      dbSupplier.performance_tier === 'tier_1'
        ? 'strategic'
        : dbSupplier.performance_tier === 'tier_2'
          ? 'preferred'
          : dbSupplier.performance_tier === 'tier_3'
            ? 'approved'
            : 'conditional',
    category: dbSupplier.primary_category || 'General',
    subcategory: undefined,
    website: dbSupplier.website || undefined,
    rating: parseFloat(dbSupplier.rating) || 0,
    onTimeDelivery: 85, // Default value - could be calculated
    totalSpend: parseFloat(dbSupplier.spend_last_12_months) || 0,
    riskLevel: getRiskLevel(dbSupplier.performance_tier),
    lastContact: null, // Not available in DB
    primaryContact: {
      name: dbSupplier.contact_person || 'Unknown',
      email: dbSupplier.email || '',
      phone: dbSupplier.phone || '',
      role: 'Primary Contact',
    },
    address: parseAddress(dbSupplier.address),
    tags: [],
    createdAt: new Date(dbSupplier.created_at),
    updatedAt: new Date(dbSupplier.updated_at),
  };
}

// Sample data with South African suppliers
const _sampleSuppliers: SupplierData[] = [
  {
    id: 'SUP-001',
    code: 'BKPRC',
    name: 'BK Percussion',
    legalName: 'BK Percussion (Pty) Ltd',
    status: 'active',
    tier: 'strategic',
    category: 'Musical Instruments',
    subcategory: 'Percussion',
    website: 'https://www.bkpercussion.co.za',
    rating: 4.7,
    onTimeDelivery: 94,
    totalSpend: 2850000,
    riskLevel: 'low',
    lastContact: new Date('2024-09-20'),
    primaryContact: {
      name: 'Sarah Mitchell',
      email: 'sarah@bkpercussion.co.za',
      phone: '+27 11 234 5678',
      role: 'Sales Manager',
    },
    address: {
      city: 'Johannesburg',
      country: 'South Africa',
      full: '123 Music Street, Johannesburg, Gauteng 2000',
    },
    tags: ['percussion', 'drums', 'premium', 'professional'],
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-09-20'),
  },
  {
    id: 'SUP-002',
    code: 'BCELEC',
    name: 'BC Electronics',
    legalName: 'BC Electronics (Pty) Ltd',
    status: 'active',
    tier: 'preferred',
    category: 'Electronics',
    subcategory: 'Audio Equipment',
    website: 'https://www.bcelectronics.co.za',
    rating: 4.5,
    onTimeDelivery: 92,
    totalSpend: 1890000,
    riskLevel: 'low',
    lastContact: new Date('2024-09-18'),
    primaryContact: {
      name: 'David Chen',
      email: 'david@bcelectronics.co.za',
      phone: '+27 21 345 6789',
      role: 'Technical Director',
    },
    address: {
      city: 'Cape Town',
      country: 'South Africa',
      full: '456 Tech Avenue, Cape Town, Western Cape 8001',
    },
    tags: ['electronics', 'audio', 'professional', 'broadcast'],
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2024-09-18'),
  },
  {
    id: 'SUP-003',
    code: 'LEGACY',
    name: 'Legacy Brands',
    legalName: 'Legacy Brands (Pty) Ltd',
    status: 'active',
    tier: 'approved',
    category: 'Musical Instruments',
    subcategory: 'Guitars & Amplifiers',
    website: 'https://www.legacybrands.co.za',
    rating: 4.3,
    onTimeDelivery: 89,
    totalSpend: 1250000,
    riskLevel: 'medium',
    lastContact: new Date('2024-09-15'),
    primaryContact: {
      name: 'Mike Rodriguez',
      email: 'mike@legacybrands.co.za',
      phone: '+27 31 456 7890',
      role: 'Sales Director',
    },
    address: {
      city: 'Durban',
      country: 'South Africa',
      full: '789 Guitar Lane, Durban, KwaZulu-Natal 4000',
    },
    tags: ['guitars', 'amplifiers', 'vintage', 'classic'],
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2024-09-15'),
  },
];

// Export functionality
const handleExportSuppliers = async (suppliers: SupplierData[], format: 'csv' | 'xlsx' | 'pdf') => {
  try {
    // Simulate export processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    const data = suppliers.map(supplier => ({
      Code: supplier.code,
      Name: supplier.name,
      'Legal Name': supplier.legalName,
      Status: supplier.status,
      Tier: supplier.tier,
      Category: supplier.category,
      Rating: supplier.rating,
      'On-Time Delivery %': supplier.onTimeDelivery,
      'Total Spend': supplier.totalSpend,
      'Risk Level': supplier.riskLevel,
      'Primary Contact': supplier.primaryContact.name,
      'Contact Email': supplier.primaryContact.email,
      'Contact Phone': supplier.primaryContact.phone,
      Location: supplier.address.full,
      Website: supplier.website || '',
      'Last Contact': supplier.lastContact ? formatDate(supplier.lastContact) : 'Never',
      Created: formatDate(supplier.createdAt),
      Updated: formatDate(supplier.updatedAt),
    }));

    // Convert to CSV format
    if (format === 'csv') {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return true;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Export failed. Please try again.');
  }
};

// Main Component
interface UnifiedSupplierDashboardProps {
  initialTab?: string;
}

const UnifiedSupplierDashboard: React.FC<UnifiedSupplierDashboardProps> = ({
  initialTab = 'overview',
}) => {
  const router = useRouter();
  const {
    suppliers: apiSuppliers,
    loading: suppliersLoading,
    error: suppliersError,
    fetchSuppliers: _fetchSuppliers,
    refresh,
    deleteSupplier: deleteSupplierHook,
  } = useSuppliers();
  const { deleteSupplier: deleteSupplierMutation } = useSupplierMutations();

  // Refetch suppliers when component mounts or when refresh param is present
  useEffect(() => {
    // Check if there's a refresh param in the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refresh')) {
      // Remove the refresh param and refetch
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      refresh();
    }
  }, [refresh]);

  // Fetch supplier activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setActivitiesLoading(true);
        const response = await fetch('/api/activities/recent?limit=20');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Filter for supplier-related activities
            const supplierRelated = result.data.filter(
              (activity: unknown) =>
                activity.entityType === 'supplier' ||
                activity.type?.includes('supplier') ||
                activity.metadata?.category === 'supplier_management'
            );
            setSupplierActivities(supplierRelated.slice(0, 15));
          }
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showFilters, setShowFilters] = useState(false);
  const [, setIsExporting] = useState(false);
  const [supplierActivities, setSupplierActivities] = useState<unknown[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);

  // Convert API suppliers to component format with pagination
  const suppliers = useMemo(() => {
    const transformed = apiSuppliers.map((supplier: unknown) =>
      transformDatabaseSupplierToSupplierData(supplier)
    );
    // Apply pagination to reduce initial data load
    const startIndex = (currentPage - 1) * pageSize;
    return transformed.slice(startIndex, startIndex + pageSize);
  }, [apiSuppliers, currentPage, pageSize]);

  // Legacy code (remove after confirming new transformation works)
  const _legacyTransform = useMemo(() => {
    return apiSuppliers.map((supplier: unknown) => ({
      website: supplier.website || '',
      contactInfo: {
        primaryContact: {
          name: supplier.contact_person || '',
          title: '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          department: '',
        },
        address: {
          street: supplier.address || '',
          city: '',
          state: '',
          postalCode: '',
          country: 'South Africa',
        },
      },
      businessInfo: {
        taxId: supplier.tax_id || '',
        registrationNumber: '',
        foundedYear: 0,
        employeeCount: 0,
        annualRevenue: 0,
        currency: 'ZAR',
      },
      capabilities: {
        products: [],
        services: [],
        certifications: [],
        leadTime: 30,
        minimumOrderValue: 0,
        paymentTerms: supplier.payment_terms || 'Net 30',
      },
      performance: {
        overallRating: parseFloat(supplier.rating) || 0,
        qualityRating: 0,
        deliveryRating: 0,
        serviceRating: 0,
        priceRating: 0,
        onTimeDeliveryRate: 0.9,
        qualityAcceptanceRate: 0.95,
        responseTime: 24,
      },
      financial: {
        creditRating: 'Good',
        creditLimit: 0,
        totalPurchaseValue: parseFloat(supplier.spend_last_12_months) || 0,
        paymentHistory: 'Good',
        riskScore:
          supplier.performance_tier === 'tier_1'
            ? 20
            : supplier.performance_tier === 'tier_2'
              ? 35
              : 60,
      },
      contractInfo: {
        hasActiveContract: false,
        contractExpiry: new Date(),
        preferredSupplier: supplier.preferred_supplier || false,
      },
      tags: [],
      createdAt: new Date(supplier.created_at),
      updatedAt: new Date(supplier.updated_at),
    }));
  }, [apiSuppliers]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo((): SupplierMetrics => {
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const totalSpend = suppliers.reduce((sum, s) => sum + s.totalSpend, 0);
    const avgRating =
      suppliers.length > 0 ? suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length : 0;
    const avgOnTimeDelivery =
      suppliers.length > 0
        ? suppliers.reduce((sum, s) => sum + s.onTimeDelivery, 0) / suppliers.length
        : 0;

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers,
      totalSpend,
      avgRating,
      avgOnTimeDelivery,
      riskDistribution: {
        low: suppliers.filter(s => s.riskLevel === 'low').length,
        medium: suppliers.filter(s => s.riskLevel === 'medium').length,
        high: suppliers.filter(s => s.riskLevel === 'high').length,
        critical: suppliers.filter(s => s.riskLevel === 'critical').length,
      },
    };
  }, [suppliers]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      // Filter out inactive suppliers by default (unless explicitly filtering for inactive)
      if (!statusFilter || statusFilter === 'all') {
        if (supplier.status === 'inactive') {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          supplier.name.toLowerCase().includes(query) ||
          supplier.code.toLowerCase().includes(query) ||
          supplier.category.toLowerCase().includes(query) ||
          supplier.tags.some(tag => tag.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all' && supplier.status !== statusFilter) {
        return false;
      }

      // Tier filter
      if (tierFilter && tierFilter !== 'all' && supplier.tier !== tierFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter && categoryFilter !== 'all' && supplier.category !== categoryFilter) {
        return false;
      }

      // Risk filter
      if (riskFilter && riskFilter !== 'all' && supplier.riskLevel !== riskFilter) {
        return false;
      }

      return true;
    });
  }, [suppliers, searchQuery, statusFilter, tierFilter, categoryFilter, riskFilter]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(apiSuppliers.length / pageSize);

  // Handle export
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true);
    try {
      const suppliersToExport =
        selectedSuppliers.length > 0
          ? suppliers.filter(s => selectedSuppliers.includes(s.id))
          : filteredSuppliers;

      await handleExportSuppliers(suppliersToExport, format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTierFilter('');
    setCategoryFilter('');
    setRiskFilter('');
  };

  // Navigation helpers
  const navigateToNewSupplier = () => {
    router.push('/suppliers/new');
  };

  const navigateToEditSupplier = (supplierId: string) => {
    router.push(`/suppliers/${supplierId}/edit`);
  };

  const handleDeleteSupplier = async (supplierId: string, supplierName: string) => {
    if (
      !confirm(`Are you sure you want to delete "${supplierName}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      // Use the deleteSupplier from useSuppliers hook to ensure local state is updated
      await deleteSupplierHook(supplierId);

      // Also update React Query cache for consistency
      if (deleteSupplierMutation) {
        try {
          await deleteSupplierMutation.mutateAsync(supplierId);
        } catch (e) {
          // If React Query mutation fails, it's ok since the main deletion succeeded
          console.log('React Query cache update skipped:', e);
        }
      }

      // Success notification could be added here if needed
      console.log(`✅ Supplier "${supplierName}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete supplier');
    }
  };

  // Utility functions

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[risk as keyof typeof colors] || colors.low;
  };

  // Handle loading and error states
  if (suppliersLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-2 text-sm">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  if (suppliersError) {
    return (
      <Alert className="mx-auto max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading suppliers: {suppliersError}</AlertDescription>
      </Alert>
    );
  }

  // Debug: show raw data
  if (apiSuppliers && apiSuppliers.length === 0) {
    return (
      <div className="p-4">
        <h2 className="mb-4 text-xl font-bold">Debug Info</h2>
        <p>API Suppliers Length: {apiSuppliers.length}</p>
        <p>Loading: {suppliersLoading ? 'Yes' : 'No'}</p>
        <p>Error: {suppliersError || 'None'}</p>
        <pre className="mt-4 bg-gray-100 p-4 text-sm">{JSON.stringify(apiSuppliers, null, 2)}</pre>
      </div>
    );
  }

  const breadcrumbs = [{ label: 'Supplier Management' }];

  return (
    <AppLayout title="Suppliers" breadcrumbs={breadcrumbs}>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive supplier relationship and performance management
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={navigateToNewSupplier} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Suppliers</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {dashboardMetrics.totalSuppliers}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {dashboardMetrics.activeSuppliers} active
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Building2 className="text-muted-foreground h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Spend</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {formatCurrency(dashboardMetrics.totalSpend)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Avg:{' '}
                      {formatCurrency(
                        dashboardMetrics.totalSpend / dashboardMetrics.totalSuppliers
                      )}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <DollarSign className="text-muted-foreground h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">On-Time Delivery</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {dashboardMetrics.avgOnTimeDelivery.toFixed(1)}%
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">Industry avg: 85%</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Clock className="text-muted-foreground h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Avg Rating</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {dashboardMetrics.avgRating.toFixed(1)}/5
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {dashboardMetrics.riskDistribution.low} low risk
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Star className="text-muted-foreground h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="relative">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="directory">Directory</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Supplier Management Activity */}
              <Card className="bg-card border-border border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="text-muted-foreground h-5 w-5" />
                    Supplier Management Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {activitiesLoading ? (
                    <div className="divide-border divide-y">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="flex animate-pulse items-start gap-2 px-4 py-2.5">
                          <div className="bg-muted mt-0.5 h-6 w-6 shrink-0 rounded" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="bg-muted h-3.5 w-3/4 rounded" />
                            <div className="bg-muted h-3 w-full rounded" />
                            <div className="bg-muted h-2.5 w-1/4 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : supplierActivities.length > 0 ? (
                    <div className="divide-border max-h-[600px] divide-y overflow-y-auto">
                      {supplierActivities.map(activity => {
                        const getActivityIcon = () => {
                          if (activity.type?.includes('upload')) return Upload;
                          if (activity.type?.includes('update')) return RefreshCw;
                          if (activity.type?.includes('order')) return ShoppingCart;
                          if (activity.type?.includes('added')) return Building2;
                          if (activity.type?.includes('price')) return DollarSign;
                          if (activity.type?.includes('inventory')) return Package;
                          return Activity;
                        };
                        const getActivityColor = () => {
                          if (activity.type?.includes('upload'))
                            return 'text-green-600 bg-green-50 border-green-200';
                          if (activity.type?.includes('update'))
                            return 'text-blue-600 bg-blue-50 border-blue-200';
                          if (activity.type?.includes('order'))
                            return 'text-purple-600 bg-purple-50 border-purple-200';
                          if (activity.type?.includes('added'))
                            return 'text-emerald-600 bg-emerald-50 border-emerald-200';
                          if (activity.type?.includes('price'))
                            return 'text-amber-600 bg-amber-50 border-amber-200';
                          if (activity.type?.includes('inventory'))
                            return 'text-indigo-600 bg-indigo-50 border-indigo-200';
                          return 'text-muted-foreground bg-muted border-border';
                        };
                        const Icon = getActivityIcon();
                        const formatTime = (timestamp: string) => {
                          const date = new Date(timestamp);
                          const now = new Date();
                          const diffMs = now.getTime() - date.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          if (diffDays > 0) return `${diffDays}d ago`;
                          if (diffHours > 0) return `${diffHours}h ago`;
                          if (diffMins > 0) return `${diffMins}m ago`;
                          return 'Just now';
                        };
                        const getActivityDetails = () => {
                          const details: string[] = [];
                          if (activity.entityName) {
                            details.push(activity.entityName);
                          }
                          if (activity.metadata?.source) {
                            details.push(`via ${activity.metadata.source}`);
                          }
                          if (activity.priority && activity.priority !== 'low') {
                            details.push(`${activity.priority} priority`);
                          }
                          return details.length > 0 ? details.join(' • ') : null;
                        };
                        return (
                          <div
                            key={activity.id}
                            className="hover:bg-muted/30 flex items-start gap-2 px-4 py-2.5 transition-colors"
                          >
                            <div
                              className={cn(
                                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded',
                                getActivityColor()
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground text-sm leading-tight font-medium">
                                {activity.title || activity.description}
                              </p>
                              {activity.description && activity.title && (
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
                                  {activity.description}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {formatTime(activity.timestamp)}
                                </span>
                                {getActivityDetails() && (
                                  <>
                                    <span className="text-muted-foreground text-xs">•</span>
                                    <span className="text-muted-foreground text-xs">
                                      {getActivityDetails()}
                                    </span>
                                  </>
                                )}
                                {activity.status && activity.status !== 'completed' && (
                                  <>
                                    <span className="text-muted-foreground text-xs">•</span>
                                    <Badge variant="outline" className="h-4 px-1.5 text-xs">
                                      {activity.status}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-8 text-center">
                      <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p className="text-sm">No recent activities</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="bg-card border-border border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="text-muted-foreground h-5 w-5" />
                      Risk Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(dashboardMetrics.riskDistribution).map(([level, count]) => (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn('h-3 w-3 rounded-full', {
                                'bg-green-500': level === 'low',
                                'bg-yellow-500': level === 'medium',
                                'bg-orange-500': level === 'high',
                                'bg-red-500': level === 'critical',
                              })}
                            />
                            <span className="text-sm capitalize">{level} Risk</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{count}</span>
                            <span className="text-muted-foreground text-xs">
                              ({((count / dashboardMetrics.totalSuppliers) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="text-muted-foreground h-5 w-5" />
                      Performance Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex justify-between text-sm">
                          <span>Overall Performance</span>
                          <span>{dashboardMetrics.avgRating.toFixed(1)}/5</span>
                        </div>
                        <Progress value={(dashboardMetrics.avgRating / 5) * 100} className="h-2" />
                      </div>

                      <div>
                        <div className="mb-2 flex justify-between text-sm">
                          <span>On-Time Delivery</span>
                          <span>{dashboardMetrics.avgOnTimeDelivery.toFixed(1)}%</span>
                        </div>
                        <Progress value={dashboardMetrics.avgOnTimeDelivery} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <Card className="bg-card border-border border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="text-muted-foreground h-5 w-5" />
                    Top Performing Suppliers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {suppliers
                      .sort((a, b) => b.rating - a.rating)
                      .slice(0, 3)
                      .map((supplier, index) => (
                        <div
                          key={supplier.id}
                          className="group hover:bg-muted relative flex items-center justify-between rounded-lg border p-4 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'bg-muted flex h-10 w-10 items-center justify-center rounded-full font-bold',
                                index === 0 && 'bg-primary text-primary-foreground',
                                index === 1 && 'bg-muted',
                                index === 2 && 'bg-muted'
                              )}
                            >
                              <span className="text-sm">#{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              <p className="text-muted-foreground text-xs">{supplier.category}</p>
                            </div>
                          </div>
                          <div className="relative z-10 flex items-center gap-3">
                            <Badge variant="outline" className={getTierColor(supplier.tier)}>
                              {supplier.tier.toUpperCase()}
                            </Badge>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-current text-yellow-500" />
                                <span className="font-medium">{supplier.rating}</span>
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {supplier.onTimeDelivery}% on-time
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Directory Tab */}
            <TabsContent value="directory" className="space-y-6">
              {/* Search and Filters */}
              <Card className="bg-card border-border border">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                        <Input
                          placeholder="Search suppliers by name, code, category, or tags..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filters
                        {(statusFilter || tierFilter || categoryFilter || riskFilter) && (
                          <Badge variant="secondary" className="ml-2">
                            Active
                          </Badge>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => refresh()}>
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${suppliersLoading ? 'animate-spin' : ''}`}
                        />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="bg-muted/50 mt-4 space-y-4 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label
                            htmlFor="supplier-status-filter"
                            className="mb-2 block text-sm font-medium"
                          >
                            Status
                          </Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger id="supplier-status-filter">
                              <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="supplier-tier-filter"
                            className="mb-2 block text-sm font-medium"
                          >
                            Tier
                          </Label>
                          <Select value={tierFilter} onValueChange={setTierFilter}>
                            <SelectTrigger id="supplier-tier-filter">
                              <SelectValue placeholder="All tiers" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Tiers</SelectItem>
                              <SelectItem value="strategic">Strategic</SelectItem>
                              <SelectItem value="preferred">Preferred</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="conditional">Conditional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="supplier-category-filter"
                            className="mb-2 block text-sm font-medium"
                          >
                            Category
                          </Label>
                          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger id="supplier-category-filter">
                              <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              <SelectItem value="Musical Instruments">
                                Musical Instruments
                              </SelectItem>
                              <SelectItem value="Electronics">Electronics</SelectItem>
                              <SelectItem value="Technology">Technology</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="supplier-risk-filter"
                            className="mb-2 block text-sm font-medium"
                          >
                            Risk Level
                          </Label>
                          <Select value={riskFilter} onValueChange={setRiskFilter}>
                            <SelectTrigger id="supplier-risk-filter">
                              <SelectValue placeholder="All levels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Levels</SelectItem>
                              <SelectItem value="low">Low Risk</SelectItem>
                              <SelectItem value="medium">Medium Risk</SelectItem>
                              <SelectItem value="high">High Risk</SelectItem>
                              <SelectItem value="critical">Critical Risk</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results Summary */}
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Showing {filteredSuppliers.length} of {suppliers.length} suppliers
                </p>
                {selectedSuppliers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedSuppliers.length} selected</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Selected
                    </Button>
                  </div>
                )}
              </div>

              {/* Suppliers Table */}
              <Card className="bg-card border-border overflow-hidden border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedSuppliers.length === filteredSuppliers.length &&
                              filteredSuppliers.length > 0
                            }
                            onCheckedChange={checked => {
                              if (checked) {
                                setSelectedSuppliers(filteredSuppliers.map(s => s.id));
                              } else {
                                setSelectedSuppliers([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Organization ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Spend</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map(supplier => (
                        <TableRow
                          key={supplier.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={e => {
                            // Don't navigate if clicking on checkbox or dropdown
                            const target = e.target as HTMLElement;
                            if (
                              target.closest('button') ||
                              target.closest('[role="checkbox"]') ||
                              target.closest('[role="menuitem"]')
                            ) {
                              return;
                            }
                            router.push(`/suppliers/${supplier.id}/profile`);
                          }}
                        >
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedSuppliers.includes(supplier.id)}
                              onCheckedChange={checked => {
                                if (checked) {
                                  setSelectedSuppliers([...selectedSuppliers, supplier.id]);
                                } else {
                                  setSelectedSuppliers(
                                    selectedSuppliers.filter(id => id !== supplier.id)
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-semibold">
                                {supplier.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{supplier.name}</p>
                                <p className="text-muted-foreground text-sm">{supplier.code}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-muted-foreground font-mono text-xs">
                              {supplier.orgId || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(supplier.status)}>
                              {String(supplier.status ?? 'inactive').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTierColor(supplier.tier)}>
                              {supplier.tier.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-current text-yellow-500" />
                                <span className="font-medium">{supplier.rating}</span>
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {supplier.onTimeDelivery}% on-time
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{formatCurrency(supplier.totalSpend)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="text-muted-foreground h-3 w-3" />
                              <span>
                                {supplier.address.city}, {supplier.address.country}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn('font-medium', getRiskColor(supplier.riskLevel))}>
                              {supplier.riskLevel.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/suppliers/${supplier.id}/profile`)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => navigateToEditSupplier(supplier.id)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Supplier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Create Order
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Performance Report
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Supplier
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>

                {/* Pagination Controls */}
                <div className="border-border flex items-center justify-between border-t p-4">
                  <div className="text-muted-foreground text-sm">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, filteredSuppliers.length)} of{' '}
                    {filteredSuppliers.length} suppliers
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, Math.ceil(filteredSuppliers.length / pageSize)) },
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="min-w-[32px]"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                      {Math.ceil(filteredSuppliers.length / pageSize) > 5 && (
                        <>
                          <span className="text-muted-foreground px-1">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage(Math.ceil(filteredSuppliers.length / pageSize))
                            }
                            className="min-w-[32px]"
                          >
                            {Math.ceil(filteredSuppliers.length / pageSize)}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(
                          Math.min(Math.ceil(filteredSuppliers.length / pageSize), currentPage + 1)
                        )
                      }
                      disabled={currentPage >= Math.ceil(filteredSuppliers.length / pageSize)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {filteredSuppliers.slice(0, 4).map(supplier => (
                  <Card key={supplier.id} className="bg-card border-border border">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{supplier.name}</span>
                        <Badge variant="outline" className={getTierColor(supplier.tier)}>
                          {supplier.tier.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {supplier.onTimeDelivery}%
                            </div>
                            <div className="text-muted-foreground text-sm">On-Time Delivery</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {supplier.rating}
                            </div>
                            <div className="text-muted-foreground text-sm">Overall Rating</div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Performance Score</span>
                            <span>{supplier.rating}/5</span>
                          </div>
                          <Progress value={(supplier.rating / 5) * 100} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Delivery Performance</span>
                            <span>{supplier.onTimeDelivery}%</span>
                          </div>
                          <Progress value={supplier.onTimeDelivery} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span>Total Spend:</span>
                          <span className="font-medium">{formatCurrency(supplier.totalSpend)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="bg-card border-border border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="text-muted-foreground h-5 w-5" />
                      Spend Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{supplier.name}</span>
                            <span>{formatCurrency(supplier.totalSpend)}</span>
                          </div>
                          <Progress
                            value={(supplier.totalSpend / dashboardMetrics.totalSpend) * 100}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="text-muted-foreground h-5 w-5" />
                      Performance Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{supplier.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current text-yellow-500" />
                              <span className="font-medium">{supplier.rating}</span>
                            </div>
                            <Badge variant="outline" className={getRiskColor(supplier.riskLevel)}>
                              {supplier.riskLevel}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Supplier Detail Modal */}
          {selectedSupplier && (
            <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{selectedSupplier.name} - Details</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToEditSupplier(selectedSupplier.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    Comprehensive supplier information and performance metrics
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="mb-2 border-b pb-2">
                            <div className="text-muted-foreground mb-1 text-xs">
                              Organization ID
                            </div>
                            <div className="font-mono text-xs">{selectedSupplier.orgId || '—'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="text-muted-foreground h-4 w-4" />
                            <span>{selectedSupplier.primaryContact.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="text-muted-foreground h-4 w-4" />
                            <span>{selectedSupplier.primaryContact.phone}</span>
                          </div>
                          {selectedSupplier.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="text-muted-foreground h-4 w-4" />
                              <SafeLink
                                href={selectedSupplier.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                {getDisplayUrl(selectedSupplier.website) ||
                                  selectedSupplier.website}
                                <ExternalLink className="h-3 w-3" />
                              </SafeLink>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="text-muted-foreground h-4 w-4" />
                            <span>{selectedSupplier.address.full}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium">Business Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="mb-2 border-b pb-2">
                            <div className="text-muted-foreground mb-1 text-xs">
                              Organization ID
                            </div>
                            <div className="font-mono text-xs">{selectedSupplier.orgId || '—'}</div>
                          </div>
                          <div>Legal Name: {selectedSupplier.legalName}</div>
                          <div>Category: {selectedSupplier.category}</div>
                          {selectedSupplier.subcategory && (
                            <div>Subcategory: {selectedSupplier.subcategory}</div>
                          )}
                          <div>
                            Risk Level:
                            <span
                              className={cn(
                                'ml-1 font-medium',
                                getRiskColor(selectedSupplier.riskLevel)
                              )}
                            >
                              {selectedSupplier.riskLevel.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            Last Contact:{' '}
                            {selectedSupplier.lastContact
                              ? formatDate(selectedSupplier.lastContact)
                              : 'Never'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedSupplier.rating}/5
                        </div>
                        <div className="text-muted-foreground text-sm">Overall Rating</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedSupplier.onTimeDelivery}%
                        </div>
                        <div className="text-muted-foreground text-sm">On-Time Delivery</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(selectedSupplier.totalSpend)}
                        </div>
                        <div className="text-muted-foreground text-sm">Total Spend</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tags */}
                  {selectedSupplier.tags.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TooltipProvider>
    </AppLayout>
  );
};

export default UnifiedSupplierDashboard;
