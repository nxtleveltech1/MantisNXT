"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import WebSupplierDiscovery from "./WebSupplierDiscovery"
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
  Settings,
  Brain,
  Sparkles,
  Loader2,
  ArrowLeft,
  HelpCircle,
  Info
} from "lucide-react"

// Enhanced validation schemas with better accessibility
const contactSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["primary", "billing", "technical", "sales", "support"]).optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const addressSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["headquarters", "billing", "shipping", "warehouse", "manufacturing"]).optional(),
  name: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  status: z.enum(["active", "inactive", "pending", "suspended"]).optional(),
  tier: z.enum(["strategic", "preferred", "approved", "conditional"]).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  brands: z.array(z.string()).default([]),

  // Business Information
  businessInfo: z.object({
    legalName: z.string().optional(),
    tradingName: z.string().optional(),
    taxId: z.string().optional().or(z.literal("")),
    registrationNumber: z.string().optional().or(z.literal("")),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
    employeeCount: z.number().min(1).optional(),
    annualRevenue: z.number().min(0).optional(),
    currency: z.string().optional(),
  }).optional(),

  // Capabilities
  capabilities: z.object({
    products: z.array(z.string()).default([]),
    services: z.array(z.string()).default([]),
    leadTime: z.number().optional(),
    paymentTerms: z.string().optional(),
  }).optional(),

  // Financial
  financial: z.object({
    creditRating: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().optional(),
  }).optional(),

  // Contacts and Addresses
  contacts: z.array(contactSchema).optional(),
  addresses: z.array(addressSchema).optional(),

  // Notes
  notes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

// AI Supplier Discovery Hook - Now uses real web search
const useAISupplierDiscovery = () => {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchSupplier = async (supplierName: string, supplierCode?: string): Promise<Partial<SupplierFormData> | null> => {
    if (!supplierName.trim()) return null

    setIsSearching(true)
    setError(null)

    try {
      // Call the web search API to get real supplier information
      const response = await fetch('/api/ai/suppliers/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierName,
          supplierCode,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to search supplier')
      }

      // Return the populated data from web search
      return result.data as Partial<SupplierFormData>
    } catch (err) {
      console.error('Web search error:', err)
      setError(err instanceof Error ? err.message : "Failed to discover supplier information. Please try again.")
      return null
    } finally {
      setIsSearching(false)
    }
  }

  return { searchSupplier, isSearching, error }
}

// Web Discovery Integration Component
interface WebDiscoveryIntegrationProps {
  onDataFound: (data: any) => void
  initialQuery?: string
  onClose?: () => void
}

const WebDiscoveryIntegration: React.FC<WebDiscoveryIntegrationProps> = ({
  onDataFound,
  initialQuery = "",
  onClose
}) => {
  // Handle web discovery data transformation
  const handleWebDataFound = (webData: any) => {
    // Transform web discovery data to form format
    const transformedData: Partial<SupplierFormData> = {
      name: webData.companyName,
      businessInfo: {
        legalName: webData.companyName,
        website: webData.website,
        foundedYear: webData.founded ? parseInt(webData.founded) : undefined,
        employeeCount: webData.employees ? parseInt(webData.employees.replace(/[^0-9]/g, '')) : undefined,
      },
      capabilities: {
        products: webData.products || [],
        services: webData.services || [],
      },
      addresses: webData.addresses?.map((addr: any, index: number) => ({
        type: index === 0 ? "headquarters" : "shipping",
        addressLine1: addr.street,
        city: addr.city,
        country: addr.country,
        postalCode: addr.postalCode,
        isPrimary: index === 0,
        isActive: true,
      })) || [],
    }

    // Add contact from web data if available
    if (webData.contactEmail || webData.contactPhone) {
      transformedData.contacts = [{
        type: "primary",
        name: "", // Could be extracted from contact info
        email: webData.contactEmail,
        phone: webData.contactPhone,
        isPrimary: true,
        isActive: true,
      }]
    }

    onDataFound(transformedData)
    if (onClose) onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Web Supplier Discovery</h3>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Discovery
          </Button>
        )}
      </div>
      
      <WebSupplierDiscovery
        onDataFound={handleWebDataFound}
        initialQuery={initialQuery}
        onClose={onClose}
      />
    </div>
  )
}

