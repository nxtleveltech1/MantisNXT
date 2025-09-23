"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Star,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  FileText,
  Package,
  Monitor,
  Wrench,
  Building,
  Clock,
  User,
  Download,
  Upload
} from 'lucide-react'

import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface POTemplatesProps {
  open: boolean
  onClose: () => void
}

interface POTemplate {
  id: string
  name: string
  description: string
  category: 'it' | 'office' | 'maintenance' | 'equipment' | 'services'
  supplier?: {
    id: string
    name: string
  }
  items: TemplateItem[]
  terms: {
    paymentTerms: string
    deliveryTerms: string
    warrantyTerms: string
  }
  estimatedTotal: number
  currency: string
  isPublic: boolean
  isFavorite: boolean
  createdBy: string
  createdDate: Date
  usageCount: number
  lastUsed?: Date
}

interface TemplateItem {
  id: string
  productCode: string
  description: string
  category: string
  quantity: number
  unitPrice: number
  specifications?: string
}

const mockTemplates: POTemplate[] = [
  {
    id: '1',
    name: 'Standard Laptop Setup',
    description: 'Complete laptop setup for new employees including software licenses',
    category: 'it',
    supplier: {
      id: 'SUP001',
      name: 'TechCorp Solutions'
    },
    items: [
      {
        id: '1-1',
        productCode: 'LAPTOP-DEL-001',
        description: 'Dell Latitude 7420 Business Laptop',
        category: 'Hardware',
        quantity: 1,
        unitPrice: 1200,
        specifications: '14" FHD, Intel i7, 16GB RAM, 512GB SSD'
      },
      {
        id: '1-2',
        productCode: 'SOFT-MS-001',
        description: 'Microsoft Office 365 Business License',
        category: 'Software',
        quantity: 1,
        unitPrice: 150
      }
    ],
    terms: {
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Destination',
      warrantyTerms: '3 Year Business Warranty'
    },
    estimatedTotal: 1350,
    currency: 'USD',
    isPublic: true,
    isFavorite: true,
    createdBy: 'IT Department',
    createdDate: new Date('2024-01-10'),
    usageCount: 25,
    lastUsed: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Office Supplies Monthly',
    description: 'Monthly office supplies order for 50-person office',
    category: 'office',
    items: [
      {
        id: '2-1',
        productCode: 'PAPER-A4-001',
        description: 'A4 Copy Paper - White (Case of 10 reams)',
        category: 'Supplies',
        quantity: 2,
        unitPrice: 45
      },
      {
        id: '2-2',
        productCode: 'PEN-BALL-001',
        description: 'Ballpoint Pens - Blue (Box of 50)',
        category: 'Supplies',
        quantity: 4,
        unitPrice: 12
      }
    ],
    terms: {
      paymentTerms: 'Net 15',
      deliveryTerms: 'FOB Origin',
      warrantyTerms: 'Standard Return Policy'
    },
    estimatedTotal: 138,
    currency: 'USD',
    isPublic: true,
    isFavorite: false,
    createdBy: 'Admin Team',
    createdDate: new Date('2024-01-05'),
    usageCount: 12,
    lastUsed: new Date('2024-01-15')
  }
]

