"use client"

import React, { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Supplier, SupplierContact, SupplierAddress } from "@/types/supplier"
import { useSuppliers } from "@/hooks/useSuppliers"
import { useRouter } from "next/navigation"
import {
  Building2,
  User,
  MapPin,
  DollarSign,
  Star,
  Plus,
  Trash2,
  Save,
  X,
  Upload,
  AlertTriangle,
  CheckCircle,
  Globe,
  Phone,
  Mail,
  Calendar,
  FileText,
  Settings
} from "lucide-react"

// Validation schemas
const contactSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["primary", "billing", "technical", "sales", "support"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().min(2, "Title is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  mobile: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const addressSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["headquarters", "billing", "shipping", "warehouse", "manufacturing"]),
  name: z.string().optional(),
  addressLine1: z.string().min(5, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Supplier name is required"),
  code: z.string().min(3, "Supplier code must be at least 3 characters"),
  status: z.enum(["active", "inactive", "pending", "suspended"]),
  tier: z.enum(["strategic", "preferred", "approved", "conditional"]),
  category: z.string().min(2, "Category is required"),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // Business Information
  businessInfo: z.object({
    legalName: z.string().min(2, "Legal name is required"),
    tradingName: z.string().optional(),
    taxId: z.string().min(5, "Tax ID is required"),
    registrationNumber: z.string().min(3, "Registration number is required"),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
    employeeCount: z.number().min(1).optional(),
    annualRevenue: z.number().min(0).optional(),
    currency: z.string().length(3, "Currency must be 3 characters"),
  }),

  // Capabilities
  capabilities: z.object({
    products: z.array(z.string()).default([]),
    services: z.array(z.string()).default([]),
    leadTime: z.number().min(1, "Lead time must be at least 1 day"),
    paymentTerms: z.string().min(3, "Payment terms are required"),
  }),

  // Financial
  financial: z.object({
    creditRating: z.string().optional(),
    paymentTerms: z.string().min(3, "Payment terms are required"),
    currency: z.string().length(3, "Currency must be 3 characters"),
  }),

  // Contacts and Addresses
  contacts: z.array(contactSchema).min(1, "At least one contact is required"),
  addresses: z.array(addressSchema).min(1, "At least one address is required"),

  // Notes
  notes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierFormProps {
  supplier?: Supplier
  onSubmit?: (data: SupplierFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  supplier,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const router = useRouter()
  const { createSupplier, updateSupplier, loading: apiLoading, error: apiError } = useSuppliers({ autoFetch: false })
  const [activeTab, setActiveTab] = useState("basic")
  const [tagInput, setTagInput] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier ? {
      ...supplier,
      subcategory: supplier.subcategory || "",
      businessInfo: {
        ...supplier.businessInfo,
        website: supplier.businessInfo.website || "",
        tradingName: supplier.businessInfo.tradingName || "",
      },
      contacts: supplier.contacts.map(contact => ({
        ...contact,
        mobile: contact.mobile || "",
        department: contact.department || "",
      })),
      addresses: supplier.addresses.map(address => ({
        ...address,
        name: address.name || "",
        addressLine2: address.addressLine2 || "",
      })),
      notes: supplier.notes || "",
    } : {
      name: "",
      code: "",
      status: "pending",
      tier: "approved",
      category: "",
      subcategory: "",
      tags: [],
      businessInfo: {
        legalName: "",
        tradingName: "",
        taxId: "",
        registrationNumber: "",
        website: "",
        foundedYear: undefined,
        employeeCount: undefined,
        annualRevenue: undefined,
        currency: "ZAR",
      },
      capabilities: {
        products: [],
        services: [],
        leadTime: 30,
        paymentTerms: "Net 30",
      },
      financial: {
        creditRating: "",
        paymentTerms: "Net 30",
        currency: "ZAR",
      },
      contacts: [{
        type: "primary",
        name: "",
        title: "",
        email: "",
        phone: "",
        mobile: "",
        department: "",
        isPrimary: true,
        isActive: true,
      }],
      addresses: [{
        type: "headquarters",
        name: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "South Africa",
        isPrimary: true,
        isActive: true,
      }],
      notes: "",
    }
  })

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "contacts"
  })

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses"
  })

  const watchedTags = form.watch("tags")

  const handleSubmit = async (data: SupplierFormData) => {
    try {
      setSubmitError(null)
      setSubmitSuccess(false)

      if (onSubmit) {
        await onSubmit(data)
      } else {
        // Convert form data to API format
        const apiData = {
          name: data.name,
          code: data.code,
          legalName: data.businessInfo.legalName,
          website: data.businessInfo.website,
          industry: data.category, // Map category to industry
          tier: data.tier,
          status: data.status,
          category: data.category,
          subcategory: data.subcategory,
          tags: data.tags,
          primaryContact: {
            name: data.contacts[0]?.name || '',
            title: data.contacts[0]?.title || '',
            email: data.contacts[0]?.email || '',
            phone: data.contacts[0]?.phone || '',
            department: data.contacts[0]?.department,
          },
          taxId: data.businessInfo.taxId,
          registrationNumber: data.businessInfo.registrationNumber,
          foundedYear: data.businessInfo.foundedYear,
          employeeCount: data.businessInfo.employeeCount,
          annualRevenue: data.businessInfo.annualRevenue,
          currency: data.businessInfo.currency,
          address: {
            street: data.addresses[0]?.addressLine1 || '',
            city: data.addresses[0]?.city || '',
            state: data.addresses[0]?.state || '',
            postalCode: data.addresses[0]?.postalCode || '',
            country: data.addresses[0]?.country || '',
          },
          products: data.capabilities.products,
          services: data.capabilities.services,
          certifications: [], // TODO: Add certifications to form
          leadTime: data.capabilities.leadTime,
          minimumOrderValue: undefined, // TODO: Add to form
          paymentTerms: data.capabilities.paymentTerms,
        }

        if (supplier?.id) {
          await updateSupplier(supplier.id, apiData)
        } else {
          await createSupplier(apiData)
        }

        setSubmitSuccess(true)

        // Redirect after successful creation/update
        setTimeout(() => {
          router.push('/suppliers')
        }, 1500)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save supplier')
      console.error("Form submission error:", error)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      form.setValue("tags", [...watchedTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue("tags", watchedTags.filter(tag => tag !== tagToRemove))
  }

  const addContact = () => {
    appendContact({
      type: "technical",
      name: "",
      title: "",
      email: "",
      phone: "",
      mobile: "",
      department: "",
      isPrimary: false,
      isActive: true,
    })
  }

  const addAddress = () => {
    appendAddress({
      type: "billing",
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "USA",
      isPrimary: false,
      isActive: true,
    })
  }

  const breadcrumbs = [
    { label: "Suppliers", href: "/suppliers" },
    { label: supplier ? "Edit Supplier" : "Add Supplier" }
  ]

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {supplier ? "Edit Supplier" : "Add New Supplier"}
            </h1>
            <p className="text-muted-foreground">
              {supplier ? "Update supplier information and settings" : "Create a new supplier profile"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onCancel ? onCancel() : router.push('/suppliers')}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isLoading || apiLoading}
            >
              {(isLoading || apiLoading) ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  {supplier ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {supplier ? "Update" : "Create"} Supplier
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="p-4 border border-green-300 bg-green-50 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">
              Supplier {supplier ? 'updated' : 'created'} successfully! Redirecting...
            </p>
          </div>
        )}

        {(submitError || apiError) && (
          <div className="p-4 border border-red-300 bg-red-50 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">
              {submitError || apiError}
            </p>
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              </TabsList>

              {/* Basic Information */}
              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., TECH001" {...field} />
                            </FormControl>
                            <FormDescription>
                              Unique identifier for this supplier
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tier *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="strategic">Strategic</SelectItem>
                                <SelectItem value="preferred">Preferred</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="conditional">Conditional</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="Logistics">Logistics</SelectItem>
                                <SelectItem value="Services">Services</SelectItem>
                                <SelectItem value="Materials">Materials</SelectItem>
                                <SelectItem value="Sustainability">Sustainability</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subcategory</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter subcategory" value={field.value || ""} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-3">
                      <FormLabel>Tags</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {watchedTags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0.5 hover:bg-transparent"
                              onClick={() => removeTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Additional notes about this supplier..."
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Business Information */}
              <TabsContent value="business" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="businessInfo.legalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Legal Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter legal company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.tradingName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trading Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter trading name" value={field.value || ""} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter tax identification number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter business registration number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.website"
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
                        name="businessInfo.foundedYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Founded Year</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="e.g., 2010"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.employeeCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Count</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Number of employees"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.annualRevenue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Revenue</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Annual revenue amount"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contacts */}
              <TabsContent value="contacts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Contact Information
                      </CardTitle>
                      <Button type="button" onClick={addContact} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {contactFields.map((contact, index) => (
                      <div key={contact.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Contact {index + 1}</h4>
                          {contactFields.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeContact(index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`contacts.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="primary">Primary</SelectItem>
                                    <SelectItem value="billing">Billing</SelectItem>
                                    <SelectItem value="technical">Technical</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter job title" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.department`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter department" value={field.value || ""} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Enter email address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter phone number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.mobile`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mobile</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter mobile number" value={field.value || ""} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name={`contacts.${index}.isPrimary`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Primary Contact</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`contacts.${index}.isActive`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Active</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Addresses */}
              <TabsContent value="addresses" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Address Information
                      </CardTitle>
                      <Button type="button" onClick={addAddress} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Address
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {addressFields.map((address, index) => (
                      <div key={address.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Address {index + 1}</h4>
                          {addressFields.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeAddress(index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`addresses.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="headquarters">Headquarters</SelectItem>
                                    <SelectItem value="billing">Billing</SelectItem>
                                    <SelectItem value="shipping">Shipping</SelectItem>
                                    <SelectItem value="warehouse">Warehouse</SelectItem>
                                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Main Office" value={field.value || ""} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.addressLine1`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Address Line 1 *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter street address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.addressLine2`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Address Line 2</FormLabel>
                                <FormControl>
                                  <Input placeholder="Apartment, suite, etc." value={field.value || ""} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.city`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter city" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.state`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State/Province *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter state or province" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.postalCode`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postal Code *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter postal code" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.country`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="USA">United States</SelectItem>
                                    <SelectItem value="CAN">Canada</SelectItem>
                                    <SelectItem value="GBR">United Kingdom</SelectItem>
                                    <SelectItem value="DEU">Germany</SelectItem>
                                    <SelectItem value="FRA">France</SelectItem>
                                    <SelectItem value="JPN">Japan</SelectItem>
                                    <SelectItem value="AUS">Australia</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name={`addresses.${index}.isPrimary`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Primary Address</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`addresses.${index}.isActive`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Active</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Capabilities */}
              <TabsContent value="capabilities" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Capabilities & Financial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="capabilities.leadTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Time (days) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter lead time in days"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 30)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capabilities.paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Terms *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment terms" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Net 15">Net 15</SelectItem>
                                <SelectItem value="Net 30">Net 30</SelectItem>
                                <SelectItem value="Net 45">Net 45</SelectItem>
                                <SelectItem value="Net 60">Net 60</SelectItem>
                                <SelectItem value="Net 90">Net 90</SelectItem>
                                <SelectItem value="COD">Cash on Delivery</SelectItem>
                                <SelectItem value="Prepaid">Prepaid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="financial.creditRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credit Rating</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select credit rating" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="AAA">AAA - Excellent</SelectItem>
                                <SelectItem value="AA">AA - Very Good</SelectItem>
                                <SelectItem value="A">A - Good</SelectItem>
                                <SelectItem value="BBB">BBB - Adequate</SelectItem>
                                <SelectItem value="BB">BB - Questionable</SelectItem>
                                <SelectItem value="B">B - Poor</SelectItem>
                                <SelectItem value="CCC">CCC - Very Poor</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="financial.currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Financial Currency *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    
  )
}

export default SupplierForm