// Help tooltips for accessibility
const FieldTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({
  content,
  children
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-1">
        {children}
        <HelpCircle className="h-3 w-3 text-muted-foreground" />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p className="max-w-xs">{content}</p>
    </TooltipContent>
  </Tooltip>
)

// Main Form Component
interface EnhancedSupplierFormProps {
  supplier?: any // Type this properly based on your supplier type
  onSubmit?: (data: SupplierFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const EnhancedSupplierForm: React.FC<EnhancedSupplierFormProps> = ({
  supplier,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [tagInput, setTagInput] = useState("")
  const [brandInput, setBrandInput] = useState("")
  const [productInput, setProductInput] = useState("")
  const [serviceInput, setServiceInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showWebDiscovery, setShowWebDiscovery] = useState(false)

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
      contacts: supplier.contacts.map((contact: any) => ({
        ...contact,
        mobile: contact.mobile || "",
        department: contact.department || "",
      })),
      addresses: supplier.addresses.map((address: any) => ({
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
      category: undefined,
      subcategory: "",
      tags: [],
      brands: [],
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
      contacts: [],
      addresses: [],
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
  const watchedBrands = form.watch("brands")
  const watchedProducts = form.watch("capabilities.products")
  const watchedServices = form.watch("capabilities.services")

  // Handle AI data population
  const handleAIDataFound = (data: Partial<SupplierFormData>) => {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'businessInfo' && typeof value === 'object') {
          // Handle nested businessInfo object
          form.setValue('businessInfo', value as any, { shouldValidate: true })
        } else if (key === 'contacts' && Array.isArray(value)) {
          form.setValue('contacts', value as any, { shouldValidate: true })
        } else if (key === 'addresses' && Array.isArray(value)) {
          form.setValue('addresses', value as any, { shouldValidate: true })
        } else if (key === 'capabilities' && typeof value === 'object') {
          form.setValue('capabilities', value as any, { shouldValidate: true })
        } else if (key === 'financial' && typeof value === 'object') {
          form.setValue('financial', value as any, { shouldValidate: true })
        } else {
          form.setValue(key as keyof SupplierFormData, value as any, { shouldValidate: true })
        }
      }
    })
    setShowWebDiscovery(false)
    // Trigger validation to show any errors
    setTimeout(() => {
      form.trigger()
    }, 100)
  }

  // Generate supplier code based on name
  useEffect(() => {
    const name = form.watch("name")
    if (name && !supplier) {
      const code = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6)
      form.setValue("code", code)
    }
  }, [form.watch("name")])

  const handleSubmit = async (data: SupplierFormData) => {
    console.log('🟢 Form submit handler called with data:', data)
    try {
      setSubmitError(null)
      setSubmitSuccess(false)
      setIsSubmitting(true)

      if (onSubmit) {
        await onSubmit(data)
        // Set success and redirect after onSubmit succeeds
        setSubmitSuccess(true)
        setTimeout(() => {
          router.push(`/suppliers?refresh=${Date.now()}`)
          router.refresh()
        }, 1500)
      } else {
        // Default submission logic - actually call the API
        const response = await fetch('/api/suppliers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create supplier')
        }

        setSubmitSuccess(true)

        // Invalidate cache and refresh supplier lists
        // Trigger a refresh by reloading the page or using router refresh
        // Navigate back after success with cache invalidation
        setTimeout(() => {
          // Add timestamp to force cache invalidation
          router.push(`/suppliers?refresh=${Date.now()}`)
          router.refresh() // Force refresh of server components
        }, 1500)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save supplier')
      console.error("Form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Tag management
  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      form.setValue("tags", [...watchedTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue("tags", watchedTags.filter(tag => tag !== tagToRemove))
  }

  // Brand management
  const addBrand = () => {
    if (brandInput.trim() && !watchedBrands.includes(brandInput.trim())) {
      form.setValue("brands", [...watchedBrands, brandInput.trim()])
      setBrandInput("")
    }
  }

  const removeBrand = (brandToRemove: string) => {
    form.setValue("brands", watchedBrands.filter(brand => brand !== brandToRemove))
  }

  // Product management
  const addProduct = () => {
    if (productInput.trim() && !watchedProducts.includes(productInput.trim())) {
      form.setValue("capabilities.products", [...watchedProducts, productInput.trim()])
      setProductInput("")
    }
  }

  const removeProduct = (productToRemove: string) => {
    form.setValue("capabilities.products", watchedProducts.filter(p => p !== productToRemove))
  }

  // Service management
  const addService = () => {
    if (serviceInput.trim() && !watchedServices.includes(serviceInput.trim())) {
      form.setValue("capabilities.services", [...watchedServices, serviceInput.trim()])
      setServiceInput("")
    }
  }

  const removeService = (serviceToRemove: string) => {
    form.setValue("capabilities.services", watchedServices.filter(s => s !== serviceToRemove))
  }

  // Contact management
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

  // Address management
  const addAddress = () => {
    appendAddress({
      type: "billing",
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "South Africa",
      isPrimary: false,
      isActive: true,
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel ? onCancel() : router.push('/suppliers')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Suppliers
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {supplier ? "Edit Supplier" : "Add New Supplier"}
              </h1>
              <p className="text-muted-foreground">
                {supplier ? "Update supplier information and settings" : "Create a new supplier profile"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!supplier && (
              <Button
                variant="outline"
                onClick={() => setShowWebDiscovery(true)}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
              >
                <Globe className="h-4 w-4 mr-2" />
                Web Discovery
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => onCancel ? onCancel() : router.push('/suppliers')}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault()
                console.log('🟡 Button clicked, triggering form submit')
                const formElement = e.currentTarget.closest('form')
                if (formElement) {
                  formElement.requestSubmit()
                } else {
                  // Fallback: manually trigger validation and submit
                  form.handleSubmit(handleSubmit, (errors) => {
                    console.error('🔴 Form validation errors:', errors)
                    setSubmitError('Please check the form for validation errors')
                  })()
                }
              }}
              disabled={isLoading || isSubmitting}
              className="min-w-[120px]"
            >
              {(isLoading || isSubmitting) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

        {/* Web Discovery Panel */}
        {showWebDiscovery && (
          <Dialog open={showWebDiscovery} onOpenChange={setShowWebDiscovery}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Web Supplier Discovery
                </DialogTitle>
                <DialogDescription>
                  Discover supplier information from the web to auto-populate form fields
                </DialogDescription>
              </DialogHeader>
              
              <WebDiscoveryIntegration
                onDataFound={handleAIDataFound}
                initialQuery={form.watch("name")}
                onClose={() => setShowWebDiscovery(false)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Success/Error Messages */}
        {submitSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Supplier {supplier ? 'updated' : 'created'} successfully! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        {submitError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit(handleSubmit, (errors) => {
              console.error('🔴 Form validation errors:', errors)
              setSubmitError('Please check the form for validation errors')
            })(e)
          }} className="space-y-6">
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
                            <FormLabel>
                              <FieldTooltip content="The primary name used to identify this supplier">
                                Supplier Name
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter supplier name"
                                {...field}
                                aria-describedby="supplier-name-help"
                              />
                            </FormControl>
                            <FormDescription id="supplier-name-help">
                              This will be the main identifier for the supplier
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Unique code automatically generated from supplier name">
                                Supplier Code
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., TECH001"
                                {...field}
                                aria-describedby="supplier-code-help"
                              />
                            </FormControl>
                            <FormDescription id="supplier-code-help">
                              Unique identifier (auto-generated from name)
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
                            <FormLabel>
                              <FieldTooltip content="Current operational status of the supplier">
                                Status
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="status-help">
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
                            <FormDescription id="status-help">
                              Current operational status
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Business relationship tier indicating partnership level">
                                Tier
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="tier-help">
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
                            <FormDescription id="tier-help">
                              Business relationship level
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Primary business category for this supplier">
                                Category
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="category-help">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="Logistics">Logistics</SelectItem>
                                <SelectItem value="Services">Services</SelectItem>
                                <SelectItem value="Materials">Materials</SelectItem>
                                <SelectItem value="Musical Instruments">Musical Instruments</SelectItem>
                                <SelectItem value="Electronics">Electronics</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription id="category-help">
                              Primary business category
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="More specific categorization within the main category">
                                Subcategory
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter subcategory"
                                value={field.value || ""}
                                onChange={field.onChange}
                                aria-describedby="subcategory-help"
                              />
                            </FormControl>
                            <FormDescription id="subcategory-help">
                              Optional: More specific category
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-3">
                      <FormLabel>
                        <FieldTooltip content="Keywords to help categorize and search for this supplier">
                          Tags
                        </FieldTooltip>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                          aria-label="Add new tag"
                        />
                        <Button
                          type="button"
                          onClick={addTag}
                          variant="outline"
                          aria-label="Add tag"
                        >
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
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Brands */}
                    <div className="space-y-3">
                      <FormLabel>
                        <FieldTooltip content="Brands or product lines associated with this supplier">
                          Supplier Brands
                        </FieldTooltip>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a brand"
                          value={brandInput}
                          onChange={(e) => setBrandInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBrand())}
                          aria-label="Add new brand"
                        />
                        <Button
                          type="button"
                          onClick={addBrand}
                          variant="outline"
                          aria-label="Add brand"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {watchedBrands.map((brand, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {brand}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0.5 hover:bg-transparent"
                              onClick={() => removeBrand(brand)}
                              aria-label={`Remove brand ${brand}`}
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
                          <FormLabel>
                            <FieldTooltip content="Additional notes or comments about this supplier">
                              Notes
                            </FieldTooltip>
                          </FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Additional notes about this supplier..."
                              value={field.value || ""}
                              onChange={field.onChange}
                              aria-describedby="notes-help"
                            />
                          </FormControl>
                          <FormDescription id="notes-help">
                            Optional: Additional information or comments
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Business Information Tab */}
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
                            <FormLabel>
                              <FieldTooltip content="Official registered business name">
                                Legal Name
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter legal company name"
                                {...field}
                                aria-describedby="legal-name-help"
                              />
                            </FormControl>
                            <FormDescription id="legal-name-help">
                              Official registered business name
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.tradingName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Name used for day-to-day business operations">
                                Trading Name
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter trading name"
                                value={field.value || ""}
                                onChange={field.onChange}
                                aria-describedby="trading-name-help"
                              />
                            </FormControl>
                            <FormDescription id="trading-name-help">
                              Optional: Business operating name
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Tax identification number">
                                Tax ID
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter tax identification number"
                                {...field}
                                aria-describedby="tax-id-help"
                              />
                            </FormControl>
                            <FormDescription id="tax-id-help">
                              Tax identification number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Official business registration number">
                                Registration Number
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter business registration number"
                                {...field}
                                aria-describedby="reg-number-help"
                              />
                            </FormControl>
                            <FormDescription id="reg-number-help">
                              Business registration number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Company website URL">
                                Website
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com"
                                {...field}
                                aria-describedby="website-help"
                              />
                            </FormControl>
                            <FormDescription id="website-help">
                              Optional: Company website
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.foundedYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Year the company was established">
                                Founded Year
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="e.g., 2010"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                aria-describedby="founded-year-help"
                              />
                            </FormControl>
                            <FormDescription id="founded-year-help">
                              Optional: Year established
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.employeeCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Number of employees">
                                Employee Count
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Number of employees"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                aria-describedby="employee-count-help"
                              />
                            </FormControl>
                            <FormDescription id="employee-count-help">
                              Optional: Total number of employees
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessInfo.currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Primary currency for transactions">
                                Currency
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="currency-help">
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
                            <FormDescription id="currency-help">
                              Primary transaction currency
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Contact Information
                      </CardTitle>
                      <Button
                        type="button"
                        onClick={addContact}
                        variant="outline"
                        size="sm"
                        aria-label="Add new contact"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {contactFields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No contacts added. Click "Add Contact" to add one, or submit without contacts.</p>
                      </div>
                    )}
                    {contactFields.map((contact, index) => (
                      <div key={contact.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Contact {index + 1}</h4>
                          <Button
                            type="button"
                            onClick={() => removeContact(index)}
                            variant="outline"
                            size="sm"
                            aria-label={`Remove contact ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`contacts.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Type</FormLabel>
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
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter full name"
                                    {...field}
                                    aria-label={`Contact ${index + 1} full name`}
                                  />
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
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter job title"
                                    {...field}
                                    aria-label={`Contact ${index + 1} job title`}
                                  />
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
                                  <Input
                                    placeholder="Enter department"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    aria-label={`Contact ${index + 1} department`}
                                  />
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
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Enter email address"
                                    {...field}
                                    aria-label={`Contact ${index + 1} email`}
                                  />
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
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter phone number"
                                    {...field}
                                    aria-label={`Contact ${index + 1} phone`}
                                  />
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
                                  <Input
                                    placeholder="Enter mobile number"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    aria-label={`Contact ${index + 1} mobile`}
                                  />
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
                                    aria-label={`Mark contact ${index + 1} as primary`}
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
                                    aria-label={`Mark contact ${index + 1} as active`}
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

              {/* Addresses Tab */}
              <TabsContent value="addresses" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Address Information
                      </CardTitle>
                      <Button
                        type="button"
                        onClick={addAddress}
                        variant="outline"
                        size="sm"
                        aria-label="Add new address"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Address
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {addressFields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No addresses added. Click "Add Address" to add one, or submit without addresses.</p>
                      </div>
                    )}
                    {addressFields.map((address, index) => (
                      <div key={address.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Address {index + 1}</h4>
                          <Button
                            type="button"
                            onClick={() => removeAddress(index)}
                            variant="outline"
                            size="sm"
                            aria-label={`Remove address ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`addresses.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Type</FormLabel>
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
                                  <Input
                                    placeholder="e.g., Main Office"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    aria-label={`Address ${index + 1} location name`}
                                  />
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
                                <FormLabel>Address Line 1</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter street address"
                                    {...field}
                                    aria-label={`Address ${index + 1} line 1`}
                                  />
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
                                  <Input
                                    placeholder="Apartment, suite, etc."
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    aria-label={`Address ${index + 1} line 2`}
                                  />
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
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter city"
                                    {...field}
                                    aria-label={`Address ${index + 1} city`}
                                  />
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
                                <FormLabel>State/Province</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter state or province"
                                    {...field}
                                    aria-label={`Address ${index + 1} state`}
                                  />
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
                                <FormLabel>Postal Code</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter postal code"
                                    {...field}
                                    aria-label={`Address ${index + 1} postal code`}
                                  />
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
                                <FormLabel>Country</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="South Africa">South Africa</SelectItem>
                                    <SelectItem value="United States">United States</SelectItem>
                                    <SelectItem value="Canada">Canada</SelectItem>
                                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                    <SelectItem value="Germany">Germany</SelectItem>
                                    <SelectItem value="France">France</SelectItem>
                                    <SelectItem value="Japan">Japan</SelectItem>
                                    <SelectItem value="Australia">Australia</SelectItem>
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
                                    aria-label={`Mark address ${index + 1} as primary`}
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
                                    aria-label={`Mark address ${index + 1} as active`}
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

              {/* Capabilities Tab */}
              <TabsContent value="capabilities" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Capabilities & Financial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Products */}
                    <div className="space-y-3">
                      <FormLabel>
                        <FieldTooltip content="Products or items this supplier provides">
                          Products & Items
                        </FieldTooltip>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a product or item"
                          value={productInput}
                          onChange={(e) => setProductInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addProduct())}
                          aria-label="Add new product"
                        />
                        <Button
                          type="button"
                          onClick={addProduct}
                          variant="outline"
                          aria-label="Add product"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {watchedProducts.map((product, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {product}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0.5 hover:bg-transparent"
                              onClick={() => removeProduct(product)}
                              aria-label={`Remove product ${product}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Services */}
                    <div className="space-y-3">
                      <FormLabel>
                        <FieldTooltip content="Services this supplier offers">
                          Services
                        </FieldTooltip>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a service"
                          value={serviceInput}
                          onChange={(e) => setServiceInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
                          aria-label="Add new service"
                        />
                        <Button
                          type="button"
                          onClick={addService}
                          variant="outline"
                          aria-label="Add service"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {watchedServices.map((service, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {service}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0.5 hover:bg-transparent"
                              onClick={() => removeService(service)}
                              aria-label={`Remove service ${service}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="capabilities.leadTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Expected delivery time in days">
                                Lead Time (days)
                              </FieldTooltip>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter lead time in days"
                                value={field.value?.toString() || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 30)}
                                aria-describedby="lead-time-help"
                              />
                            </FormControl>
                            <FormDescription id="lead-time-help">
                              Expected delivery time in days
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capabilities.paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Payment terms for transactions">
                                Payment Terms
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="payment-terms-help">
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
                            <FormDescription id="payment-terms-help">
                              Standard payment terms
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="financial.creditRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Credit rating assessment">
                                Credit Rating
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="credit-rating-help">
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
                            <FormDescription id="credit-rating-help">
                              Optional: Credit assessment
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="financial.currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldTooltip content="Primary transaction currency">
                                Financial Currency
                              </FieldTooltip>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger aria-describedby="financial-currency-help">
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
                            <FormDescription id="financial-currency-help">
                              Primary transaction currency
                            </FormDescription>
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
    </TooltipProvider>
  )
}

export default EnhancedSupplierForm