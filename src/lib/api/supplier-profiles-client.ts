/**
 * Client-side API functions for supplier profiles
 * These functions handle the client-server communication for supplier profile management
 */

import type { SupplierProfile, SupplierRule } from '@/lib/cmm/supplier-rules-engine';
import type { Supplier } from '@/types/supplier';

export interface ProfileData {
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

/**
 * Get supplier profile data
 */
export async function getSupplierProfile(
  supplierId: string,
  profileName: string = 'default'
): Promise<SupplierProfile | null> {
  try {
    const response = await fetch(
      `/api/supplier-profiles?supplier_id=${supplierId}&profile_name=${profileName}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch supplier profile: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch supplier profile');
    }
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Error fetching supplier profile:', error);
    throw error;
  }
}

/**
 * Update supplier profile
 */
export async function updateSupplierProfileClient(
  supplierId: string,
  profileData: ProfileData
): Promise<void> {
  try {
    const response = await fetch(`/api/suppliers/${supplierId}/profiles/default`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplierId,
        profileName: 'default',
        guidelines: profileData.guidelines,
        processingConfig: profileData.processingConfig,
        qualityStandards: profileData.qualityStandards,
        complianceRules: profileData.complianceRules,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update supplier profile: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating supplier profile:', error);
    throw error;
  }
}

/**
 * Get supplier rules
 */
export async function getSupplierRulesClient(
  supplierId: string,
  triggerEvent: string = 'pricelist_upload'
): Promise<SupplierRule[]> {
  try {
    const response = await fetch(
      `/api/suppliers/${supplierId}/rules?trigger_event=${triggerEvent}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch supplier rules: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching supplier rules:', error);
    throw error;
  }
}

/**
 * Get supplier by ID
 */
export async function getSupplierByIdClient(supplierId: string): Promise<Supplier | null> {
  try {
    const response = await fetch(`/api/suppliers/${supplierId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch supplier: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error fetching supplier:', error);
    throw error;
  }
}
