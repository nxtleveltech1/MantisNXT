'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';

import {
  Brain,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Target,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  EyeOff,
  Bot,
  User,
  Shield,
  DollarSign,
  Activity,
  Loader2,
  Save,
  X,
} from 'lucide-react';

// Form Schema
const supplierFormSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(2, 'Company name is required'),
    legalName: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email('Valid email required'),
    phone: z.string().min(10, 'Valid phone number required'),
    taxId: z.string().optional(),
    registrationNumber: z.string().optional(),
  }),
  address: z.object({
    street: z.string().min(1, 'Street address required'),
    city: z.string().min(1, 'City required'),
    state: z.string().min(1, 'State/Province required'),
    postalCode: z.string().min(3, 'Postal code required'),
    country: z.string().min(2, 'Country required'),
  }),
  businessDetails: z.object({
    category: z.string().min(1, 'Primary category required'),
    subCategory: z.string().optional(),
    industryType: z.string().optional(),
    businessSize: z.enum(['micro', 'small', 'medium', 'large', 'enterprise']),
    yearsInOperation: z.number().min(0).max(200),
    employeeCount: z.number().min(1),
    annualRevenue: z.number().optional(),
    certifications: z.array(z.string()).optional(),
    specializations: z.array(z.string()).optional(),
  }),
  financialInfo: z.object({
    paymentTerms: z.string().optional(),
    currency: z.string().min(3, 'Currency required'),
    bankDetails: z
      .object({
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        routingNumber: z.string().optional(),
      })
      .optional(),
    taxStatus: z.string().optional(),
    vatNumber: z.string().optional(),
  }),
  capabilities: z.object({
    productCategories: z.array(z.string()),
    serviceOfferings: z.array(z.string()),
    geographicCoverage: z.array(z.string()),
    capacity: z
      .object({
        monthlyVolume: z.number().optional(),
        leadTime: z.number().optional(),
        minimumOrderQuantity: z.number().optional(),
        maximumOrderQuantity: z.number().optional(),
      })
      .optional(),
    qualityStandards: z.array(z.string()).optional(),
    complianceFrameworks: z.array(z.string()).optional(),
  }),
  sustainability: z
    .object({
      sustainabilityRating: z.number().min(1).max(5).optional(),
      environmentalCertifications: z.array(z.string()).optional(),
      carbonFootprintReduction: z.boolean().optional(),
      sustainabilityReportUrl: z.string().url().optional().or(z.literal('')),
      socialImpactInitiatives: z.array(z.string()).optional(),
    })
    .optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

// AI Assistance Types
interface AIFormSuggestion {
  field: string;
  value: string | number | boolean;
  confidence: number;
  reason: string;
  source: string;
}

interface AIValidationResult {
  isValid: boolean;
  score: number;
  issues: Array<{
    field: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  recommendations: string[];
}

interface AIComplianceCheck {
  framework: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  requirements: Array<{
    requirement: string;
    met: boolean;
    evidence?: string;
    recommendation?: string;
  }>;
}

interface AIEnhancedSupplierFormProps {
  initialData?: Partial<SupplierFormData>;
  mode: 'create' | 'edit';
  onSubmit: (data: SupplierFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function AIEnhancedSupplierForm({
  initialData,
  mode,
  onSubmit,
  onCancel,
}: AIEnhancedSupplierFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [aiSuggestions, setAiSuggestions] = useState<AIFormSuggestion[]>([]);
  const [validationResult, setValidationResult] = useState<AIValidationResult | null>(null);
  const [complianceChecks, setComplianceChecks] = useState<AIComplianceCheck[]>([]);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(true);
  const [completionScore, setCompletionScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty: _isDirty, isValid },
    trigger: _trigger,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialData || {
      basicInfo: {},
      address: {},
      businessDetails: {
        businessSize: 'small',
        yearsInOperation: 1,
        employeeCount: 1,
        certifications: [],
        specializations: [],
      },
      financialInfo: {
        currency: 'ZAR',
        bankDetails: {},
      },
      capabilities: {
        productCategories: [],
        serviceOfferings: [],
        geographicCoverage: [],
        capacity: {},
        qualityStandards: [],
        complianceFrameworks: [],
      },
      sustainability: {
        environmentalCertifications: [],
        socialImpactInitiatives: [],
      },
    },
    mode: 'onChange',
  });

  const formData = watch();