const POTemplates: React.FC<POTemplatesProps> = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<POTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)

  const categories = [
    { id: 'all', name: 'All Categories', icon: <FileText className="h-4 w-4" /> },
    { id: 'it', name: 'IT Equipment', icon: <Monitor className="h-4 w-4" /> },
    { id: 'office', name: 'Office Supplies', icon: <Package className="h-4 w-4" /> },
    { id: 'maintenance', name: 'Maintenance', icon: <Wrench className="h-4 w-4" /> },
    { id: 'equipment', name: 'Equipment', icon: <Building className="h-4 w-4" /> },
    { id: 'services', name: 'Services', icon: <User className="h-4 w-4" /> }
  ]

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesFavorites = !showFavorites || template.isFavorite

    return matchesSearch && matchesCategory && matchesFavorites
  })

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat?.icon || <FileText className="h-4 w-4" />
  }

  const getCategoryName = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat?.name || category
  }

  const handleUseTemplate = (template: POTemplate) => {
    // Logic to create new PO from template
    console.log('Using template:', template)
    onClose()
  }

  const handleToggleFavorite = (templateId: string) => {
    // Logic to toggle favorite status
    console.log('Toggle favorite for template:', templateId)
  }

  const handleDeleteTemplate = (templateId: string) => {
    // Logic to delete template
    console.log('Delete template:', templateId)
  }

  const handleDuplicateTemplate = (templateId: string) => {
    // Logic to duplicate template
    console.log('Duplicate template:', templateId)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Purchase Order Templates
          </DialogTitle>
          <DialogDescription>
            Create, manage, and use pre-configured purchase order templates
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse Templates</TabsTrigger>
            <TabsTrigger value="create">Create Template</TabsTrigger>
            <TabsTrigger value="favorites">My Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showFavorites ? "default" : "outline"}
                  onClick={() => setShowFavorites(!showFavorites)}
                  size="sm"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Favorites Only
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.icon}
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="relative group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {getCategoryIcon(template.category)}
                          {template.name}
                          {template.isFavorite && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{getCategoryName(template.category)}</Badge>
                          {template.isPublic && (
                            <Badge variant="outline" className="text-xs">Public</Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Use Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFavorite(template.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            {template.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {template.description}
                    </p>

                    {template.supplier && (
                      <div className="mb-4">
                        <p className="text-sm font-medium">Supplier</p>
                        <p className="text-sm text-muted-foreground">{template.supplier.name}</p>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Items:</span>
                        <span className="font-medium">{template.items.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Est. Total:</span>
                        <span className="font-medium">
                          {formatCurrency(template.estimatedTotal, template.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Used:</span>
                        <span className="font-medium">{template.usageCount} times</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>by {template.createdBy}</span>
                      {template.lastUsed && (
                        <span>Last used: {formatDate(template.lastUsed)}</span>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                <p className="text-muted-foreground mb-4">
                  No templates match your current search criteria.
                </p>
                <Button onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Template</CardTitle>
                <CardDescription>
                  Create a reusable purchase order template for future use
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g., Standard Laptop Setup"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-category">Category</Label>
                    <select
                      id="template-category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select category</option>
                      <option value="it">IT Equipment</option>
                      <option value="office">Office Supplies</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="equipment">Equipment</option>
                      <option value="services">Services</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Describe what this template is for..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default-supplier">Default Supplier (Optional)</Label>
                    <Input
                      id="default-supplier"
                      placeholder="Search suppliers..."
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      type="checkbox"
                      id="public-template"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="public-template">Make this template public</Label>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Template Items</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add items that will be included by default when using this template
                  </p>

                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label>Product Code</Label>
                            <Input placeholder="e.g., LAPTOP-001" />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input placeholder="Item description" />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input type="number" placeholder="1" />
                          </div>
                          <div>
                            <Label>Unit Price</Label>
                            <Input type="number" placeholder="0.00" />
                          </div>
                        </div>
                        <div className="mt-4">
                          <Label>Specifications (Optional)</Label>
                          <Textarea placeholder="Technical specifications or notes..." />
                        </div>
                      </CardContent>
                    </Card>

                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Item
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Default Terms</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Payment Terms</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="net-30">Net 30</option>
                        <option value="net-15">Net 15</option>
                        <option value="net-45">Net 45</option>
                        <option value="due-on-receipt">Due on Receipt</option>
                      </select>
                    </div>
                    <div>
                      <Label>Delivery Terms</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="fob-destination">FOB Destination</option>
                        <option value="fob-origin">FOB Origin</option>
                        <option value="ddu">DDU</option>
                        <option value="ddp">DDP</option>
                      </select>
                    </div>
                    <div>
                      <Label>Warranty Terms</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="1-year-standard">1 Year Standard</option>
                        <option value="2-year-extended">2 Year Extended</option>
                        <option value="3-year-premium">3 Year Premium</option>
                        <option value="30-days">30 Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button>
                    Create Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTemplates.filter(t => t.isFavorite).map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      {template.name}
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {template.description}
                    </p>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-muted-foreground">Est. Total:</span>
                      <span className="font-medium">
                        {formatCurrency(template.estimatedTotal, template.currency)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {mockTemplates.filter(t => t.isFavorite).length === 0 && (
              <div className="text-center py-12">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Favorite Templates</h3>
                <p className="text-muted-foreground">
                  Mark templates as favorites to access them quickly here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Template Details Modal */}
        {selectedTemplate && (
          <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getCategoryIcon(selectedTemplate.category)}
                  {selectedTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  Template details and preview
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Template Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedTemplate.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{getCategoryName(selectedTemplate.category)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="font-medium">{selectedTemplate.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usage Count</p>
                    <p className="font-medium">{selectedTemplate.usageCount} times</p>
                  </div>
                </div>

                {/* Template Items */}
                <div>
                  <h4 className="font-medium mb-4">Template Items ({selectedTemplate.items.length})</h4>
                  <div className="border rounded-lg">
                    <div className="grid grid-cols-12 gap-4 p-3 bg-muted font-medium text-sm">
                      <div className="col-span-3">Product Code</div>
                      <div className="col-span-4">Description</div>
                      <div className="col-span-2">Quantity</div>
                      <div className="col-span-3">Unit Price</div>
                    </div>
                    {selectedTemplate.items.map((item, index) => (
                      <div key={item.id} className={cn(
                        "grid grid-cols-12 gap-4 p-3 text-sm",
                        index !== selectedTemplate.items.length - 1 && "border-b"
                      )}>
                        <div className="col-span-3 font-medium">{item.productCode}</div>
                        <div className="col-span-4">
                          <p>{item.description}</p>
                          {item.specifications && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.specifications}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">{item.quantity}</div>
                        <div className="col-span-3">{formatCurrency(item.unitPrice)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Close
                  </Button>
                  <Button onClick={() => handleUseTemplate(selectedTemplate)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default POTemplates