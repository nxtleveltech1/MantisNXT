// Logistics Module TypeScript Types

export type DeliveryStatus =
  | 'pending'
  | 'confirmed'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'returned';

export type DeliveryServiceTier = 'standard' | 'express' | 'urgent';

export type CourierProviderStatus = 'active' | 'inactive' | 'suspended';

export interface Address {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
  lat?: number;
  lng?: number;
}

export interface CourierProvider {
  id: string;
  org_id: string;
  name: string;
  code: string; // 'postnet', 'fastway', 'courierguy', 'dhl'
  status: CourierProviderStatus;
  api_endpoint?: string;
  api_credentials?: Record<string, any>; // Encrypted
  is_default: boolean;
  supports_tracking: boolean;
  supports_quotes: boolean;
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryServiceTier {
  id: string;
  org_id: string;
  tier: DeliveryServiceTier;
  name: string;
  description?: string;
  estimated_days_min?: number;
  estimated_days_max?: number;
  estimated_hours_min?: number;
  estimated_hours_max?: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  org_id: string;
  delivery_number: string;
  status: DeliveryStatus;

  // Links
  quotation_id?: string;
  sales_order_id?: string;

  // Customer
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;

  // Addresses
  pickup_address: Address;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_lat?: number;
  pickup_lng?: number;

  delivery_address: Address;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  delivery_lat?: number;
  delivery_lng?: number;

  // Courier
  courier_provider_id?: string;
  service_tier_id?: string;
  tracking_number?: string;

  // Package
  package_type?: string;
  weight_kg?: number;
  dimensions_length_cm?: number;
  dimensions_width_cm?: number;
  dimensions_height_cm?: number;
  declared_value?: number;

  // Options
  requires_signature: boolean;
  is_fragile: boolean;
  is_insured: boolean;
  special_instructions?: string;

  // Cost
  cost_quoted?: number;
  cost_actual?: number;
  currency: string;

  // Dates
  requested_pickup_date?: string;
  requested_delivery_date?: string;
  actual_pickup_date?: string;
  actual_delivery_date?: string;
  estimated_delivery_date?: string;

  // Dropshipping
  is_dropshipping: boolean;
  supplier_id?: string;
  supplier_shipping_address?: Address;

  // Metadata
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  quotation_item_id?: string;
  sales_order_item_id?: string;
  product_id?: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_weight_kg?: number;
  metadata?: Record<string, any>;
}

export interface DeliveryCostQuote {
  id: string;
  org_id: string;
  delivery_id?: string;
  quotation_id?: string;
  sales_order_id?: string;
  courier_provider_id: string;
  service_tier_id?: string;
  cost: number;
  currency: string;
  estimated_delivery_days?: number;
  estimated_delivery_date?: string;
  base_cost?: number;
  fuel_surcharge?: number;
  insurance_cost?: number;
  other_fees?: number;
  is_selected: boolean;
  expires_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DeliveryStatusHistory {
  id: string;
  delivery_id: string;
  status: DeliveryStatus;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  notes?: string;
  courier_name?: string;
  courier_phone?: string;
  timestamp: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryInventoryAllocation {
  id: string;
  delivery_id: string;
  inventory_allocation_id: string;
  quantity: number;
  created_at: string;
}

export interface QuotationDeliveryOptions {
  id: string;
  quotation_id: string;
  delivery_address: Address;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  service_tier_id?: string;
  preferred_courier_provider_id?: string;
  selected_cost_quote_id?: string;
  special_instructions?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderDeliveryOptions {
  id: string;
  sales_order_id: string;
  delivery_address: Address;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  service_tier_id?: string;
  courier_provider_id?: string;
  delivery_id?: string;
  special_instructions?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Insert/Update types
export interface CourierProviderInsert {
  org_id: string;
  name: string;
  code: string;
  status?: CourierProviderStatus;
  api_endpoint?: string;
  api_credentials?: Record<string, any>;
  is_default?: boolean;
  supports_tracking?: boolean;
  supports_quotes?: boolean;
  metadata?: Record<string, any>;
}

export interface DeliveryInsert {
  org_id: string;
  delivery_number?: string; // Auto-generated if not provided
  status?: DeliveryStatus;
  quotation_id?: string;
  sales_order_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address: Address;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_address: Address;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  courier_provider_id?: string;
  service_tier_id?: string;
  tracking_number?: string;
  package_type?: string;
  weight_kg?: number;
  dimensions_length_cm?: number;
  dimensions_width_cm?: number;
  dimensions_height_cm?: number;
  declared_value?: number;
  requires_signature?: boolean;
  is_fragile?: boolean;
  is_insured?: boolean;
  special_instructions?: string;
  cost_quoted?: number;
  cost_actual?: number;
  currency?: string;
  requested_pickup_date?: string;
  requested_delivery_date?: string;
  actual_pickup_date?: string;
  actual_delivery_date?: string;
  estimated_delivery_date?: string;
  is_dropshipping?: boolean;
  supplier_id?: string;
  supplier_shipping_address?: Address;
  metadata?: Record<string, any>;
}

export interface DeliveryCostQuoteInsert {
  org_id: string;
  delivery_id?: string;
  quotation_id?: string;
  sales_order_id?: string;
  courier_provider_id: string;
  service_tier_id?: string;
  cost: number;
  currency?: string;
  estimated_delivery_days?: number;
  estimated_delivery_date?: string;
  base_cost?: number;
  fuel_surcharge?: number;
  insurance_cost?: number;
  other_fees?: number;
  is_selected?: boolean;
  expires_at?: string;
  metadata?: Record<string, any>;
}

// Request types for API
export interface GetDeliveryQuotesRequest {
  pickup_address: Address;
  delivery_address: Address;
  weight_kg: number;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  service_tier?: DeliveryServiceTier;
  declared_value?: number;
  requires_signature?: boolean;
  is_fragile?: boolean;
  is_insured?: boolean;
  quotation_id?: string;
  sales_order_id?: string;
}

export interface DeliveryQuoteResponse {
  quotes: DeliveryCostQuote[];
  selected_quote_id?: string;
}

