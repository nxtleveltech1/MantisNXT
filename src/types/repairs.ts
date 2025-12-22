/**
 * AV Equipment Repairs Types
 */

export type RepairOrderType = 'repair' | 'maintenance' | 'calibration' | 'inspection';
export type RepairPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RepairOrderStatus = 'received' | 'diagnosed' | 'in_progress' | 'waiting_parts' | 'testing' | 'completed' | 'cancelled';
export type RepairPaymentStatus = 'pending' | 'quote_sent' | 'quote_approved' | 'deposit_paid' | 'partially_paid' | 'paid' | 'overdue' | 'warranty_covered' | 'cancelled';
export type TestResult = 'pass' | 'fail' | 'partial';
export type PMType = 'scheduled' | 'inspection' | 'calibration' | 'cleaning';

export interface Technician {
  technician_id: string;
  user_id?: string;
  employee_number?: string;
  specializations?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    expiry_date?: string;
  }>;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
}

export interface RepairOrder {
  repair_order_id: string;
  repair_order_number: string;
  equipment_id?: string;
  customer_id?: string;
  order_type: RepairOrderType;
  priority: RepairPriority;
  status: RepairOrderStatus;
  reported_issue: string;
  diagnosis?: string;
  diagnosed_by?: string;
  diagnosed_at?: string;
  assigned_technician_id?: string;
  estimated_completion_date?: string;
  actual_start_date?: string;
  actual_completion_date?: string;
  labor_hours: number;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  warranty_covered: boolean;
  warranty_type?: string;
  warranty_expiry?: string;
  customer_quote_approved?: boolean;
  customer_quote_approved_at?: string;
  invoice_id?: string; // Deprecated - use ar_invoice_id
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
  quote_sent_date?: string;
  quote_approved?: boolean;
  quote_approved_at?: string;
  quote_approved_by?: string;
  estimated_labor_hours: number;
  estimated_labor_cost: number;
  estimated_parts_cost: number;
  estimated_total_cost: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  subtotal: number;
  total_cost_before_tax: number;
  total_cost_after_tax: number;
  payment_status: RepairPaymentStatus;
  amount_paid: number;
  amount_due: number;
  payment_terms?: string;
  due_date?: string;
  first_payment_date?: string;
  fully_paid_date?: string;
  currency: string;
  exchange_rate: number;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_paid: number;
  deposit_paid_date?: string;
  diagnostic_fee: number;
  rush_fee: number;
  other_charges: number;
  other_charges_description?: string;
  refund_amount: number;
  refund_date?: string;
  refund_reason?: string;
}

export interface RepairOrderItem {
  repair_item_id: string;
  repair_order_id: string;
  part_id?: string;
  part_name?: string;
  quantity: number;
  unit_cost?: number;
  line_total: number;
  notes?: string;
  // Financial fields
  tax_rate: number;
  tax_amount: number;
  discount_percentage: number;
  discount_amount: number;
  line_total_before_tax: number;
  line_total_after_tax: number;
}

export interface RepairTimeline {
  timeline_id: string;
  repair_order_id: string;
  status: string;
  notes?: string;
  updated_by?: string;
  updated_at: string;
}

export interface RepairTest {
  test_id: string;
  repair_order_id: string;
  test_type?: string;
  test_name: string;
  test_result?: TestResult;
  test_data?: Record<string, unknown>;
  tested_by?: string;
  tested_at: string;
  notes?: string;
}

export interface PreventiveMaintenance {
  pm_id: string;
  equipment_id: string;
  pm_type?: PMType;
  frequency_days: number;
  last_performed_date?: string;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
}

export interface PMLog {
  pm_log_id: string;
  pm_id: string;
  performed_date: string;
  performed_by?: string;
  findings?: string;
  actions_taken?: string;
  parts_replaced?: string[];
  cost: number;
  next_due_date?: string;
  notes?: string;
  created_at: string;
}

export interface PartsInventory {
  part_id: string;
  product_id: string;
  location_id?: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
  last_received_date?: string;
  last_used_date?: string;
  updated_at: string;
}

export interface CreateRepairOrderInput {
  equipment_id?: string;
  customer_id?: string;
  order_type: RepairOrderType;
  priority?: RepairPriority;
  reported_issue: string;
  assigned_technician_id?: string;
  estimated_completion_date?: string;
}

export interface UpdateRepairOrderInput {
  status?: RepairOrderStatus;
  diagnosis?: string;
  assigned_technician_id?: string;
  estimated_completion_date?: string;
  labor_hours?: number;
  notes?: string;
}

export interface CreateRepairTestInput {
  repair_order_id: string;
  test_type?: string;
  test_name: string;
  test_result?: TestResult;
  test_data?: Record<string, unknown>;
  notes?: string;
}

