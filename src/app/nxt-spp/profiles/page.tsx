'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Package,
  FileText,
  Settings,
  Plus,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Shield,
  ArrowLeft,
  CheckSquare,
  Edit3,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  MapPin,
  Star,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  getSupplierProfile,
  updateSupplierProfileClient,
  getSupplierRulesClient,
} from '@/lib/api/supplier-profiles-client';
import { getSupplierById, getSuppliers } from '@/lib/api/suppliers-client';
import type { SupplierProfile, SupplierRule } from '@/lib/cmm/supplier-rules-engine';
import type { Supplier } from '@/types/supplier';

interface SupplierRuleSnake {
  id: number;
  supplier_id: string;
  rule_name: string;
  rule_type: string;
  trigger_event: string;
  execution_order: number;
  rule_config: Record<string, unknown>;
  error_message_template?: string;
  is_blocking: boolean;
}

type NormalizedRule = SupplierRule & {
  ruleName: string;
  ruleType: string;
  executionOrder: number;
  isBlocking: boolean;
  ruleConfig: Record<string, unknown>;
};

interface ProfileData {
  guidelines: {
    inventory_management?: {
      auto_approve?: boolean;
      validation_required?: boolean;
      max_upload_size?: number;
    };
    pricing?: {
      currency?: string;
      tax_inclusive?: boolean;
      markup_percentage?: number;
      discount_percentage?: number;
    };
    business_rules?: {
      minimum_order_value?: number;
      payment_terms?: string;
      delivery_timeframe?: string;
    };
  };
  processingConfig: {
    upload_validation?: {
      required_fields?: string[];
      price_range?: { min: number; max: number };
      file_formats?: string[];
    };
    transformation_rules?: {
      auto_format?: boolean;
      standardize_names?: boolean;
      currency_conversion?: boolean;
    };
  };
  qualityStandards: {
    quality_checks?: {
      duplicate_detection?: boolean;
      price_validation?: boolean;
      data_completeness?: number;
      image_requirements?: boolean;
    };
    approval_workflow?: {
      tier_1_required?: boolean;
      tier_2_required?: boolean;
      auto_approve_threshold?: number;
    };
  };
  complianceRules: {
    business_rules?: {
      supplier_certification_required?: boolean;
      tax_compliance_required?: boolean;
      environmental_standards?: boolean;
    };
    regulatory?: {
      requires_approval?: boolean;
      restricted_categories?: string[];
    };
  };
}

function normalizeRule(rule: SupplierRule | SupplierRuleSnake): NormalizedRule {
  return {
    id: rule.id,
    supplierId: 'supplierId' in rule ? rule.supplierId : rule.supplier_id,
    ruleName: 'ruleName' in rule ? rule.ruleName : rule.rule_name,
    ruleType: 'ruleType' in rule ? rule.ruleType : rule.rule_type,
    triggerEvent: 'triggerEvent' in rule ? rule.triggerEvent : rule.trigger_event,
    executionOrder: 'executionOrder' in rule ? rule.executionOrder : rule.execution_order,
    ruleConfig: 'ruleConfig' in rule ? rule.ruleConfig : rule.rule_config,
    errorMessageTemplate:
      'errorMessageTemplate' in rule ? rule.errorMessageTemplate : rule.error_message_template,
    isBlocking: 'isBlocking' in rule ? rule.isBlocking : rule.is_blocking,
  };
}

function SupplierProfilesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const supplierId = searchParams?.get('supplier_id');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [rules, setRules] = useState<SupplierRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSupplierId, setNoSupplierId] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'code' | 'status' | 'tier'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state for editing
  const [formData, setFormData] = useState<ProfileData>({
    guidelines: {
      inventory_management: {
        auto_approve: false,
        validation_required: true,
        max_upload_size: 50,
      },
      pricing: {
        currency: 'ZAR',
        tax_inclusive: false,
        markup_percentage: 0,
        discount_percentage: 0,
      },
      business_rules: {
        minimum_order_value: 0,
        payment_terms: 'Net 30',
        delivery_timeframe: '7-14 days',
      },
    },
    processingConfig: {
      upload_validation: {
        required_fields: ['sku', 'name', 'price'],
        price_range: { min: 0, max: 100000 },
        file_formats: ['csv', 'xlsx'],
      },
      transformation_rules: {
        auto_format: true,
        standardize_names: false,
        currency_conversion: false,
      },
    },
    qualityStandards: {
      quality_checks: {
        duplicate_detection: true,
        price_validation: true,
        data_completeness: 0.8,
        image_requirements: false,
      },
      approval_workflow: {
        tier_1_required: true,
        tier_2_required: false,
        auto_approve_threshold: 1000,
      },
    },
    complianceRules: {
      business_rules: {
        supplier_certification_required: false,
        tax_compliance_required: false,
        environmental_standards: false,
      },
      regulatory: {
        requires_approval: false,
        restricted_categories: [],
      },
    },
  });

  useEffect(() => {
    if (supplierId) {
      loadSupplierData();
    } else {
      // If no supplier ID is provided, load suppliers list for selection
      loadSuppliersList();
    }
  }, [supplierId]);

  const loadSuppliersList = async () => {
    try {
      setLoading(true);
      const suppliersList = await getSuppliers();
      setSuppliers(suppliersList);
    } catch (error) {
      console.error('Error loading suppliers list:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suppliers list',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierData = async () => {
    if (!supplierId) return;

    try {
      setLoading(true);

      // Load supplier data
      const supplierData = await getSupplierById(supplierId);
      if (supplierData) {
        setSupplier(supplierData);
      }

      // Load supplier profile
      const profileData = await getSupplierProfile(supplierId, 'default');
      if (profileData) {
        setProfile(profileData);
        // Merge profile data with defaults to ensure all fields are populated
        setFormData(prevFormData => ({
          guidelines: {
            inventory_management: {
              ...prevFormData.guidelines.inventory_management,
              ...(profileData.guidelines as ProfileData['guidelines'])?.inventory_management,
            },
            pricing: {
              ...prevFormData.guidelines.pricing,
              ...(profileData.guidelines as ProfileData['guidelines'])?.pricing,
            },
            business_rules: {
              ...prevFormData.guidelines.business_rules,
              ...(profileData.guidelines as ProfileData['guidelines'])?.business_rules,
            },
          },
          processingConfig: {
            upload_validation: {
              ...prevFormData.processingConfig.upload_validation,
              ...(profileData.processingConfig as ProfileData['processingConfig'])
                ?.upload_validation,
            },
            transformation_rules: {
              ...prevFormData.processingConfig.transformation_rules,
              ...(profileData.processingConfig as ProfileData['processingConfig'])
                ?.transformation_rules,
            },
          },
          qualityStandards: {
            quality_checks: {
              ...prevFormData.qualityStandards.quality_checks,
              ...(profileData.qualityStandards as ProfileData['qualityStandards'])?.quality_checks,
            },
            approval_workflow: {
              ...prevFormData.qualityStandards.approval_workflow,
              ...(profileData.qualityStandards as ProfileData['qualityStandards'])
                ?.approval_workflow,
            },
          },
          complianceRules: {
            business_rules: {
              ...prevFormData.complianceRules.business_rules,
              ...(profileData.complianceRules as ProfileData['complianceRules'])?.business_rules,
            },
            regulatory: {
              ...prevFormData.complianceRules.regulatory,
              ...(profileData.complianceRules as ProfileData['complianceRules'])?.regulatory,
            },
          },
        }));
      }

      // Load supplier rules
      const rulesData = await getSupplierRulesClient(supplierId, 'pricelist_upload');
      console.log('Loaded rules data:', rulesData); // Debug: check what data structure is returned
      setRules(rulesData);
    } catch (error) {
      console.error('Error loading supplier data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load supplier profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!supplierId) return;

    try {
      setSaving(true);

      // Debug: Log the form data being sent
      console.log('Saving profile with form data:', JSON.stringify(formData, null, 2));

      await updateSupplierProfileClient(supplierId, formData);

      toast({
        title: 'Success',
        description: 'Supplier profile updated successfully',
      });

      setEditing(false);
      loadSupplierData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save supplier profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    if (profile) {
      // Reset form data to profile data, merging with defaults
      setFormData(prevFormData => ({
        guidelines: {
          inventory_management: {
            ...prevFormData.guidelines.inventory_management,
            ...(profile.guidelines as ProfileData['guidelines'])?.inventory_management,
          },
          pricing: {
            ...prevFormData.guidelines.pricing,
            ...(profile.guidelines as ProfileData['guidelines'])?.pricing,
          },
          business_rules: {
            ...prevFormData.guidelines.business_rules,
            ...(profile.guidelines as ProfileData['guidelines'])?.business_rules,
          },
        },
        processingConfig: {
          upload_validation: {
            ...prevFormData.processingConfig.upload_validation,
            ...(profile.processingConfig as ProfileData['processingConfig'])?.upload_validation,
          },
          transformation_rules: {
            ...prevFormData.processingConfig.transformation_rules,
            ...(profile.processingConfig as ProfileData['processingConfig'])?.transformation_rules,
          },
        },
        qualityStandards: {
          quality_checks: {
            ...prevFormData.qualityStandards.quality_checks,
            ...(profile.qualityStandards as ProfileData['qualityStandards'])?.quality_checks,
          },
          approval_workflow: {
            ...prevFormData.qualityStandards.approval_workflow,
            ...(profile.qualityStandards as ProfileData['qualityStandards'])?.approval_workflow,
          },
        },
        complianceRules: {
          business_rules: {
            ...prevFormData.complianceRules.business_rules,
            ...(profile.complianceRules as ProfileData['complianceRules'])?.business_rules,
          },
          regulatory: {
            ...prevFormData.complianceRules.regulatory,
            ...(profile.complianceRules as ProfileData['complianceRules'])?.regulatory,
          },
        },
      }));
    }
  };

  const updateFormData = (section: keyof ProfileData, key: string, value: unknown) => {
    setFormData(prev => {
      // Handle nested objects properly by merging instead of replacing
      const currentSection = (prev[section] as Record<string, unknown>) || {};
      const updatedSection = {
        ...currentSection,
        [key]: value,
      };

      return {
        ...prev,
        [section]: updatedSection,
      };
    });
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    if (!supplierId) {
      toast({
        title: 'Error',
        description: 'Supplier ID is missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/rules?rule_id=${ruleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      // Refresh the rules list
      const updatedRules = await getSupplierRulesClient(supplierId);
      setRules(updatedRules);

      toast({
        title: 'Rule deleted',
        description: 'The rule has been successfully deleted.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-muted-foreground text-sm">Loading supplier profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Filter and sort suppliers for directory view
  const filteredAndSortedSuppliers = useMemo(() => {
    let filtered = suppliers || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query) ||
          (s.tier && s.tier.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'tier':
          aValue = (a.tier || '').toLowerCase();
          bValue = (b.tier || '').toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [suppliers, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'code' | 'status' | 'tier') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'code' | 'status' | 'tier') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  if (!supplier && !supplierId) {
    const activeSuppliers = suppliers?.filter(s => s.status === 'active').length || 0;
    const totalSuppliers = suppliers?.length || 0;

    return (
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Supplier Profiles Directory
              </h1>
              <p className="mt-1 text-gray-600">
                Manage supplier profiles, settings, and configurations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadSuppliersList}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => router.push('/suppliers/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Suppliers</p>
                    <p className="text-2xl font-bold">{totalSuppliers}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Active</p>
                    <p className="text-2xl font-bold">{activeSuppliers}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Profiles Configured</p>
                    <p className="text-2xl font-bold">{totalSuppliers}</p>
                  </div>
                  <Settings className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Showing</p>
                    <p className="text-2xl font-bold">{filteredAndSortedSuppliers.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search suppliers by name, code, or tier..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-muted-foreground h-4 w-4" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                  {(searchQuery || statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Directory Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        className="h-8 p-0 font-semibold hover:bg-transparent"
                      >
                        Supplier Name
                        {renderSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('code')}
                        className="h-8 p-0 font-semibold hover:bg-transparent"
                      >
                        Code
                        {renderSortIcon('code')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('status')}
                        className="h-8 p-0 font-semibold hover:bg-transparent"
                      >
                        Status
                        {renderSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('tier')}
                        className="h-8 p-0 font-semibold hover:bg-transparent"
                      >
                        Tier
                        {renderSortIcon('tier')}
                      </Button>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center">
                        <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          No Suppliers Found
                        </h3>
                        <p className="mb-4 text-gray-600">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'No suppliers are available to manage profiles'}
                        </p>
                        {!searchQuery && statusFilter === 'all' && (
                          <Button onClick={() => router.push('/suppliers/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Supplier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedSuppliers.map(supplier => (
                      <TableRow
                        key={supplier.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/nxt-spp/profiles?supplier_id=${supplier.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 font-semibold text-white">
                              {supplier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{supplier.name}</div>
                              {supplier.tier && (
                                <div className="text-muted-foreground mt-0.5 text-xs">
                                  {supplier.tier}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-700">
                            {supplier.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={supplier.status === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {supplier.tier ? (
                            <Badge variant="outline" className="capitalize">
                              {supplier.tier}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {supplier.addresses && supplier.addresses.length > 0 ? (
                            <div className="text-muted-foreground flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {supplier.addresses[0].city}, {supplier.addresses[0].country}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  router.push(`/nxt-spp/profiles?supplier_id=${supplier.id}`);
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Manage Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  router.push(`/suppliers/${supplier.id}/edit`);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Supplier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  router.push(`/suppliers/${supplier.id}`);
                                }}
                              >
                                <Building2 className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!supplier && supplierId) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Supplier Not Found</h3>
          <p className="mb-4 text-gray-600">
            The selected supplier could not be found in the system
          </p>
          <Button onClick={() => router.push('/nxt-spp/profiles')}>View All Suppliers</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Supplier Profile: {supplier.name}
              </h1>
              <p className="text-gray-600">Manage inventory portfolio settings and rules</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editing ? (
              <Button onClick={() => setEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Supplier Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <Label>Supplier Code</Label>
                <p className="text-lg font-medium">{supplier.code}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                  {supplier.status}
                </Badge>
              </div>
              <div>
                <Label>Tier</Label>
                <Badge variant="outline">{supplier.tier}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tabs */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList className="grid grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-2">
              <Settings className="h-4 w-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* Inventory Management Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management Settings</CardTitle>
                <CardDescription>
                  Configure how supplier inventory is managed and validated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="auto_approve">Auto Approve Uploads</Label>
                    <Switch
                      id="auto_approve"
                      checked={formData.guidelines?.inventory_management?.auto_approve || false}
                      onCheckedChange={checked =>
                        updateFormData('guidelines', 'inventory_management', {
                          ...formData.guidelines?.inventory_management,
                          auto_approve: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">
                      Automatically approve pricelist uploads without manual review
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validation_required">Validation Required</Label>
                    <Switch
                      id="validation_required"
                      checked={
                        formData.guidelines?.inventory_management?.validation_required !== false
                      }
                      onCheckedChange={checked =>
                        updateFormData('guidelines', 'inventory_management', {
                          ...formData.guidelines?.inventory_management,
                          validation_required: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">
                      Require validation before accepting uploaded products
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Input
                    id="currency"
                    value={formData.guidelines?.pricing?.currency || 'ZAR'}
                    onChange={e =>
                      updateFormData('guidelines', 'pricing', {
                        ...formData.guidelines?.pricing,
                        currency: e.target.value,
                      })
                    }
                    disabled={!editing}
                    placeholder="e.g., ZAR, USD, EUR"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Base Discount (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.guidelines?.pricing?.discount_percentage || 0}
                    onChange={e =>
                      updateFormData('guidelines', 'pricing', {
                        ...formData.guidelines?.pricing,
                        discount_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={!editing}
                    placeholder="0.00"
                  />
                  <p className="text-sm text-gray-600">
                    Default discount percentage applied to all products from this supplier. Can be overridden per product.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_order_value">Minimum Order Value</Label>
                  <Input
                    id="minimum_order_value"
                    type="number"
                    value={formData.guidelines?.business_rules?.minimum_order_value || 0}
                    onChange={e =>
                      updateFormData('guidelines', 'business_rules', {
                        ...formData.guidelines?.business_rules,
                        minimum_order_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={!editing}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    value={formData.guidelines?.business_rules?.payment_terms || 'Net 30'}
                    onChange={e =>
                      updateFormData('guidelines', 'business_rules', {
                        ...formData.guidelines?.business_rules,
                        payment_terms: e.target.value,
                      })
                    }
                    disabled={!editing}
                    placeholder="e.g., Net 30, COD, Prepayment"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Configuration Tab */}
          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Processing Configuration</CardTitle>
                <CardDescription>
                  Define how pricelist uploads are processed and validated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="required_fields">Required Fields</Label>
                    <Textarea
                      id="required_fields"
                      value={
                        formData.processingConfig?.upload_validation?.required_fields?.join(', ') ||
                        'sku, name, price'
                      }
                      onChange={e =>
                        updateFormData('processingConfig', 'upload_validation', {
                          ...formData.processingConfig?.upload_validation,
                          required_fields: e.target.value
                            .split(',')
                            .map(f => f.trim())
                            .filter(f => f),
                        })
                      }
                      disabled={!editing}
                      placeholder="sku, name, price, description, category"
                      rows={2}
                    />
                    <p className="text-sm text-gray-600">
                      Comma-separated list of required fields in uploads
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price_min">Minimum Price</Label>
                      <Input
                        id="price_min"
                        type="number"
                        value={formData.processingConfig?.upload_validation?.price_range?.min || 0}
                        onChange={e =>
                          updateFormData('processingConfig', 'upload_validation', {
                            ...formData.processingConfig?.upload_validation,
                            price_range: {
                              ...formData.processingConfig?.upload_validation?.price_range,
                              min: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        disabled={!editing}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_max">Maximum Price</Label>
                      <Input
                        id="price_max"
                        type="number"
                        value={
                          formData.processingConfig?.upload_validation?.price_range?.max || 100000
                        }
                        onChange={e =>
                          updateFormData('processingConfig', 'upload_validation', {
                            ...formData.processingConfig?.upload_validation,
                            price_range: {
                              ...formData.processingConfig?.upload_validation?.price_range,
                              max: parseFloat(e.target.value) || 100000,
                            },
                          })
                        }
                        disabled={!editing}
                        placeholder="100000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="auto_format">Auto Format Data</Label>
                    <Switch
                      id="auto_format"
                      checked={
                        formData.processingConfig?.transformation_rules?.auto_format !== false
                      }
                      onCheckedChange={checked =>
                        updateFormData('processingConfig', 'transformation_rules', {
                          ...formData.processingConfig?.transformation_rules,
                          auto_format: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">
                      Automatically format and standardize uploaded data
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="standardize_names">Standardize Product Names</Label>
                    <Switch
                      id="standardize_names"
                      checked={
                        formData.processingConfig?.transformation_rules?.standardize_names || false
                      }
                      onCheckedChange={checked =>
                        updateFormData('processingConfig', 'transformation_rules', {
                          ...formData.processingConfig?.transformation_rules,
                          standardize_names: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Standardize product naming conventions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Standards Tab */}
          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Standards & Checks</CardTitle>
                <CardDescription>Configure quality control and approval workflows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="duplicate_detection">Duplicate Detection</Label>
                    <Switch
                      id="duplicate_detection"
                      checked={
                        formData.qualityStandards?.quality_checks?.duplicate_detection !== false
                      }
                      onCheckedChange={checked =>
                        updateFormData('qualityStandards', 'quality_checks', {
                          ...formData.qualityStandards?.quality_checks,
                          duplicate_detection: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Detect and flag duplicate products</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_validation">Price Validation</Label>
                    <Switch
                      id="price_validation"
                      checked={
                        formData.qualityStandards?.quality_checks?.price_validation !== false
                      }
                      onCheckedChange={checked =>
                        updateFormData('qualityStandards', 'quality_checks', {
                          ...formData.qualityStandards?.quality_checks,
                          price_validation: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Validate prices against historical data</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_requirements">Image Requirements</Label>
                    <Switch
                      id="image_requirements"
                      checked={
                        formData.qualityStandards?.quality_checks?.image_requirements || false
                      }
                      onCheckedChange={checked =>
                        updateFormData('qualityStandards', 'quality_checks', {
                          ...formData.qualityStandards?.quality_checks,
                          image_requirements: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Require product images for approval</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tier_1_required">Tier 1 Approval Required</Label>
                    <Switch
                      id="tier_1_required"
                      checked={
                        formData.qualityStandards?.approval_workflow?.tier_1_required !== false
                      }
                      onCheckedChange={checked =>
                        updateFormData('qualityStandards', 'approval_workflow', {
                          ...formData.qualityStandards?.approval_workflow,
                          tier_1_required: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Require first-level approval</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_completeness">Minimum Data Completeness (%)</Label>
                  <Input
                    id="data_completeness"
                    type="number"
                    min="0"
                    max="100"
                    value={
                      (formData.qualityStandards?.quality_checks?.data_completeness || 0.8) * 100
                    }
                    onChange={e =>
                      updateFormData('qualityStandards', 'quality_checks', {
                        ...formData.qualityStandards?.quality_checks,
                        data_completeness: parseFloat(e.target.value) / 100 || 0.8,
                      })
                    }
                    disabled={!editing}
                    placeholder="80"
                  />
                  <p className="text-sm text-gray-600">
                    Minimum percentage of required fields that must be filled
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Rules Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance & Business Rules</CardTitle>
                <CardDescription>
                  Configure compliance requirements and business restrictions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplier_certification_required">
                      Supplier Certification Required
                    </Label>
                    <Switch
                      id="supplier_certification_required"
                      checked={
                        formData.complianceRules?.business_rules?.supplier_certification_required ||
                        false
                      }
                      onCheckedChange={checked =>
                        updateFormData('complianceRules', 'business_rules', {
                          ...formData.complianceRules?.business_rules,
                          supplier_certification_required: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Require valid supplier certification</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_compliance_required">Tax Compliance Required</Label>
                    <Switch
                      id="tax_compliance_required"
                      checked={
                        formData.complianceRules?.business_rules?.tax_compliance_required !== false
                      }
                      onCheckedChange={checked =>
                        updateFormData('complianceRules', 'business_rules', {
                          ...formData.complianceRules?.business_rules,
                          tax_compliance_required: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">Require tax compliance verification</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="environmental_standards">Environmental Standards</Label>
                    <Switch
                      id="environmental_standards"
                      checked={
                        formData.complianceRules?.business_rules?.environmental_standards || false
                      }
                      onCheckedChange={checked =>
                        updateFormData('complianceRules', 'business_rules', {
                          ...formData.complianceRules?.business_rules,
                          environmental_standards: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">
                      Enforce environmental compliance standards
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requires_approval">Requires Approval</Label>
                    <Switch
                      id="requires_approval"
                      checked={formData.complianceRules?.regulatory?.requires_approval || false}
                      onCheckedChange={checked =>
                        updateFormData('complianceRules', 'regulatory', {
                          ...formData.complianceRules?.regulatory,
                          requires_approval: checked,
                        })
                      }
                      disabled={!editing}
                    />
                    <p className="text-sm text-gray-600">
                      All products require regulatory approval
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restricted_categories">Restricted Categories</Label>
                  <Textarea
                    id="restricted_categories"
                    value={
                      formData.complianceRules?.regulatory?.restricted_categories?.join(', ') || ''
                    }
                    onChange={e =>
                      updateFormData('complianceRules', 'regulatory', {
                        ...formData.complianceRules?.regulatory,
                        restricted_categories: e.target.value
                          .split(',')
                          .map(c => c.trim())
                          .filter(c => c),
                      })
                    }
                    disabled={!editing}
                    placeholder="hazardous_materials, pharmaceuticals, restricted_electronics"
                    rows={3}
                  />
                  <p className="text-sm text-gray-600">
                    Comma-separated list of restricted product categories
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Active Rules Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Active Rules ({rules.length})</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/nxt-spp/rules?supplier_id=${supplierId}`)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Rule
              </Button>
            </div>
            <CardDescription>
              Rules currently applied to this supplier's pricelist uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map(rule => {
                  // Normalize the rule to handle both camelCase and snake_case formats
                  const normalizedRule = normalizeRule(rule);
                  const ruleName = normalizedRule.ruleName || 'Unnamed Rule';
                  const ruleType = normalizedRule.ruleType || 'unknown';
                  const executionOrder = normalizedRule.executionOrder || 0;
                  const isBlocking = normalizedRule.isBlocking;
                  const ruleConfig = normalizedRule.ruleConfig || {};

                  // Generate a meaningful description based on rule type and config
                  const getRuleDescription = () => {
                    if (
                      ruleConfig &&
                      typeof ruleConfig === 'object' &&
                      Object.keys(ruleConfig).length > 0
                    ) {
                      // Try to extract meaningful info from config
                      if (ruleConfig.description) return ruleConfig.description;
                      if (ruleConfig.field) return `Validates ${ruleConfig.field} field`;
                      if (ruleConfig.condition) return `Condition: ${ruleConfig.condition}`;
                    }

                    // Fallback descriptions based on rule type
                    switch (ruleType) {
                      case 'validation':
                        return 'Validates uploaded data for correctness';
                      case 'transformation':
                        return 'Transforms data format during upload';
                      case 'approval':
                        return 'Requires approval before processing';
                      case 'notification':
                        return 'Sends notifications for specific events';
                      case 'enforcement':
                        return 'Enforces business rules and policies';
                      default:
                        return `Rule type: ${ruleType}`;
                    }
                  };

                  return (
                    <div
                      key={rule.id}
                      className="group flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">{ruleName}</p>
                          <p className="text-sm text-gray-600">
                            {getRuleDescription()} • Order: {executionOrder}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isBlocking ? 'destructive' : 'secondary'}>
                          {isBlocking ? 'Blocking' : 'Non-blocking'}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/nxt-spp/rules?supplier_id=${supplierId}&edit_rule=${rule.id}`
                              )
                            }
                            className="h-8 px-2"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-destructive hover:text-destructive h-8 px-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600">No active rules configured</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => router.push(`/nxt-spp/rules?supplier_id=${supplierId}`)}
                >
                  <Plus className="h-4 w-4" />
                  Create Rule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function SupplierProfilesPage() {
  return (
    <Suspense
      fallback={
        <AppLayout
          title="Supplier Profiles"
          breadcrumbs={[{ label: 'NXT-SPP', href: '/nxt-spp' }, { label: 'Profiles' }]}
        >
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-muted-foreground">Loading supplier profiles...</div>
          </div>
        </AppLayout>
      }
    >
      <SupplierProfilesContent />
    </Suspense>
  );
}
