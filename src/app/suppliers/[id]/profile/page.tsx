'use client';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload';
import { Loader } from '@/components/kokonutui';
import { DiscountRulesManager } from '@/components/suppliers/DiscountRulesManager';
import { SupplierCategoriesTab } from '@/components/suppliers/SupplierCategoriesTab';
import { SupplierBrandsTab } from '@/components/suppliers/SupplierBrandsTab';
import {
  FileUp,
  Settings,
  FileCog,
  TrendingUp,
  History,
  CheckCircle2,
  Edit3,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Users,
  Tag,
  Award,
  Package,
  Clock,
  FileText,
  Loader2,
  ArrowRight,
  Database,
  BarChart3,
  RefreshCw,
  Link2,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type Supplier = {
  id: string;
  name: string;
  code?: string;
  status?: string;
  tags?: string[];
  orgId?: string;
  tier?: string;
  category?: string;
  subcategory?: string;
  businessInfo?: {
    legalName?: string;
    tradingName?: string;
    taxId?: string;
    registrationNumber?: string;
    website?: string;
    foundedYear?: number;
    employeeCount?: number;
    annualRevenue?: number;
    currency?: string;
  };
  contacts?: Array<{
    id?: string;
    type?: string;
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    department?: string;
    isPrimary?: boolean;
    isActive?: boolean;
  }>;
  addresses?: Array<{
    id?: string;
    type?: string;
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isPrimary?: boolean;
    isActive?: boolean;
  }>;
  capabilities?: {
    products?: string[];
    services?: string[];
    leadTime?: number;
    minimumOrderValue?: number;
    paymentTerms?: string;
  };
  notes?: string;
  // JSON Feed fields
  jsonFeedUrl?: string;
  jsonFeedEnabled?: boolean;
  jsonFeedType?: string;
  jsonFeedIntervalMinutes?: number;
  jsonFeedLastSync?: string;
  jsonFeedLastStatus?: {
    success: boolean;
    message?: string;
    productsUpdated?: number;
    timestamp?: string;
  };
  // Discount fields
  baseDiscountPercent?: number;
};
type RuleRow = {
  id: number;
  rule_name: string;
  rule_type: string;
  execution_order: number;
  rule_config: unknown;
  is_blocking: boolean;
  updated_at: string;
};
type ProfileRow = {
  id: number;
  profile_name: string;
  guidelines?: unknown;
  processing_config?: unknown;
  quality_standards?: unknown;
  compliance_rules?: unknown;
  is_active: boolean;
  updated_at: string;
};
type UploadRow = {
  upload_id: string;
  filename: string;
  status: string;
  row_count: number;
  received_at: string;
};

function SupplierProfileContent() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();
  const supplierId = String(params?.id || '');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  
  // Get initial tab from search params - use useEffect to avoid hook order issues
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  useEffect(() => {
    const initialTab = search?.get('tab') || 'overview';
    // Redirect old tab names to new merged tab
    const normalizedTab = initialTab === 'rules' || initialTab === 'discounts' ? 'pricing-discounts' : initialTab;
    setActiveTab(normalizedTab);
  }, [search]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);

  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('transformation');
  const [ruleOrder, setRuleOrder] = useState(0);
  const [ruleBlocking, setRuleBlocking] = useState(false);
  const [ruleJson, setRuleJson] = useState('{}');
  const [nlInstruction, setNlInstruction] = useState('');
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<
    Array<{
      id: number;
      action: string;
      status: string;
      details: unknown;
      started_at: string;
      finished_at: string;
      upload_id: string;
    }>
  >([]);
  const [loading, setLoading] = useState({
    supplier: true,
    rules: true,
    profiles: true,
    uploads: true,
    activity: true,
  });
  const [metrics, setMetrics] = useState<{
    total_products?: number;
    total_value?: number;
    recent_changes?: number;
  } | null>(null);

  // JSON Feed state
  const [feedUrl, setFeedUrl] = useState('');
  const [feedType, setFeedType] = useState('woocommerce');
  const [feedEnabled, setFeedEnabled] = useState(false);
  const [feedInterval, setFeedInterval] = useState(60);
  const [feedSyncing, setFeedSyncing] = useState(false);
  const [feedSyncLogs, setFeedSyncLogs] = useState<Array<{
    logId: string;
    syncStartedAt: string;
    status: string;
    productsUpdated: number;
    productsCreated: number;
    productsFailed: number;
    errorMessage?: string;
  }>>([]);

  // PlusPortal state
  const [plusPortalUsername, setPlusPortalUsername] = useState('');
  const [plusPortalPassword, setPlusPortalPassword] = useState('');
  const [plusPortalEnabled, setPlusPortalEnabled] = useState(false);
  const [plusPortalInterval, setPlusPortalInterval] = useState(1440);
  const [plusPortalSyncing, setPlusPortalSyncing] = useState(false);
  const [plusPortalSaving, setPlusPortalSaving] = useState(false);
  const [plusPortalCredentialsConfigured, setPlusPortalCredentialsConfigured] = useState(false);
  const [plusPortalSyncLogs, setPlusPortalSyncLogs] = useState<Array<{
    logId: string;
    status: string;
    csvDownloaded: boolean;
    productsProcessed: number;
    productsCreated: number;
    productsSkipped: number;
    syncStartedAt: Date;
    syncCompletedAt: Date | null;
    errors: string[];
    currentStage?: string;
    progressPercent?: number;
  }>>([]);
  const [currentSyncLogId, setCurrentSyncLogId] = useState<string | null>(null);

  // Discount state
  const [baseDiscount, setBaseDiscount] = useState(0);
  const [discountSaving, setDiscountSaving] = useState(false);

  // Extract loadUploads to be reusable for refreshing after uploads/syncs
  const loadUploads = useCallback(async () => {
    if (!supplierId) return;
    try {
      setLoading((prev) => ({ ...prev, uploads: true }));
      const res = await fetch(`/api/spp/upload?supplier_id=${supplierId}&limit=50`);
      const data = await res.json();
      if (data.success && data.data) {
        setUploads(data.data.uploads || data.data || []);
      } else {
        setUploads([]);
      }
    } catch (error) {
      console.error('Error loading uploads:', error);
      setUploads([]);
    } finally {
      setLoading((prev) => ({ ...prev, uploads: false }));
    }
  }, [supplierId]);

  // Extract loadAudit to be reusable for refreshing after uploads/syncs
  const loadAudit = useCallback(async () => {
    if (!supplierId) return;
    try {
      setLoading((prev) => ({ ...prev, activity: true }));
      const res = await fetch(`/api/spp/audit?supplier_id=${supplierId}&limit=50`);
      const data = await res.json();
      if (data.success && data.data) {
        setActivity(data.data || []);
      } else {
        setActivity([]);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
      setActivity([]);
    } finally {
      setLoading((prev) => ({ ...prev, activity: false }));
    }
  }, [supplierId]);

  useEffect(() => {
    if (!supplierId) return;

    const loadSupplier = async () => {
      try {
        setLoading((prev) => ({ ...prev, supplier: true }));
        const res = await fetch(`/api/suppliers/v3/${supplierId}`);
        if (!res.ok) {
          console.error('Failed to fetch supplier:', res.status, res.statusText);
          return;
        }
        const data = await res.json();
        if (data.success && data.data) {
          setSupplier(data.data);
        } else {
          console.error('Supplier fetch failed:', data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error loading supplier:', error);
      } finally {
        setLoading((prev) => ({ ...prev, supplier: false }));
      }
    };

    const loadRules = async () => {
      try {
        setLoading((prev) => ({ ...prev, rules: true }));
        const res = await fetch(`/api/suppliers/${supplierId}/rules`);
        const data = await res.json();
        setRules(data.data || []);
      } catch (error) {
        console.error('Error loading rules:', error);
      } finally {
        setLoading((prev) => ({ ...prev, rules: false }));
      }
    };

    const loadProfiles = async () => {
      try {
        setLoading((prev) => ({ ...prev, profiles: true }));
        const res = await fetch(`/api/supplier-profiles?supplier_id=${supplierId}`);
        const data = await res.json();
        setProfiles(data.data || []);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setLoading((prev) => ({ ...prev, profiles: false }));
      }
    };


    const loadMetrics = async () => {
      try {
        // Load supplier-specific metrics
        const [productsRes, uploadsRes] = await Promise.all([
          fetch(`/api/core/suppliers/products?supplier_id=${supplierId}`),
          fetch(`/api/spp/upload?supplier_id=${supplierId}&limit=1`),
        ]);

        let totalProducts = 0;
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          totalProducts = productsData.data?.length || productsData.total || 0;
        }

        let totalUploads = 0;
        if (uploadsRes.ok) {
          const uploadsData = await uploadsRes.json();
          totalUploads = uploadsData.data?.total || uploadsData.pagination?.total || 0;
        }

        setMetrics({
          total_products: totalProducts,
          total_value: 0, // Would need to calculate from products
          recent_changes: 0,
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
      }
    };

    loadSupplier();
    loadRules();
    loadProfiles();
    loadUploads();
    loadAudit();
    loadMetrics();

    // Load sync status
    const loadSyncStatus = async () => {
      try {
        const res = await fetch(`/api/suppliers/${supplierId}/sync`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const { status, logs } = data.data;
            if (status) {
              setFeedUrl(status.feedUrl || '');
              setFeedType(status.feedType || 'woocommerce');
              setFeedEnabled(status.feedEnabled || false);
              setFeedInterval(status.intervalMinutes || 60);
            }
            if (logs) {
              setFeedSyncLogs(logs);
            }
          }
        }
      } catch (error) {
        console.error('Error loading sync status:', error);
      }
    };

    // Load PlusPortal sync status
    const loadPlusPortalSyncStatus = async () => {
      try {
        const res = await fetch(`/api/suppliers/${supplierId}/plusportal-sync`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const { config, recentLogs } = data.data;
            if (config) {
              setPlusPortalUsername(config.username || '');
              setPlusPortalPassword(''); // Don't load password for security
              setPlusPortalEnabled(config.enabled || false);
                              setPlusPortalInterval(config.intervalMinutes || 1440);
                              // Check if credentials are fully configured (username AND password exist on server)
                              // Password should be truthy and not empty string
                              const hasPassword = config.password && config.password.trim() !== '';
                              setPlusPortalCredentialsConfigured(!!(config.username && hasPassword));
            } else {
              // If no config, set defaults but don't clear username if it was set
              if (!plusPortalUsername) {
                setPlusPortalUsername('');
              }
              setPlusPortalEnabled(false);
              setPlusPortalInterval(1440);
              setPlusPortalCredentialsConfigured(false);
            }
            if (recentLogs) {
              setPlusPortalSyncLogs(recentLogs);
            }
          }
        }
      } catch (error) {
        console.error('Error loading PlusPortal sync status:', error);
      }
    };

    loadSyncStatus();
    loadPlusPortalSyncStatus();
  }, [supplierId]);

  // Sync state from supplier when loaded
  useEffect(() => {
    if (supplier) {
      setFeedUrl(supplier.jsonFeedUrl || '');
      setFeedType(supplier.jsonFeedType || 'woocommerce');
      setFeedEnabled(supplier.jsonFeedEnabled || false);
      setFeedInterval(supplier.jsonFeedIntervalMinutes || 60);
      setBaseDiscount(supplier.baseDiscountPercent || 0);
    }
  }, [supplier]);

  const synthesizeRule = async () => {
    try {
      setError(null);
      if (!nlInstruction || nlInstruction.length < 10) {
        setError('Enter a natural-language instruction');
        return;
      }
      const res = await fetch('/api/suppliers/nlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: supplierId, instruction: nlInstruction }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to synthesize rule');
      setRuleJson(JSON.stringify(data.data, null, 2));
    } catch (e: unknown) {
      setError(e?.message || 'Failed to synthesize rule');
    }
  };

  const saveRule = async () => {
    try {
      setError(null);
      const parsed = JSON.parse(ruleJson);

      if (editingRule) {
        // Update existing rule
        const body = {
          rule_id: editingRule.id,
          rule_name: ruleName || 'Generated Rule',
          rule_type: ruleType,
          trigger_event: 'pricelist_upload',
          execution_order: ruleOrder,
          rule_config: parsed,
          is_blocking: ruleBlocking,
        };
        const res = await fetch(`/api/suppliers/${supplierId}/rules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const t = await res.json();
          throw new Error(t.error || 'Failed to update rule');
        }
      } else {
        // Create new rule
        const body = {
          supplier_id: supplierId,
          rule_name: ruleName || 'Generated Rule',
          rule_type: ruleType,
          trigger_event: 'pricelist_upload',
          execution_order: ruleOrder,
          rule_config: parsed,
          is_blocking: ruleBlocking,
        };
        const res = await fetch(`/api/suppliers/${supplierId}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const t = await res.json();
          throw new Error(t.error || 'Failed to save rule');
        }
      }

      const list = await fetch(`/api/suppliers/${supplierId}/rules`).then(r => r.json());
      setRules(list.data || []);
      setRuleName('');
      setRuleOrder(0);
      setRuleBlocking(false);
      setRuleJson('{}');
      setNlInstruction('');
      setEditingRule(null);
    } catch (e: unknown) {
      setError(e?.message || 'Failed to save rule');
    }
  };

  const editRule = (rule: RuleRow) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setRuleType(rule.rule_type);
    setRuleOrder(rule.execution_order);
    setRuleBlocking(rule.is_blocking);
    setRuleJson(JSON.stringify(rule.rule_config || {}, null, 2));
    setError(null);
  };

  const deleteRule = async (rule: RuleRow) => {
    if (!confirm(`Delete rule "${rule.rule_name}"?`)) return;
    try {
      setError(null);
      const res = await fetch(`/api/suppliers/${supplierId}/rules?rule_id=${rule.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const t = await res.json();
        throw new Error(t.error || 'Failed to delete rule');
      }
      const list = await fetch(`/api/suppliers/${supplierId}/rules`).then(r => r.json());
      setRules(list.data || []);
      if (editingRule && editingRule.id === rule.id) {
        setRuleName('');
        setRuleOrder(0);
        setRuleBlocking(false);
        setRuleJson('{}');
        setNlInstruction('');
        setEditingRule(null);
      }
    } catch (e: unknown) {
      setError(e?.message || 'Failed to delete rule');
    }
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleType('transformation');
    setRuleOrder(0);
    setRuleBlocking(false);
    setRuleJson('{}');
    setNlInstruction('');
    setError(null);
  };

  // Show KokonutUI Loader when supplier data is loading
  if (loading.supplier && !supplier) {
    return (
      <AppLayout
        title="Supplier Profile"
        breadcrumbs={[
          { label: 'Suppliers', href: '/suppliers' },
          { label: 'Directory', href: '/directories/suppliers' },
          { label: 'Profile' },
        ]}
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader
            title="Loading supplier profile..."
            subtitle="Please wait while we fetch the supplier information"
            size="md"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={supplier ? supplier.name : 'Supplier Profile'}
      breadcrumbs={[
        { label: 'Suppliers', href: '/suppliers' },
        { label: 'Directory', href: '/directories/suppliers' },
        { label: supplier?.name || 'Profile' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                  <Building2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {supplier?.name || 'Supplier'}
                  </h1>
                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
                    {supplier?.code && (
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {supplier.code}
                      </span>
                    )}
                    {supplier?.status && (
                      <Badge
                        variant={supplier.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {supplier.status}
                      </Badge>
                    )}
                    {supplier?.tier && (
                      <Badge variant="outline" className="text-xs">
                        <Award className="mr-1 h-3 w-3" />
                        {supplier.tier}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(supplier?.tags || []).slice(0, 3).map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/suppliers/${supplierId}/edit`)}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/supplier-rules?supplier_id=${supplierId}`)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Rules
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={v => {
            // Normalize old tab names to new merged tab
            const normalizedTab = v === 'rules' || v === 'discounts' ? 'pricing-discounts' : v;
            setActiveTab(normalizedTab);
            router.push(`/suppliers/${supplierId}/profile?tab=${normalizedTab}`);
          }}
          className="space-y-6"
        >
          <TabsList className="bg-muted/50 grid w-full grid-cols-10 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Metrics
            </TabsTrigger>
            <TabsTrigger
              value="pricing-discounts"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Pricing & Discounts
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="brands"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Brands
            </TabsTrigger>
            <TabsTrigger
              value="uploads"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Uploads
            </TabsTrigger>
            <TabsTrigger
              value="sync"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Data Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Basic Information */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Building2 className="text-primary h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Name</Label>
                    <div className="text-base font-medium">
                      {supplier?.name || (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Code</Label>
                    <div className="font-mono text-base font-medium">
                      {supplier?.code || <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Status</Label>
                    <div>
                      {supplier?.status ? (
                        <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                          {supplier.status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Tier</Label>
                    <div>
                      {supplier?.tier ? (
                        <Badge variant="outline">{supplier.tier}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Category</Label>
                    <div className="text-base font-medium">
                      {supplier?.category || <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Subcategory</Label>
                    <div className="text-base font-medium">
                      {supplier?.subcategory || <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  {supplier?.orgId && (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Organization ID</Label>
                      <div className="text-muted-foreground font-mono text-sm">
                        {supplier.orgId}
                      </div>
                    </div>
                  )}
                  {supplier?.tags && supplier.tags.length > 0 && (
                    <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                      <Label className="text-muted-foreground text-sm font-medium">Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {supplier.tags.map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            {supplier?.businessInfo && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Briefcase className="text-primary h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Legal Name</Label>
                      <div className="text-base font-medium">
                        {supplier.businessInfo.legalName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Trading Name</Label>
                      <div className="text-base font-medium">
                        {supplier.businessInfo.tradingName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Website</Label>
                      <div className="text-base font-medium">
                        {supplier.businessInfo.website ? (
                          <a
                            href={supplier.businessInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1.5 hover:underline"
                          >
                            {supplier.businessInfo.website}
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Tax ID</Label>
                      <div className="font-mono text-base font-medium">
                        {supplier.businessInfo.taxId || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Registration Number</Label>
                      <div className="font-mono text-base font-medium">
                        {supplier.businessInfo.registrationNumber || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Founded Year</Label>
                      <div className="text-base font-medium">
                        {supplier.businessInfo.foundedYear || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Employee Count</Label>
                      <div className="text-base font-semibold">
                        {supplier.businessInfo.employeeCount ? (
                          supplier.businessInfo.employeeCount.toLocaleString()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Annual Revenue</Label>
                      <div className="text-base font-semibold">
                        {supplier.businessInfo.annualRevenue ? (
                          <span className="text-green-600">
                            {supplier.businessInfo.currency || 'ZAR'}{' '}
                            {supplier.businessInfo.annualRevenue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Currency</Label>
                      <div className="font-mono text-base font-medium">
                        {supplier.businessInfo.currency || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            {supplier?.contacts && supplier.contacts.length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Users className="text-primary h-5 w-5" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {supplier.contacts.map((contact, i) => (
                      <div
                        key={contact.id || i}
                        className={`rounded-lg border border-border p-4 transition-all hover:shadow-sm ${
                          contact.isPrimary ? 'border-primary/50 bg-primary/5' : ''
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <div className="text-base font-semibold">
                                {contact.name || 'Unnamed Contact'}
                              </div>
                              {contact.isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                              {!contact.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            {contact.title && (
                              <div className="text-muted-foreground mb-1 text-sm font-medium">
                                {contact.title}
                              </div>
                            )}
                            {contact.department && (
                              <Badge variant="outline" className="text-xs">
                                {contact.department}
                              </Badge>
                            )}
                          </div>
                          {contact.type && (
                            <Badge variant="outline" className="text-xs">
                              {contact.type}
                            </Badge>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="text-muted-foreground h-4 w-4" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-primary font-medium hover:underline"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="text-muted-foreground h-4 w-4" />
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-foreground hover:underline"
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                          {contact.mobile && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="text-muted-foreground h-4 w-4" />
                              <a
                                href={`tel:${contact.mobile}`}
                                className="text-foreground hover:underline"
                              >
                                {contact.mobile}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addresses */}
            {supplier?.addresses && supplier.addresses.length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <MapPin className="text-primary h-5 w-5" />
                    Addresses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {supplier.addresses.map((address, i) => (
                      <div
                        key={address.id || i}
                        className={`rounded-lg border border-border p-4 transition-all hover:shadow-sm ${
                          address.isPrimary ? 'border-primary/50 bg-primary/5' : ''
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="text-muted-foreground h-4 w-4" />
                            <div className="text-base font-semibold">
                              {address.name || address.type || 'Address'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {address.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                Primary
                              </Badge>
                            )}
                            {address.type && !address.isPrimary && (
                              <Badge variant="outline" className="text-xs">
                                {address.type}
                              </Badge>
                            )}
                            {!address.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-1 text-sm leading-relaxed">
                          {address.addressLine1 && (
                            <div className="font-medium">{address.addressLine1}</div>
                          )}
                          {address.addressLine2 && (
                            <div className="text-muted-foreground">{address.addressLine2}</div>
                          )}
                          {(address.city || address.state || address.postalCode) && (
                            <div>
                              {[address.city, address.state, address.postalCode]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          )}
                          {address.country && (
                            <div className="text-muted-foreground font-medium">
                              {address.country}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Capabilities */}
            {supplier?.capabilities && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Package className="text-primary h-5 w-5" />
                    Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Payment Terms</Label>
                      <div className="text-base font-medium">
                        {supplier.capabilities.paymentTerms || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Lead Time</Label>
                      <div className="text-base font-semibold">
                        {supplier.capabilities.leadTime ? (
                          <span>{supplier.capabilities.leadTime} days</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-sm font-medium">Minimum Order Value</Label>
                      <div className="text-base font-semibold">
                        {supplier.capabilities.minimumOrderValue ? (
                          <span className="text-green-600">
                            {supplier.businessInfo?.currency || 'ZAR'}{' '}
                            {supplier.capabilities.minimumOrderValue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    {supplier.capabilities.products &&
                      supplier.capabilities.products.length > 0 && (
                        <div className="space-y-1.5 md:col-span-3">
                          <Label className="text-muted-foreground text-sm font-medium">Products</Label>
                          <div className="flex flex-wrap gap-2">
                            {supplier.capabilities.products.map((p, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {supplier.capabilities.services &&
                      supplier.capabilities.services.length > 0 && (
                        <div className="space-y-1.5 md:col-span-3">
                          <Label className="text-muted-foreground text-sm font-medium">Services</Label>
                          <div className="flex flex-wrap gap-2">
                            {supplier.capabilities.services.map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {supplier?.notes && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <FileText className="text-primary h-5 w-5" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {supplier.notes}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg font-semibold tracking-tight">
                  <div className="flex items-center gap-2">
                    <History className="text-primary h-5 w-5" />
                    Recent Activity
                  </div>
                  {loading.activity && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.activity ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity.length > 0 ? (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {activity.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-lg border border-border p-4 transition-all hover:shadow-sm"
                      >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 text-base font-semibold">{ev.action}</div>
                              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(ev.started_at).toLocaleString()}
                                  {ev.finished_at &&
                                    ` → ${new Date(ev.finished_at).toLocaleString()}`}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={
                                ev.status === 'failed'
                                  ? 'destructive'
                                  : ev.status === 'completed'
                                    ? 'default'
                                    : 'secondary'
                              }
                            >
                              {ev.status}
                            </Badge>
                          </div>
                          {ev.details && (
                            <>
                              <Separator className="my-3" />
                              <details className="cursor-pointer">
                                <summary className="text-muted-foreground hover:text-foreground text-xs font-medium">
                                  View Details
                                </summary>
                                <pre className="bg-muted mt-2 overflow-x-auto rounded-lg border p-3 text-xs">
                                  {JSON.stringify(ev.details, null, 2)}
                                </pre>
                              </details>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="bg-muted mb-4 rounded-full p-6">
                      <History className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">No Activity Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md text-center text-sm">
                      Activity will appear here once you upload pricelists, process data, or make
                      changes to this supplier.
                    </p>
                    <Button
                      onClick={() => {
                        setActiveTab('uploads');
                        router.push(`/suppliers/${supplierId}/profile?tab=uploads`);
                      }}
                      variant="default"
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Upload Pricelist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg font-semibold tracking-tight">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-primary h-5 w-5" />
                    Key Metrics
                  </div>
                  {(loading.uploads || loading.rules || loading.profiles) && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(loading.uploads || loading.rules || loading.profiles) ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="rounded-lg border p-5">
                        <Skeleton className="mb-2 h-5 w-5" />
                        <Skeleton className="mb-1 h-3 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-muted-foreground text-sm">Total Uploads</p>
                            <p className="text-2xl font-bold">{uploads.length}</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {uploads.length > 0
                                ? `${uploads.filter((u) => u.status === 'completed').length} completed`
                                : 'No uploads yet'}
                            </p>
                          </div>
                          <FileUp className="text-primary h-8 w-8" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-muted-foreground text-sm">Active Rules</p>
                            <p className="text-2xl font-bold">{rules.length}</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {rules.length > 0
                                ? `${rules.filter((r) => r.is_blocking).length} blocking`
                                : 'No rules configured'}
                            </p>
                          </div>
                          <Settings className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-muted-foreground text-sm">Products</p>
                            <p className="text-2xl font-bold">
                              {metrics?.total_products?.toLocaleString() || '0'}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">From pricelists</p>
                          </div>
                          <Package className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-muted-foreground text-sm">Profiles</p>
                            <p className="text-2xl font-bold">{profiles.length}</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {profiles.filter((p) => p.is_active).length} active
                            </p>
                          </div>
                          <FileText className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            {!loading.uploads && !loading.rules && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                      <BarChart3 className="text-primary h-5 w-5" />
                      Upload Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Files</span>
                        <span className="text-lg font-semibold">{uploads.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Rows Processed</span>
                        <span className="text-lg font-semibold">
                          {uploads.reduce((sum, u) => sum + (u.row_count || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completed</span>
                        <Badge variant="default">
                          {uploads.filter((u) => u.status === 'completed').length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Failed</span>
                        <Badge variant="destructive">
                          {uploads.filter((u) => u.status === 'failed').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                      <Database className="text-primary h-5 w-5" />
                      Data Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Supplier Status</span>
                        <Badge variant={supplier?.status === 'active' ? 'default' : 'secondary'}>
                          {supplier?.status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tier</span>
                        <Badge variant="outline">{supplier?.tier || '—'}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Processing Rules</span>
                        <span className="text-lg font-semibold">{rules.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Active Profiles</span>
                        <span className="text-lg font-semibold">
                          {profiles.filter((p) => p.is_active).length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pricing-discounts" className="mt-6 space-y-6">
            <div className="space-y-6">
              {/* Pricelist Rules Section */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Settings className="text-primary h-5 w-5" />
                    Pricelist Rules
                  </CardTitle>
                  <CardDescription>
                    Configure validation, transformation, and processing rules for pricelist uploads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="border shadow-sm lg:col-span-1">
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-2">
                          <Settings className="text-primary h-5 w-5" />
                          <CardTitle className="text-lg font-semibold">Existing Rules</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                          <div className="divide-y">
                            {rules.map(r => (
                              <div key={r.id} className="group hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between p-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex items-center justify-between">
                                      <div className="truncate text-sm font-semibold">{r.rule_name}</div>
                                      <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                        {r.rule_type}
                                      </Badge>
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      Order {r.execution_order} • Updated{' '}
                                      {new Date(r.updated_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => editRule(r)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteRule(r)}
                                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {rules.length === 0 && (
                              <div className="text-muted-foreground p-8 text-center text-sm">
                                <Settings className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                <p>No rules yet</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    <Card className="border-border lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                          <FileCog className="text-primary h-5 w-5" />
                          {editingRule ? 'Edit Rule' : 'Create Rule'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Rule Name</Label>
                            <Input
                              value={ruleName}
                              onChange={e => setRuleName(e.target.value)}
                              placeholder="Enter rule name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Type</Label>
                            <Select value={ruleType} onValueChange={setRuleType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="validation">Validation</SelectItem>
                                <SelectItem value="transformation">Transformation</SelectItem>
                                <SelectItem value="approval">Approval</SelectItem>
                                <SelectItem value="notification">Notification</SelectItem>
                                <SelectItem value="enforcement">Enforcement</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Execution Order</Label>
                            <Input
                              type="number"
                              value={ruleOrder}
                              onChange={e => setRuleOrder(parseInt(e.target.value || '0'))}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Blocking Rule</Label>
                            <div>
                              <Button
                                variant={ruleBlocking ? 'default' : 'outline'}
                                onClick={() => setRuleBlocking(v => !v)}
                                className="w-full"
                              >
                                {ruleBlocking ? 'Yes - Blocks execution' : 'No - Non-blocking'}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Natural-language Instruction</Label>
                          <Textarea
                            value={nlInstruction}
                            onChange={e => setNlInstruction(e.target.value)}
                            rows={4}
                            placeholder="Describe what this rule should do..."
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={synthesizeRule}>
                            <FileCog className="mr-2 h-4 w-4" />
                            Generate with AI
                          </Button>
                          {editingRule && (
                            <Button variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          )}
                          <Button onClick={saveRule}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {editingRule ? 'Update Rule' : 'Save Rule'}
                          </Button>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Rule Config (JSON)</Label>
                          <Textarea
                            value={ruleJson}
                            onChange={e => setRuleJson(e.target.value)}
                            rows={12}
                            className="font-mono text-sm"
                            placeholder="{}"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Discount Rules Section */}
              <DiscountRulesManager
                supplierId={supplierId}
                baseDiscount={baseDiscount}
                onBaseDiscountChange={async (discount) => {
                  try {
                    setDiscountSaving(true);
                    setError(null);
                    const res = await fetch(`/api/suppliers/v3/${supplierId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ baseDiscountPercent: discount }),
                    });
                    const responseData = await res.json();
                    if (!res.ok) {
                      throw new Error(responseData.error || 'Failed to save discount');
                    }
                    const supplierRes = await fetch(`/api/suppliers/v3/${supplierId}`);
                    const supplierData = await supplierRes.json();
                    if (supplierData.success && supplierData.data) {
                      setSupplier(supplierData.data);
                      setBaseDiscount(supplierData.data.baseDiscountPercent || 0);
                    }
                  } catch (e: unknown) {
                    setError(e?.message || 'Failed to save discount');
                  } finally {
                    setDiscountSaving(false);
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <SupplierCategoriesTab supplierId={supplierId} />
          </TabsContent>

          <TabsContent value="brands" className="mt-6">
            <SupplierBrandsTab supplierId={supplierId} />
          </TabsContent>

          <TabsContent value="uploads" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg font-semibold tracking-tight">
                  <div className="flex items-center gap-2">
                    <FileUp className="text-primary h-5 w-5" />
                    Recent Uploads
                  </div>
                  {loading.uploads && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.uploads ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-64" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : uploads.length > 0 ? (
                  <div className="space-y-3">
                    {uploads.map((u) => (
                      <div
                        key={u.upload_id}
                        className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:shadow-sm"
                      >
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <FileUp className="text-muted-foreground h-4 w-4" />
                            <div className="text-base font-semibold">{u.filename}</div>
                          </div>
                          <div className="text-muted-foreground ml-6 flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(u.received_at).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {u.row_count?.toLocaleString() || 0} rows
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            u.status === 'completed'
                              ? 'default'
                              : u.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="ml-4"
                        >
                          {u.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="bg-muted mb-4 rounded-full p-6">
                      <FileUp className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">No Uploads Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md text-center text-sm">
                      Upload your first pricelist to get started. Supported formats include Excel
                      (.xlsx, .xls) and CSV files.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <FileUp className="text-primary h-5 w-5" />
                  Upload Pricelist
                </CardTitle>
                <CardDescription>
                  Upload a new pricelist file for this supplier. The system will automatically
                  extract and validate product data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPricelistUpload
                  open={false}
                  onOpenChange={() => {}}
                  onComplete={async () => {
                    // Reload uploads and activity after successful upload
                    await Promise.all([loadUploads(), loadAudit()]);
                  }}
                  defaultSupplierId={supplierId}
                  autoValidate={false}
                  autoMerge={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Sync Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Link2 className="text-primary h-5 w-5" />
                  JSON Feed Configuration
                </CardTitle>
                <CardDescription>
                  Configure a JSON/API endpoint to automatically sync product data, stock levels,
                  and pricing from external systems like WooCommerce.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Feed URL / API Endpoint</Label>
                      <Input
                        value={feedUrl}
                        onChange={(e) => setFeedUrl(e.target.value)}
                        placeholder="https://example.com/wp-json/wc/v3/products"
                        className="font-mono text-sm"
                      />
                      <p className="text-muted-foreground text-xs">
                        Enter the full URL to the JSON product feed. Supports WooCommerce REST API
                        and similar formats.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Feed Type</Label>
                        <Select value={feedType} onValueChange={setFeedType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="woocommerce">WooCommerce</SelectItem>
                            <SelectItem value="stage_one">Stage One</SelectItem>
                            <SelectItem value="custom">Custom JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Sync Interval</Label>
                        <Select
                          value={String(feedInterval)}
                          onValueChange={(v) => setFeedInterval(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">Every 15 minutes</SelectItem>
                            <SelectItem value="30">Every 30 minutes</SelectItem>
                            <SelectItem value="60">Every hour</SelectItem>
                            <SelectItem value="240">Every 4 hours</SelectItem>
                            <SelectItem value="1440">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        variant={feedEnabled ? 'default' : 'outline'}
                        onClick={() => setFeedEnabled(!feedEnabled)}
                        className="flex-1"
                      >
                        {feedEnabled ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Auto-Sync Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Auto-Sync Disabled
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            setError(null);
                            const res = await fetch(`/api/suppliers/${supplierId}/sync`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                feedUrl,
                                feedType,
                                enabled: feedEnabled,
                                intervalMinutes: feedInterval,
                              }),
                            });
                            if (!res.ok) throw new Error('Failed to save configuration');
                            const data = await res.json();
                            if (data.success) {
                              // Success notification could be added here
                            }
                          } catch (e: unknown) {
                            setError(e?.message || 'Failed to save configuration');
                          }
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save Configuration
                      </Button>

                      <Button
                        onClick={async () => {
                          try {
                            setFeedSyncing(true);
                            setError(null);
                            
                            // Start sync with extended timeout (5 minutes)
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 300000);
                            
                            const res = await fetch(`/api/suppliers/${supplierId}/sync`, {
                              method: 'POST',
                              signal: controller.signal,
                            });
                            clearTimeout(timeoutId);
                            
                            if (!res.ok) {
                              const errorData = await res.json().catch(() => ({ error: 'Sync request failed' }));
                              throw new Error(errorData.error || `Sync failed: ${res.status} ${res.statusText}`);
                            }
                            
                            const data = await res.json();
                            if (!data.success) {
                              throw new Error(data.error || 'Sync failed');
                            }
                            
                            // Reload sync logs, supplier status, recent uploads, and activity
                            const [statusRes, supplierRes] = await Promise.all([
                              fetch(`/api/suppliers/${supplierId}/sync`),
                              fetch(`/api/suppliers/v3/${supplierId}`),
                            ]);
                            
                            const statusData = await statusRes.json();
                            if (statusData.success && statusData.data?.logs) {
                              setFeedSyncLogs(statusData.data.logs);
                            }
                            
                            const supplierData = await supplierRes.json();
                            if (supplierData.success && supplierData.data) {
                              setSupplier(supplierData.data);
                            }
                            
                            // Refresh recent uploads and activity after sync completes
                            await Promise.all([loadUploads(), loadAudit()]);
                            
                          } catch (e: unknown) {
                            if (e.name === 'AbortError') {
                              setError('Sync is taking longer than expected. The sync may still be processing in the background. Please check sync history for status.');
                            } else {
                              setError(e?.message || 'Sync failed');
                            }
                          } finally {
                            setFeedSyncing(false);
                          }
                        }}
                        disabled={!feedUrl || feedSyncing}
                      >
                        {feedSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last Sync Status</Label>
                      {supplier?.jsonFeedLastSync ? (
                        <div className="rounded-lg border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {new Date(supplier.jsonFeedLastSync).toLocaleString()}
                            </span>
                            <Badge
                              variant={
                                supplier.jsonFeedLastStatus?.success ? 'default' : 'destructive'
                              }
                            >
                              {supplier.jsonFeedLastStatus?.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          {supplier.jsonFeedLastStatus?.message && (
                            <p className="text-muted-foreground text-sm">
                              {supplier.jsonFeedLastStatus.message}
                            </p>
                          )}
                          {supplier.jsonFeedLastStatus?.productsUpdated !== undefined && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {supplier.jsonFeedLastStatus.productsUpdated} products updated
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                          No sync history yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PlusPortal Sync Configuration */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Database className="text-primary h-5 w-5" />
                  PlusPortal Automation
                </CardTitle>
                <CardDescription>
                  Automatically extract pricing and discount data from PlusPortal by logging in, selecting the supplier,
                  and scraping product data from the Shopping tab. Per-product discounts are synced as SKU-level discount rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Username</Label>
                      <Input
                        type="text"
                        value={plusPortalUsername}
                        onChange={(e) => setPlusPortalUsername(e.target.value)}
                        placeholder="charles@nxtleveltech.co.za"
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Password</Label>
                      <Input
                        type="password"
                        value={plusPortalPassword}
                        onChange={(e) => setPlusPortalPassword(e.target.value)}
                        placeholder={plusPortalCredentialsConfigured ? '••••••••' : 'Enter PlusPortal password'}
                        className="font-mono text-sm"
                      />
                      {plusPortalCredentialsConfigured && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Credentials configured - leave blank to keep existing
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sync Interval</Label>
                      <Select
                        value={String(plusPortalInterval)}
                        onValueChange={(v) => setPlusPortalInterval(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="60">Every hour</SelectItem>
                          <SelectItem value="240">Every 4 hours</SelectItem>
                          <SelectItem value="1440">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        variant={plusPortalEnabled ? 'default' : 'outline'}
                        onClick={() => setPlusPortalEnabled(!plusPortalEnabled)}
                        className="flex-1"
                      >
                        {plusPortalEnabled ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Auto-Sync Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Auto-Sync Disabled
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            setPlusPortalSaving(true);
                            setError(null);
                            if (!plusPortalUsername) {
                              toast({
                                title: 'Validation Error',
                                description: 'Username is required',
                                variant: 'destructive',
                              });
                              return;
                            }
                            
                            // Require password on first configuration
                            if (!plusPortalCredentialsConfigured && !plusPortalPassword) {
                              toast({
                                title: 'Validation Error',
                                description: 'Password is required for initial configuration',
                                variant: 'destructive',
                              });
                              return;
                            }
                            
                            const res = await fetch(`/api/suppliers/${supplierId}/plusportal-sync`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                username: plusPortalUsername,
                                password: plusPortalPassword || undefined, // Only send if provided
                                enabled: plusPortalEnabled,
                                intervalMinutes: plusPortalInterval,
                              }),
                            });
                            
                            const data = await res.json();
                            
                            if (!res.ok || data.success === false) {
                              // Handle error response
                              const errorMsg = data.error || data.details || `Failed to save: ${res.status} ${res.statusText}`;
                              throw new Error(errorMsg);
                            }
                            
                            if (data.success !== false) {
                              // Reload status to get updated config
                              const statusRes = await fetch(`/api/suppliers/${supplierId}/plusportal-sync`);
                              const statusData = await statusRes.json();
                              if (statusData.success && statusData.data?.config) {
                                const config = statusData.data.config;
                                setPlusPortalUsername(config.username || '');
                                // Don't reload password for security - but clear local field after save
                                setPlusPortalPassword('');
                                setPlusPortalEnabled(config.enabled || false);
                                setPlusPortalInterval(config.intervalMinutes || 1440);
                                // Update credentials configured state
                                // Password should be truthy and not empty string
                                const hasPassword = config.password && config.password.trim() !== '';
                                setPlusPortalCredentialsConfigured(!!(config.username && hasPassword));
                              }
                              toast({
                                title: 'Success',
                                description: 'PlusPortal configuration saved',
                              });
                            } else {
                              throw new Error(data.error || data.details || 'Failed to save configuration');
                            }
                          } catch (e: unknown) {
                            const errorMessage = e instanceof Error ? e.message : 'Failed to save configuration';
                            console.error('Failed to save PlusPortal configuration:', e);
                            toast({
                              title: 'Error',
                              description: errorMessage,
                              variant: 'destructive',
                            });
                            setError(errorMessage);
                          } finally {
                            setPlusPortalSaving(false);
                          }
                        }}
                        disabled={plusPortalSaving}
                      >
                        {plusPortalSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Save Configuration
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={async () => {
                          try {
                            setPlusPortalSyncing(true);
                            setError(null);
                            setCurrentSyncLogId(null);
                            
                            // Start sync with extended timeout (5 minutes)
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 300000);
                            
                            // Start polling for progress before making the request
                            let pollInterval: NodeJS.Timeout | null = null;
                            let currentLogId: string | null = null;
                            
                            const startPolling = () => {
                              pollInterval = setInterval(async () => {
                                try {
                                  const statusRes = await fetch(`/api/suppliers/${supplierId}/plusportal-sync`);
                                  const statusData = await statusRes.json();
                                  if (statusData.success && statusData.data?.recentLogs && statusData.data.recentLogs.length > 0) {
                                    const latestLog = statusData.data.recentLogs[0];
                                    setPlusPortalSyncLogs(statusData.data.recentLogs);
                                    
                                    // Set current log ID if not set
                                    if (!currentLogId && latestLog.logId) {
                                      currentLogId = latestLog.logId;
                                      setCurrentSyncLogId(latestLog.logId);
                                    }
                                    
                                    // Stop polling if sync is complete
                                    if (latestLog.status === 'completed' || latestLog.status === 'failed') {
                                      if (pollInterval) {
                                        clearInterval(pollInterval);
                                        pollInterval = null;
                                      }
                                      setPlusPortalSyncing(false);
                                      setCurrentSyncLogId(null);
                                      
                                      // Refresh recent uploads and activity after sync completes
                                      await Promise.all([loadUploads(), loadAudit()]);
                                      
                                      if (latestLog.status === 'completed') {
                                        toast({
                                          title: 'Sync Complete',
                                          description: `Processed ${latestLog.productsProcessed || 0} products, created ${latestLog.productsCreated || 0}, skipped ${latestLog.productsSkipped || 0}`,
                                        });
                                      } else {
                                        toast({
                                          title: 'Sync Failed',
                                          description: latestLog.errors?.[0] || 'Sync failed',
                                          variant: 'destructive',
                                        });
                                      }
                                    }
                                  }
                                } catch (pollError) {
                                  console.error('Error polling sync status:', pollError);
                                }
                              }, 1000); // Poll every second
                            };
                            
                            startPolling();
                            
                            const res = await fetch(`/api/suppliers/${supplierId}/plusportal-sync`, {
                              method: 'POST',
                              signal: controller.signal,
                            });
                            clearTimeout(timeoutId);
                            
                            // Stop polling - sync request completed
                            if (pollInterval) {
                              clearInterval(pollInterval);
                              pollInterval = null;
                            }
                            
                            if (!res.ok) {
                              const errorData = await res.json().catch(() => ({ error: 'Sync request failed' }));
                              throw new Error(errorData.error || `Sync failed: ${res.status} ${res.statusText}`);
                            }
                            
                            const data = await res.json();
                            if (!data.success) {
                              throw new Error(data.error || 'Sync failed');
                            }
                            
                            // Reload sync status one final time
                            const statusRes = await fetch(`/api/suppliers/${supplierId}/plusportal-sync`);
                            const statusData = await statusRes.json();
                            if (statusData.success && statusData.data?.recentLogs) {
                              setPlusPortalSyncLogs(statusData.data.recentLogs);
                            }
                            
                            // Refresh recent uploads and activity after sync completes
                            await Promise.all([loadUploads(), loadAudit()]);
                            
                            // Show success toast
                            toast({
                              title: 'Sync Complete',
                              description: `Processed ${data.data?.productsProcessed || 0} products, created ${data.data?.productsCreated || 0}, updated ${data.data?.productsUpdated || 0}`,
                            });
                            
                          } catch (e: unknown) {
                            if (e.name === 'AbortError') {
                              toast({
                                title: 'Sync Timeout',
                                description: 'Sync is taking longer than expected. Check sync history for status.',
                                variant: 'destructive',
                              });
                            } else {
                              toast({
                                title: 'Sync Failed',
                                description: e?.message || 'Sync failed',
                                variant: 'destructive',
                              });
                            }
                          } finally {
                            setPlusPortalSyncing(false);
                            setCurrentSyncLogId(null);
                          }
                        }}
                        disabled={!plusPortalCredentialsConfigured || plusPortalSyncing}
                        title={!plusPortalCredentialsConfigured ? 'Save credentials first to enable sync' : undefined}
                      >
                        {plusPortalSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last Sync Status</Label>
                      {plusPortalSyncLogs.length > 0 ? (
                        <div className="rounded-lg border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {new Date(plusPortalSyncLogs[0].syncStartedAt).toLocaleString()}
                            </span>
                            <Badge
                              variant={
                                plusPortalSyncLogs[0].status === 'completed' ? 'default' : 
                                plusPortalSyncLogs[0].status === 'failed' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {plusPortalSyncLogs[0].status}
                            </Badge>
                          </div>
                          
                          {/* Progress indicator */}
                          {(plusPortalSyncing || plusPortalSyncLogs[0].status === 'in_progress') && (
                            <div className="mb-3 space-y-2">
                              {plusPortalSyncLogs[0].currentStage && (
                                <div className="text-sm text-muted-foreground">
                                  {plusPortalSyncLogs[0].currentStage}
                                </div>
                              )}
                              {plusPortalSyncLogs[0].progressPercent !== undefined && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="text-muted-foreground">{plusPortalSyncLogs[0].progressPercent}%</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full bg-primary transition-all duration-300"
                                      style={{ width: `${plusPortalSyncLogs[0].progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-muted-foreground mt-1 text-xs">
                            {plusPortalSyncLogs[0].productsProcessed} processed,{' '}
                            {plusPortalSyncLogs[0].productsCreated} created,{' '}
                            {plusPortalSyncLogs[0].productsSkipped} skipped
                          </div>
                          {plusPortalSyncLogs[0].errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-500">
                              {plusPortalSyncLogs[0].errors.slice(0, 3).join(', ')}
                              {plusPortalSyncLogs[0].errors.length > 3 && '...'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                          No sync history yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PlusPortal Sync Logs */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <History className="text-primary h-5 w-5" />
                  PlusPortal Sync History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {plusPortalSyncLogs.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {plusPortalSyncLogs.map((log) => (
                        <div
                          key={log.logId}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Clock className="text-muted-foreground h-4 w-4" />
                              <span className="text-sm font-medium">
                                {new Date(log.syncStartedAt).toLocaleString()}
                                {log.syncCompletedAt &&
                                  ` → ${new Date(log.syncCompletedAt).toLocaleString()}`}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {log.productsProcessed} processed, {log.productsCreated} created,{' '}
                              {log.productsSkipped} skipped
                            </div>
                            {log.errors.length > 0 && (
                              <div className="mt-1 text-xs text-red-500">
                                {log.errors.slice(0, 3).join(', ')}
                                {log.errors.length > 3 && '...'}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={
                              log.status === 'completed'
                                ? 'default'
                                : log.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
                    <p className="text-muted-foreground text-sm">No PlusPortal sync history yet</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Configure credentials above and run your first sync
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* JSON Feed Sync Logs */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <History className="text-primary h-5 w-5" />
                  JSON Feed Sync History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedSyncLogs.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {feedSyncLogs.map((log) => (
                        <div
                          key={log.logId}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Clock className="text-muted-foreground h-4 w-4" />
                              <span className="text-sm font-medium">
                                {new Date(log.syncStartedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {log.productsUpdated} updated, {log.productsCreated} created
                              {log.productsFailed > 0 && `, ${log.productsFailed} failed`}
                            </div>
                            {log.errorMessage && (
                              <div className="mt-1 text-xs text-red-500">{log.errorMessage}</div>
                            )}
                          </div>
                          <Badge
                            variant={
                              log.status === 'success'
                                ? 'default'
                                : log.status === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
                    <p className="text-muted-foreground text-sm">No sync history yet</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Configure a feed URL above and run your first sync
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function SupplierProfilePage() {
  return (
    <Suspense
      fallback={
        <AppLayout
          title="Supplier Profile"
          breadcrumbs={[
            { label: 'Suppliers', href: '/suppliers' },
            { label: 'Directory', href: '/directories/suppliers' },
            { label: 'Profile' },
          ]}
        >
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader
              title="Loading supplier profile..."
              subtitle="Please wait while we fetch the supplier information"
              size="md"
            />
          </div>
        </AppLayout>
      }
    >
      <SupplierProfileContent />
    </Suspense>
  );
}