  // AI-powered auto-completion and suggestions
  const generateAISuggestions = useCallback(
    async (field?: string) => {
      if (!formData.basicInfo.name && !formData.basicInfo.website) return;

      setIsAiAnalyzing(true);
      try {
        const response = await fetch('/api/ai/suppliers/form-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: getValues(),
            focusField: field,
            mode,
          }),
        });

        if (response.ok) {
          const { suggestions, validation, compliance } = await response.json();
          setAiSuggestions(suggestions || []);
          setValidationResult(validation);
          setComplianceChecks(compliance || []);
        }
      } catch (error) {
        console.error('AI assistance error:', error);
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [formData, getValues, mode]
  );

  // Calculate form completion score
  useEffect(() => {
    const calculateCompletionScore = () => {
      const totalFields = 25; // Estimated important fields
      let completedFields = 0;

      if (formData.basicInfo.name) completedFields++;
      if (formData.basicInfo.email) completedFields++;
      if (formData.basicInfo.phone) completedFields++;
      if (formData.basicInfo.website) completedFields++;
      if (formData.address.street) completedFields++;
      if (formData.address.city) completedFields++;
      if (formData.address.country) completedFields++;
      if (formData.businessDetails.category) completedFields++;
      if (formData.businessDetails.businessSize) completedFields++;
      if (formData.businessDetails.employeeCount) completedFields++;
      if (formData.financialInfo.currency) completedFields++;
      if (formData.capabilities.productCategories.length > 0) completedFields += 2;
      if (formData.capabilities.serviceOfferings.length > 0) completedFields += 2;
      if (formData.capabilities.geographicCoverage.length > 0) completedFields++;
      if (formData.businessDetails.certifications?.length > 0) completedFields += 2;
      // Add more field checks...

      setCompletionScore(Math.round((completedFields / totalFields) * 100));
    };

    calculateCompletionScore();
  }, [formData]);

