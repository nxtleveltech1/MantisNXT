/**
 * AV Equipment Rentals Types
 */

export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
export type EquipmentAvailabilityStatus = 'available' | 'rented' | 'maintenance' | 'retired';
export type ReservationStatus = 'pending' | 'confirmed' | 'picked_up' | 'active' | 'returned' | 'cancelled';
export type RentalPaymentStatus = 'pending' | 'deposit_paid' | 'partially_paid' | 'paid' | 'overdue' | 'refunded' | 'cancelled';
export type DamageType = 'physical_damage' | 'missing_parts' | 'malfunction' | 'cosmetic';
export type DamageSeverity = 'minor' | 'moderate' | 'major' | 'total_loss';
export type DamageReportStatus = 'reported' | 'assessed' | 'invoiced' | 'paid' | 'closed';
export type CheckoutType = 'pickup' | 'delivery';
export type CheckinType = 'return' | 'pickup';

export interface Equipment {
  equipment_id: string;
  sku: string;
  name: string;
  equipment_type: string;
  category_id?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  barcode?: string;
  rfid_tag?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  replacement_value?: number;
  condition_status: EquipmentCondition;
  condition_notes?: string;
  availability_status: EquipmentAvailabilityStatus;
  current_location_id?: string;
  rental_rate_daily?: number;
  rental_rate_weekly?: number;
  rental_rate_monthly?: number;
  security_deposit?: number;
  insurance_required: boolean;
  insurance_coverage_amount?: number;
  technical_specs?: Record<string, unknown>;
  compatibility_info?: Record<string, unknown>;
  calibration_date?: string;
  calibration_certificate_url?: string;
  last_maintenance_date?: string;
  next_maintenance_due?: string;
  maintenance_schedule_days?: number;
  warranty_expiry?: string;
  requires_certification: boolean;
  certification_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentPackage {
  package_id: string;
  name: string;
  description?: string;
  package_type?: string;
  rental_rate_daily?: number;
  rental_rate_weekly?: number;
  rental_rate_monthly?: number;
  is_active: boolean;
  created_at: string;
}

export interface PackageItem {
  package_item_id: string;
  package_id: string;
  equipment_id: string;
  quantity: number;
  is_required: boolean;
  sort_order: number;
}

export interface Reservation {
  reservation_id: string;
  reservation_number: string;
  customer_id: string;
  event_name?: string;
  event_type?: string;
  event_date_start?: string;
  event_date_end?: string;
  rental_start_date: string;
  rental_end_date: string;
  pickup_date?: string;
  return_date?: string;
  pickup_location_id?: string;
  delivery_address?: string;
  delivery_required: boolean;
  delivery_cost: number;
  setup_required: boolean;
  setup_cost: number;
  status: ReservationStatus;
  total_equipment_value: number;
  security_deposit_amount: number;
  security_deposit_paid: number;
  security_deposit_returned: number;
  insurance_coverage_amount: number;
  insurance_provider?: string;
  insurance_policy_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Financial fields
  ar_invoice_id?: string;
  quote_id?: string;
  quote_number?: string;
  quote_date?: string;
  quote_expiry_date?: string;
  quote_approved?: boolean;
  quote_approved_at?: string;
  quote_approved_by?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_rental_amount: number;
  total_amount_due: number;
  payment_status: RentalPaymentStatus;
  amount_paid: number;
  amount_due: number;
  payment_terms?: string;
  due_date?: string;
  first_payment_date?: string;
  fully_paid_date?: string;
  currency: string;
  exchange_rate: number;
  late_return_fee: number;
  cleaning_fee: number;
  other_charges: number;
  other_charges_description?: string;
  refund_amount: number;
  refund_date?: string;
  refund_reason?: string;
}

export interface ReservationItem {
  reservation_item_id: string;
  reservation_id: string;
  equipment_id: string;
  package_id?: string;
  quantity: number;
  rental_rate: number;
  rental_period_days: number;
  line_total: number;
  condition_at_pickup?: EquipmentCondition;
  condition_at_return?: EquipmentCondition;
  damage_assessed: boolean;
  damage_cost: number;
  damage_notes?: string;
  // Financial fields
  tax_rate: number;
  tax_amount: number;
  discount_percentage: number;
  discount_amount: number;
  line_total_before_tax: number;
  line_total_after_tax: number;
}

export interface RentalAgreement {
  agreement_id: string;
  reservation_id: string;
  agreement_number: string;
  agreement_type: string;
  terms_and_conditions?: string;
  liability_waiver?: string;
  customer_signature?: string;
  customer_signed_at?: string;
  staff_signature?: string;
  staff_signed_at?: string;
  signed_by?: string;
  agreement_pdf_url?: string;
  created_at: string;
}

export interface EquipmentCheckout {
  checkout_id: string;
  reservation_id: string;
  checkout_type: CheckoutType;
  scheduled_datetime?: string;
  actual_datetime?: string;
  checked_out_by?: string;
  verified_by?: string;
  equipment_condition_notes?: string;
  photos_before?: string[];
  delivery_driver?: string;
  delivery_vehicle?: string;
  delivery_tracking_number?: string;
  created_at: string;
}

export interface EquipmentCheckin {
  checkin_id: string;
  reservation_id: string;
  checkin_type: CheckinType;
  scheduled_datetime?: string;
  actual_datetime?: string;
  checked_in_by?: string;
  verified_by?: string;
  equipment_condition_notes?: string;
  photos_after?: string[];
  damage_reported: boolean;
  missing_items?: string[];
  cleaning_required: boolean;
  maintenance_required: boolean;
  created_at: string;
}

export interface DamageReport {
  damage_report_id: string;
  reservation_id: string;
  equipment_id: string;
  reported_by: string;
  reported_at: string;
  damage_type?: DamageType;
  damage_description: string;
  severity?: DamageSeverity;
  repair_cost_estimate?: number;
  replacement_cost?: number;
  photos?: string[];
  assessed_by?: string;
  assessed_at?: string;
  final_cost?: number;
  customer_liable: boolean;
  insurance_claim_filed: boolean;
  insurance_claim_number?: string;
  status: DamageReportStatus;
  notes?: string;
}

export interface CreateEquipmentInput {
  sku: string;
  name: string;
  equipment_type: string;
  category_id?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  barcode?: string;
  rental_rate_daily?: number;
  rental_rate_weekly?: number;
  rental_rate_monthly?: number;
  security_deposit?: number;
  technical_specs?: Record<string, unknown>;
  compatibility_info?: Record<string, unknown>;
}

export interface CreateReservationInput {
  customer_id: string;
  event_name?: string;
  event_type?: string;
  event_date_start?: string;
  event_date_end?: string;
  rental_start_date: string;
  rental_end_date: string;
  pickup_location_id?: string;
  delivery_address?: string;
  delivery_required?: boolean;
  setup_required?: boolean;
  items: Array<{
    equipment_id: string;
    quantity: number;
  }>;
}

export interface AvailabilityCheck {
  equipment_id: string;
  start_date: string;
  end_date: string;
}

