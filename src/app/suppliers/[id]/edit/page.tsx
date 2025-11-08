import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import EnhancedSupplierForm from '@/components/suppliers/EnhancedSupplierForm'
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository'
import { SupplierService } from '@/lib/suppliers/services/SupplierService'
import { CacheInvalidator } from '@/lib/cache/invalidation'
import type { UpdateSupplierData } from '@/lib/suppliers/types/SupplierDomain'
import AppLayout from '@/components/layout/AppLayout'

const repository = new PostgreSQLSupplierRepository()
const supplierService = new SupplierService(repository)

// Fetch supplier data with ALL fields from database
async function getSupplier(id: string) {
  try {
    // Use the full repository service to get complete supplier data
    const supplier = await supplierService.getSupplierById(id)

    if (!supplier) {
      return null
    }

    // Map the full supplier object to match the form's expected structure
    // ALL fields from the database should be preserved
    return {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code || '',
      status: supplier.status || 'pending',
      tier: supplier.tier || 'approved',
      category: supplier.category || '',
      subcategory: supplier.subcategory || '',
      tags: supplier.tags || [],
      brands: supplier.brands || [],
      businessInfo: {
        legalName: supplier.businessInfo?.legalName || supplier.name,
        tradingName: supplier.businessInfo?.tradingName || '',
        taxId: supplier.businessInfo?.taxId || '',
        registrationNumber: supplier.businessInfo?.registrationNumber || '',
        website: supplier.businessInfo?.website || '',
        foundedYear: supplier.businessInfo?.foundedYear,
        employeeCount: supplier.businessInfo?.employeeCount,
        annualRevenue: supplier.businessInfo?.annualRevenue,
        currency: supplier.businessInfo?.currency || 'ZAR',
      },
      capabilities: {
        products: supplier.capabilities?.products || [],
        services: supplier.capabilities?.services || [],
        leadTime: supplier.capabilities?.leadTime || 30,
        paymentTerms: supplier.capabilities?.paymentTerms || 'Net 30',
      },
      financial: {
        creditRating: supplier.financial?.creditRating || '',
        paymentTerms: supplier.financial?.paymentTerms || 'Net 30',
        currency: supplier.financial?.currency || 'ZAR',
      },
      contacts: supplier.contacts && supplier.contacts.length > 0 
        ? supplier.contacts.map((c: any) => ({
            id: c.id || '',
            type: c.type || 'primary',
            name: c.name || '',
            title: c.title || '',
            email: c.email || '',
            phone: c.phone || '',
            mobile: c.mobile || '',
            department: c.department || '',
            isPrimary: c.isPrimary || false,
            isActive: c.isActive !== false,
          }))
        : [{
            id: '',
            type: 'primary' as const,
            name: '',
            title: '',
            email: '',
            phone: '',
            mobile: '',
            department: '',
            isPrimary: true,
            isActive: true,
          }],
      addresses: supplier.addresses && supplier.addresses.length > 0
        ? supplier.addresses.map((a: any) => ({
            id: a.id || '',
            type: a.type || 'headquarters',
            name: a.name || '',
            addressLine1: a.addressLine1 || '',
            addressLine2: a.addressLine2 || '',
            city: a.city || '',
            state: a.state || '',
            postalCode: a.postalCode || '',
            country: a.country || 'South Africa',
            isPrimary: a.isPrimary || false,
            isActive: a.isActive !== false,
          }))
        : [{
            id: '',
            type: 'headquarters' as const,
            name: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'South Africa',
            isPrimary: true,
            isActive: true,
          }],
      notes: supplier.notes || '',
    }
  } catch (error) {
    console.error('Failed to fetch supplier:', error)
    return null
  }
}

interface EditSupplierPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  // In Next.js 13+, params is a Promise and must be awaited
  const { id } = await params
  
  const supplier = await getSupplier(id)

  if (!supplier) {
    notFound()
  }

  const handleSubmit = async (data: any) => {
    'use server'
    
    try {
      // Transform form data to UpdateSupplierData format
      const updateData: UpdateSupplierData = {
        name: data.name,
        code: data.code,
        status: data.status,
        tier: data.tier,
        category: data.category,
        subcategory: data.subcategory,
        tags: data.tags || [],
        brands: data.brands || [],
        businessInfo: data.businessInfo ? {
          legalName: data.businessInfo.legalName,
          website: data.businessInfo.website,
          foundedYear: data.businessInfo.foundedYear,
          employeeCount: data.businessInfo.employeeCount,
          annualRevenue: data.businessInfo.annualRevenue,
          currency: data.businessInfo.currency,
        } : undefined,
        contacts: data.contacts?.map((c: any) => ({
          type: c.type,
          name: c.name,
          title: c.title,
          email: c.email,
          phone: c.phone,
          mobile: c.mobile,
          department: c.department,
          isPrimary: c.isPrimary || false,
          isActive: c.isActive !== false,
        })),
        addresses: data.addresses?.map((a: any) => ({
          type: a.type,
          name: a.name,
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2,
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          country: a.country,
          isPrimary: a.isPrimary || false,
          isActive: a.isActive !== false,
        })),
        notes: data.notes,
      }

      // Validate and update using the service
      const validation = await supplierService.validateSupplierUpdate(id, updateData)
      if (!validation.isValid) {
        const errors = validation.errors.map(e => e.message).join(', ')
        throw new Error(`Validation failed: ${errors}`)
      }

      const updatedSupplier = await supplierService.updateSupplier(id, updateData)
      
      // Invalidate cache to ensure fresh data
      CacheInvalidator.invalidateSupplier(id, updatedSupplier.name)
      revalidatePath('/suppliers')
      revalidatePath(`/suppliers/${id}`)
      
      // Return successfully - form will handle redirect
    } catch (error) {
      console.error('Failed to update supplier:', error)
      throw error
    }
  }

          return (
            <AppLayout
              title="Edit Supplier"
              breadcrumbs={[
                { label: 'Suppliers', href: '/suppliers' },
                { label: supplier.name || 'Edit Supplier' },
              ]}
            >
              <EnhancedSupplierForm
                supplier={supplier}
                onSubmit={handleSubmit}
              />
            </AppLayout>
          )
}
