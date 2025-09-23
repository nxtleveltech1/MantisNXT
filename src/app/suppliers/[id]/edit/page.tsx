import { notFound } from 'next/navigation'
import EnhancedSupplierForm from '@/components/suppliers/EnhancedSupplierForm'

// This would typically fetch supplier data from your API
async function getSupplier(id: string) {
  try {
    // Mock data for now - replace with actual API call
    if (id === "SUP-001") {
      return {
        id: "SUP-001",
        name: "BK Percussion",
        code: "BKPRC",
        status: "active",
        tier: "strategic",
        category: "Musical Instruments",
        subcategory: "Percussion",
        tags: ["percussion", "drums", "premium", "professional"],
        businessInfo: {
          legalName: "BK Percussion (Pty) Ltd",
          tradingName: "BK Percussion",
          taxId: "1234567890",
          registrationNumber: "2010/123456/07",
          website: "https://www.bkpercussion.co.za",
          foundedYear: 2010,
          employeeCount: 25,
          currency: "ZAR",
        },
        capabilities: {
          products: ["Drum Kits", "Cymbals", "Percussion Accessories"],
          services: ["Equipment Rental", "Maintenance", "Custom Builds"],
          leadTime: 14,
          paymentTerms: "Net 30",
        },
        financial: {
          creditRating: "A",
          paymentTerms: "Net 30",
          currency: "ZAR",
        },
        contacts: [{
          id: "c1",
          type: "primary",
          name: "Sarah Mitchell",
          title: "Sales Manager",
          email: "sarah@bkpercussion.co.za",
          phone: "+27 11 234 5678",
          mobile: "+27 82 123 4567",
          department: "Sales",
          isPrimary: true,
          isActive: true,
        }],
        addresses: [{
          id: "a1",
          type: "headquarters",
          name: "Main Office",
          addressLine1: "123 Music Street",
          addressLine2: "Suite 101",
          city: "Johannesburg",
          state: "Gauteng",
          postalCode: "2000",
          country: "South Africa",
          isPrimary: true,
          isActive: true,
        }],
        notes: "Key strategic partner for percussion equipment",
      }
    }
    return null
  } catch (error) {
    console.error('Failed to fetch supplier:', error)
    return null
  }
}

interface EditSupplierPageProps {
  params: {
    id: string
  }
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const supplier = await getSupplier(params.id)

  if (!supplier) {
    notFound()
  }

  const handleSubmit = async (data: any) => {
    'use server'
    console.log('Updating supplier:', data)
    // Implement supplier update logic here
  }

  return (
    <EnhancedSupplierForm
      supplier={supplier}
      onSubmit={handleSubmit}
    />
  )
}