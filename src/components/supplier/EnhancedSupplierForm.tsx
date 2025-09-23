/**
 * Enhanced Supplier Form with AI Discovery Integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { SupplierDiscoveryWidget } from './SupplierDiscoveryWidget';
import { DiscoveredSupplierData } from '@/lib/supplier-discovery/types';
import {
  Building2,
  User,
  MapPin,
  DollarSign,
  Star,
  Save,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Bot
} from 'lucide-react';

// Enhanced form schema with AI discovery fields
const supplierFormSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Supplier name is required'),
  legal_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),

  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('South Africa'),

  // Business Information
  contact_person: z.string().optional(),
  tax_id: z.string().optional(),
  registration_number: z.string().optional(),
  payment_terms: z.string().optional(),
  primary_category: z.string().optional(),
  geographic_region: z.string().optional(),
  industry: z.string().optional(),

  // Compliance
  bee_level: z.string().optional(),
  local_content_percentage: z.number().min(0).max(100).optional(),
  vat_number: z.string().optional(),

  // Preferences
  preferred_supplier: z.boolean().default(false),

  // AI Discovery metadata
  ai_discovered: z.boolean().default(false),
  discovery_confidence: z.number().optional(),
  discovery_sources: z.array(z.string()).optional()
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface EnhancedSupplierFormProps {
  onSubmit: (data: SupplierFormValues) => Promise<void>;
  initialData?: Partial<SupplierFormValues>;
  isEditing?: boolean;
}

export function EnhancedSupplierForm({
  onSubmit,
  initialData,
  isEditing = false
}: EnhancedSupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(!isEditing);
  const [aiData, setAiData] = useState<DiscoveredSupplierData | null>(null);
  const [autoFillApplied, setAutoFillApplied] = useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      legal_name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'South Africa',
      contact_person: '',
      tax_id: '',
      registration_number: '',
      payment_terms: 'Net 30',
      primary_category: '',
      geographic_region: '',
      industry: '',
      bee_level: '',
      local_content_percentage: undefined,
      vat_number: '',
      preferred_supplier: false,
      ai_discovered: false,
      discovery_confidence: undefined,
      discovery_sources: [],
      ...initialData
    }
  });

  // Handle AI data auto-fill
  const handleAutoFill = (discoveredData: DiscoveredSupplierData) => {
    setAiData(discoveredData);

    // Map discovered data to form fields
    const updates: Partial<SupplierFormValues> = {
      name: discoveredData.supplierName,
      registration_number: discoveredData.registrationNumber || undefined,
      phone: discoveredData.contactInfo.phone || undefined,
      email: discoveredData.contactInfo.email || undefined,
      website: discoveredData.contactInfo.website || undefined,
      industry: discoveredData.businessInfo.industry || undefined,

      // Address fields
      address: discoveredData.address.street || undefined,
      city: discoveredData.address.city || undefined,
      province: discoveredData.address.province || undefined,
      postal_code: discoveredData.address.postalCode || undefined,
      country: discoveredData.address.country || 'South Africa',

      // Compliance
      bee_level: discoveredData.compliance.beeRating || undefined,
      vat_number: discoveredData.compliance.vatNumber || undefined,

      // AI metadata
      ai_discovered: true,
      discovery_confidence: discoveredData.confidence.overall,
      discovery_sources: discoveredData.sources
    };

    // Update form with discovered data
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        form.setValue(key as keyof SupplierFormValues, value);
      }
    });

    setAutoFillApplied(true);
  };

  const handleFormSubmit = async (data: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Discovery Section */}
      {showDiscovery && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              AI-Powered Supplier Discovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierDiscoveryWidget
              onAutoFill={handleAutoFill}
              className="bg-white rounded-lg p-4"
            />
            {autoFillApplied && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Form auto-filled with AI-discovered data! Review and adjust as needed.
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowDiscovery(false)}
                    className="ml-2 p-0 h-auto text-green-700"
                  >
                    Hide Discovery Panel
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                    {aiData && (
                      <Badge variant="secondary" className="ml-auto">
                        AI Discovered ({Math.round((aiData.confidence.overall || 0) * 100)}% confidence)
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter supplier name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legal_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Legal company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registration_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2001/123456/07" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="Primary industry" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="preferred_supplier"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Preferred Supplier</FormLabel>
                          <p className="text-sm text-gray-600">
                            Mark as a preferred supplier for prioritized sourcing
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Information Tab */}
            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="supplier@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+27 11 123 4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="Primary contact name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address
                    </h3>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select province" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Gauteng">Gauteng</SelectItem>
                                <SelectItem value="Western Cape">Western Cape</SelectItem>
                                <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                                <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                                <SelectItem value="Free State">Free State</SelectItem>
                                <SelectItem value="Limpopo">Limpopo</SelectItem>
                                <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                                <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                                <SelectItem value="North West">North West</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Information Tab */}
            <TabsContent value="business" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primary_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Technology, Manufacturing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="geographic_region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geographic Region</FormLabel>
                          <FormControl>
                            <Input placeholder="Primary operating region" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Net 7">Net 7 days</SelectItem>
                              <SelectItem value="Net 15">Net 15 days</SelectItem>
                              <SelectItem value="Net 30">Net 30 days</SelectItem>
                              <SelectItem value="Net 45">Net 45 days</SelectItem>
                              <SelectItem value="Net 60">Net 60 days</SelectItem>
                              <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                              <SelectItem value="Prepaid">Prepaid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax identification number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Compliance & Certification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bee_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BEE Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select BEE level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Level 1">Level 1</SelectItem>
                              <SelectItem value="Level 2">Level 2</SelectItem>
                              <SelectItem value="Level 3">Level 3</SelectItem>
                              <SelectItem value="Level 4">Level 4</SelectItem>
                              <SelectItem value="Level 5">Level 5</SelectItem>
                              <SelectItem value="Level 6">Level 6</SelectItem>
                              <SelectItem value="Level 7">Level 7</SelectItem>
                              <SelectItem value="Level 8">Level 8</SelectItem>
                              <SelectItem value="Non-compliant">Non-compliant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="local_content_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Content Percentage</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0-100"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vat_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="4000000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* AI Discovery Metadata */}
                  {aiData && (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">AI Discovery Information</h3>
                      <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                        <div>Confidence: {Math.round((aiData.confidence.overall || 0) * 100)}%</div>
                        <div>Sources: {aiData.sources.length} data sources used</div>
                        <div>Discovered: {new Date(aiData.discoveredAt).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div>
              {!showDiscovery && !isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDiscovery(true)}
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Use AI Discovery
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditing ? 'Update Supplier' : 'Create Supplier'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}