  // Auto-trigger AI suggestions when key fields are populated
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.basicInfo.name || formData.basicInfo.website) {
        generateAISuggestions();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData.basicInfo.name, formData.basicInfo.website, generateAISuggestions]);

  const applySuggestion = (suggestion: AIFormSuggestion) => {
    setValue(suggestion.field as unknown, suggestion.value, { shouldValidate: true });
    setAiSuggestions(prev => prev.filter(s => s.field !== suggestion.field));
  };

  const dismissSuggestion = (field: string) => {
    setAiSuggestions(prev => prev.filter(s => s.field !== field));
  };

  const onFormSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'business', label: 'Business Details', icon: FileText },
    { id: 'financial', label: 'Financial Info', icon: DollarSign },
    { id: 'capabilities', label: 'Capabilities', icon: Target },
    { id: 'sustainability', label: 'Sustainability', icon: Activity },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  {mode === 'create' ? 'Add New Supplier' : 'Edit Supplier'}
                  {isAiAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground text-sm">
                    Completion: {completionScore}%
                  </div>
                  <Progress value={completionScore} className="h-2 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-6">
                    {tabs.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                          <Icon className="mr-1 h-3 w-3" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="name">Company Name *</Label>
                        <Controller
                          name="basicInfo.name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="name"
                              placeholder="Enter company name"
                              className={errors.basicInfo?.name ? 'border-red-500' : ''}
                            />
                          )}
                        />
                        {errors.basicInfo?.name && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.basicInfo.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="legalName">Legal Name</Label>
                        <Controller
                          name="basicInfo.legalName"
                          control={control}
                          render={({ field }) => (
                            <Input {...field} id="legalName" placeholder="Legal business name" />
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Controller
                          name="basicInfo.website"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Globe className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                              <Input
                                {...field}
                                id="website"
                                placeholder="https://example.com"
                                className={`pl-10 ${errors.basicInfo?.website ? 'border-red-500' : ''}`}
                              />
                            </div>
                          )}
                        />
                        {errors.basicInfo?.website && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.basicInfo.website.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Controller
                          name="basicInfo.email"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                              <Input
                                {...field}
                                id="email"
                                type="email"
                                placeholder="contact@supplier.com"
                                className={`pl-10 ${errors.basicInfo?.email ? 'border-red-500' : ''}`}
                              />
                            </div>
                          )}
                        />
                        {errors.basicInfo?.email && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.basicInfo.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Controller
                          name="basicInfo.phone"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                              <Input
                                {...field}
                                id="phone"
                                placeholder="+27 11 123 4567"
                                className={`pl-10 ${errors.basicInfo?.phone ? 'border-red-500' : ''}`}
                              />
                            </div>
                          )}
                        />
                        {errors.basicInfo?.phone && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.basicInfo.phone.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="taxId">Tax ID</Label>
                        <Controller
                          name="basicInfo.taxId"
                          control={control}
                          render={({ field }) => (
                            <Input {...field} id="taxId" placeholder="Tax identification number" />
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="registrationNumber">Registration Number</Label>
                        <Controller
                          name="basicInfo.registrationNumber"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="registrationNumber"
                              placeholder="Business registration number"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Address Tab */}
                  <TabsContent value="address" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label htmlFor="street">Street Address *</Label>
                        <Controller
                          name="address.street"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="street"
                              placeholder="123 Business Street"
                              className={errors.address?.street ? 'border-red-500' : ''}
                            />
                          )}
                        />
                        {errors.address?.street && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.address.street.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Controller
                          name="address.city"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="city"
                              placeholder="Johannesburg"
                              className={errors.address?.city ? 'border-red-500' : ''}
                            />
                          )}
                        />
                        {errors.address?.city && (
                          <p className="mt-1 text-sm text-red-500">{errors.address.city.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="state">State/Province *</Label>
                        <Controller
                          name="address.state"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="state"
                              placeholder="Gauteng"
                              className={errors.address?.state ? 'border-red-500' : ''}
                            />
                          )}
                        />
                        {errors.address?.state && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.address.state.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Controller
                          name="address.postalCode"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="postalCode"
                              placeholder="2001"
                              className={errors.address?.postalCode ? 'border-red-500' : ''}
                            />
                          )}
                        />
                        {errors.address?.postalCode && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.address.postalCode.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="country">Country *</Label>
                        <Controller
                          name="address.country"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger
                                className={errors.address?.country ? 'border-red-500' : ''}
                              >
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ZA">South Africa</SelectItem>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="UK">United Kingdom</SelectItem>
                                <SelectItem value="DE">Germany</SelectItem>
                                <SelectItem value="FR">France</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.address?.country && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.address.country.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Business Details Tab */}
                  <TabsContent value="business" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="category">Primary Category *</Label>
                        <Controller
                          name="businessDetails.category"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger
                                className={errors.businessDetails?.category ? 'border-red-500' : ''}
                              >
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="technology">Technology</SelectItem>
                                <SelectItem value="services">Professional Services</SelectItem>
                                <SelectItem value="construction">Construction</SelectItem>
                                <SelectItem value="logistics">
                                  Logistics & Transportation
                                </SelectItem>
                                <SelectItem value="retail">Retail & Distribution</SelectItem>
                                <SelectItem value="healthcare">Healthcare</SelectItem>
                                <SelectItem value="energy">Energy & Utilities</SelectItem>
                                <SelectItem value="agriculture">Agriculture</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.businessDetails?.category && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.businessDetails.category.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="businessSize">Business Size *</Label>
                        <Controller
                          name="businessDetails.businessSize"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="micro">Micro (1-5 employees)</SelectItem>
                                <SelectItem value="small">Small (6-50 employees)</SelectItem>
                                <SelectItem value="medium">Medium (51-250 employees)</SelectItem>
                                <SelectItem value="large">Large (251-1000 employees)</SelectItem>
                                <SelectItem value="enterprise">
                                  Enterprise (1000+ employees)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="yearsInOperation">Years in Operation *</Label>
                        <Controller
                          name="businessDetails.yearsInOperation"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="yearsInOperation"
                              type="number"
                              min="0"
                              max="200"
                              placeholder="5"
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="employeeCount">Employee Count *</Label>
                        <Controller
                          name="businessDetails.employeeCount"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="employeeCount"
                              type="number"
                              min="1"
                              placeholder="25"
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Financial Information Tab */}
                  <TabsContent value="financial" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="paymentTerms">Payment Terms</Label>
                        <Controller
                          name="financialInfo.paymentTerms"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="net_15">Net 15</SelectItem>
                                <SelectItem value="net_30">Net 30</SelectItem>
                                <SelectItem value="net_45">Net 45</SelectItem>
                                <SelectItem value="net_60">Net 60</SelectItem>
                                <SelectItem value="cod">Cash on Delivery</SelectItem>
                                <SelectItem value="advance">Advance Payment</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="currency">Currency *</Label>
                        <Controller
                          name="financialInfo.currency"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Capabilities Tab */}
                  <TabsContent value="capabilities" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Product Categories</Label>
                        <div className="mt-2">
                          {formData.capabilities.productCategories.map((category, index) => (
                            <Badge key={index} variant="secondary" className="mr-2 mb-2">
                              {category}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newCategories =
                                    formData.capabilities.productCategories.filter(
                                      (_, i) => i !== index
                                    );
                                  setValue('capabilities.productCategories', newCategories);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Service Offerings</Label>
                        <div className="mt-2">
                          {formData.capabilities.serviceOfferings.map((service, index) => (
                            <Badge key={index} variant="secondary" className="mr-2 mb-2">
                              {service}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newServices = formData.capabilities.serviceOfferings.filter(
                                    (_, i) => i !== index
                                  );
                                  setValue('capabilities.serviceOfferings', newServices);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Sustainability Tab */}
                  <TabsContent value="sustainability" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="sustainabilityRating">Sustainability Rating</Label>
                        <Controller
                          name="sustainability.sustainabilityRating"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={value => field.onChange(parseInt(value))}
                              defaultValue={field.value?.toString()}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Rate sustainability efforts" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 - Basic</SelectItem>
                                <SelectItem value="2">2 - Developing</SelectItem>
                                <SelectItem value="3">3 - Moderate</SelectItem>
                                <SelectItem value="4">4 - Advanced</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="sustainabilityReportUrl">Sustainability Report URL</Label>
                        <Controller
                          name="sustainability.sustainabilityReportUrl"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="sustainabilityReportUrl"
                              placeholder="https://example.com/sustainability-report.pdf"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Form Actions */}
                <div className="flex items-center justify-between border-t pt-6">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateAISuggestions()}
                      disabled={isAiAnalyzing}
                    >
                      {isAiAnalyzing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      AI Assist
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !isValid}>
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {mode === 'create' ? 'Create Supplier' : 'Update Supplier'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {showAiAssistant && (
            <>
              {/* AI Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      AI Suggestions
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAiAssistant(false)}>
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {aiSuggestions.map(suggestion => (
                        <div key={suggestion.field} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-start justify-between">
                            <span className="text-sm font-medium">
                              {suggestion.field.split('.').pop()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.confidence}%
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-2 text-sm">{suggestion.reason}</p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => applySuggestion(suggestion)}>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => dismissSuggestion(suggestion.field)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {aiSuggestions.length === 0 && !isAiAnalyzing && (
                        <div className="text-muted-foreground py-4 text-center">
                          <Bot className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          <p className="text-sm">
                            No suggestions yet. Fill out more fields to get AI assistance.
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Validation Results */}
              {validationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <Shield className="mr-2 inline h-4 w-4" />
                      Validation Score: {validationResult.score}/100
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={validationResult.score} className="mb-4" />
                    <div className="space-y-2">
                      {validationResult.issues.map((issue, index) => (
                        <Alert
                          key={index}
                          variant={issue.severity === 'error' ? 'destructive' : 'default'}
                        >
                          <AlertDescription className="text-sm">
                            <strong>{issue.field}:</strong> {issue.message}
                            {issue.suggestion && (
                              <div className="mt-1 text-xs">💡 {issue.suggestion}</div>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compliance Checks */}
              {complianceChecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <CheckCircle className="mr-2 inline h-4 w-4" />
                      Compliance Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {complianceChecks.map(check => (
                        <div key={check.framework} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{check.framework}</span>
                            <Badge
                              className={
                                check.status === 'compliant'
                                  ? 'bg-green-100 text-green-800'
                                  : check.status === 'partial'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }
                            >
                              {check.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {check.requirements.slice(0, 2).map((req, index) => (
                              <div key={index} className="flex items-start gap-2 text-xs">
                                {req.met ? (
                                  <CheckCircle className="mt-0.5 h-3 w-3 text-green-500" />
                                ) : (
                                  <AlertTriangle className="mt-0.5 h-3 w-3 text-red-500" />
                                )}
                                <span>{req.requirement}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!showAiAssistant && (
            <Button variant="outline" onClick={() => setShowAiAssistant(true)} className="w-full">
              <Eye className="mr-2 h-4 w-4" />
              Show AI Assistant
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
