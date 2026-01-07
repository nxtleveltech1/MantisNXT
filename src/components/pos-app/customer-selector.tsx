"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { User, Search, Plus, UserCircle, Building2, Phone, Mail, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export interface POSCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  segment?: string
}

interface CustomerSelectorProps {
  selectedCustomer: POSCustomer | null
  onSelectCustomer: (customer: POSCustomer | null) => void
  disabled?: boolean
}

export default function CustomerSelector({
  selectedCustomer,
  onSelectCustomer,
  disabled = false,
}: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<POSCustomer[]>([])
  const [recentCustomers, setRecentCustomers] = useState<POSCustomer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  })

  // Load recent customers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("pos_recent_customers")
    if (stored) {
      try {
        setRecentCustomers(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse recent customers:", e)
      }
    }
  }, [])

  // Debounced search
  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/v1/customers?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()
      if (data.success && data.data) {
        setSearchResults(data.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("Customer search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  // Select a customer
  const handleSelectCustomer = (customer: POSCustomer) => {
    onSelectCustomer(customer)
    setIsOpen(false)
    setSearchTerm("")
    setSearchResults([])

    // Add to recent customers
    const updated = [
      customer,
      ...recentCustomers.filter((c) => c.id !== customer.id),
    ].slice(0, 5)
    setRecentCustomers(updated)
    localStorage.setItem("pos_recent_customers", JSON.stringify(updated))

    toast.success(`Customer: ${customer.name}`)
  }

  // Select walk-in customer
  const handleWalkIn = async () => {
    setIsSearching(true)
    try {
      // Search for existing walk-in customer
      const searchResponse = await fetch(`/api/v1/customers?search=Walk-in%20Customer&limit=1`)
      const searchData = await searchResponse.json()
      
      if (searchData.success && searchData.data?.length > 0) {
        handleSelectCustomer(searchData.data[0])
        return
      }

      // Create walk-in customer if not found
      const createResponse = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Walk-in Customer',
          email: 'walkin@pos.local',
          is_walk_in: true,
          segment: 'individual',
        }),
      })
      const createData = await createResponse.json()
      
      if (createData.success && createData.data) {
        handleSelectCustomer(createData.data)
      } else {
        toast.error("Failed to create walk-in customer")
      }
    } catch (error) {
      console.error("Walk-in customer error:", error)
      toast.error("Failed to get walk-in customer")
    } finally {
      setIsSearching(false)
    }
  }

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("Customer name is required")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim() || undefined,
          phone: newCustomer.phone.trim() || undefined,
          company: newCustomer.company.trim() || undefined,
        }),
      })
      const data = await response.json()

      if (data.success && data.data) {
        handleSelectCustomer(data.data)
        setShowCreateDialog(false)
        setNewCustomer({ name: "", email: "", phone: "", company: "" })
        toast.success(`${data.data.name} created`)
      } else {
        toast.error(data.error || "Failed to create customer")
      }
    } catch (error) {
      console.error("Create customer error:", error)
      toast.error("Failed to create customer")
    } finally {
      setIsCreating(false)
    }
  }

  // Clear selected customer
  const handleClear = () => {
    onSelectCustomer(null)
  }

  const getSegmentColor = (segment?: string) => {
    switch (segment) {
      case "vip":
        return "bg-amber-100 text-amber-800"
      case "enterprise":
        return "bg-purple-100 text-purple-800"
      case "business":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          Customer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedCustomer ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm">{selectedCustomer.name}</div>
                {selectedCustomer.company && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {selectedCustomer.company}
                  </div>
                )}
                {selectedCustomer.segment && (
                  <Badge
                    variant="secondary"
                    className={`text-xs mt-1 ${getSegmentColor(selectedCustomer.segment)}`}
                  >
                    {selectedCustomer.segment}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleWalkIn}
                disabled={disabled || isSearching}
                className="flex-1"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Walk-in
              </Button>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={disabled}
                    className="flex-1"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Customer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, email, phone..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {searchResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full p-3 text-left rounded-lg border hover:bg-gray-50 transition-colors"
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-3">
                              {customer.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </span>
                              )}
                              {customer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.length === 0 && recentCustomers.length > 0 && !searchTerm && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">Recent Customers</div>
                        <div className="space-y-2">
                          {recentCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full p-3 text-left rounded-lg border hover:bg-gray-50 transition-colors"
                            >
                              <div className="font-medium">{customer.name}</div>
                              {customer.company && (
                                <div className="text-xs text-gray-500">{customer.company}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
                      <div className="text-center py-6 text-gray-500">
                        <UserCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No customers found</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setNewCustomer({ ...newCustomer, name: searchTerm })
                            setShowCreateDialog(true)
                          }}
                        >
                          Create new customer
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWalkIn}
                        className="flex-1"
                      >
                        <UserCircle className="h-4 w-4 mr-2" />
                        Walk-in
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Customer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={isCreating || !newCustomer.name.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

