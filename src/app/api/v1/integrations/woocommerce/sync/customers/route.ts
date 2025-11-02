/**
 * WooCommerce Customer Sync API
 *
 * Syncs customer data from WooCommerce to MantisNXT including:
 * - Customer profile information
 * - Order history
 * - Lifetime value calculations
 * - Acquisition dates
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { WooCommerceService, WooCommerceCustomer, WooCommerceOrder } from '@/lib/services/WooCommerceService';

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

interface CustomerSyncResult {
  success: boolean;
  customersProcessed: number;
  customersCreated: number;
  customersUpdated: number;
  errors: Array<{
    wooCustomerId?: number;
    email?: string;
    error: string;
  }>;
}

/**
 * Map WooCommerce customer segment based on order count and total spent
 */
function determineCustomerSegment(orderCount: number, totalSpent: number): string {
  if (totalSpent > 50000) return 'enterprise';
  if (totalSpent > 20000 || orderCount > 50) return 'mid_market';
  if (totalSpent > 5000 || orderCount > 10) return 'smb';
  if (orderCount > 2) return 'startup';
  return 'individual';
}

/**
 * Map WooCommerce customer data to MantisNXT customer schema
 */
async function mapWooCustomerToMantis(
  wooCustomer: WooCommerceCustomer,
  wooOrders: WooCommerceOrder[]
): Promise<any> {
  // Calculate lifetime value from orders
  const lifetimeValue = wooOrders.reduce(
    (sum, order) => sum + parseFloat(order.total || '0'),
    0
  );

  // Count completed orders
  const completedOrders = wooOrders.filter(
    (order) => order.status === 'completed'
  );

  // Find first and last order dates
  const orderDates = wooOrders
    .map((order) => new Date(order.date_created || ''))
    .sort((a, b) => a.getTime() - b.getTime());

  const acquisitionDate = orderDates.length > 0 ? orderDates[0] : new Date();
  const lastInteractionDate = orderDates.length > 0 ? orderDates[orderDates.length - 1] : new Date();

  // Determine segment
  const segment = determineCustomerSegment(completedOrders.length, lifetimeValue);

  // Build address object
  const address = wooCustomer.billing
    ? {
        street: [wooCustomer.billing.address_1, wooCustomer.billing.address_2]
          .filter(Boolean)
          .join(', '),
        city: wooCustomer.billing.city,
        state: wooCustomer.billing.state,
        postal_code: wooCustomer.billing.postcode,
        country: wooCustomer.billing.country,
      }
    : null;

  // Build metadata from WooCommerce meta_data
  const metadata: Record<string, any> = {
    woocommerce_id: wooCustomer.id,
    username: wooCustomer.username,
    total_orders: wooOrders.length,
    completed_orders: completedOrders.length,
  };

  if (wooCustomer.meta_data) {
    wooCustomer.meta_data.forEach((meta) => {
      metadata[meta.key] = meta.value;
    });
  }

  // Build tags array
  const tags: string[] = ['woocommerce'];
  if (completedOrders.length > 10) tags.push('high-value');
  if (completedOrders.length === 0) tags.push('prospect');
  if (orderDates.length > 0 && (Date.now() - lastInteractionDate.getTime()) < 30 * 24 * 60 * 60 * 1000) {
    tags.push('active');
  }

  return {
    name: `${wooCustomer.first_name || ''} ${wooCustomer.last_name || ''}`.trim() || wooCustomer.email,
    email: wooCustomer.email,
    phone: wooCustomer.billing?.phone || wooCustomer.shipping?.phone || null,
    company: wooCustomer.billing?.company || wooCustomer.shipping?.company || null,
    segment,
    status: completedOrders.length > 0 ? 'active' : 'prospect',
    lifetime_value: lifetimeValue,
    acquisition_date: acquisitionDate.toISOString(),
    last_interaction_date: lastInteractionDate.toISOString(),
    address,
    metadata,
    tags,
  };
}

/**
 * Sync a single customer from WooCommerce
 */
async function syncSingleCustomer(
  wooService: WooCommerceService,
  wooCustomer: WooCommerceCustomer,
  orgId: string
): Promise<{ success: boolean; customerId?: string; wasUpdate?: boolean; error?: string }> {
  try {
    // Fetch customer's orders
    const ordersResponse = await wooService.getOrders({
      customer: wooCustomer.id,
      per_page: 100,
    });
    const wooOrders = ordersResponse.data;

    // Map to MantisNXT customer format
    const mantisCustomer = await mapWooCustomerToMantis(wooCustomer, wooOrders);

    // Check if customer already exists by email
    const existingCustomer = await query<any>(
      `SELECT id FROM customer WHERE email = $1 AND org_id = $2`,
      [mantisCustomer.email, orgId]
    );

    if (existingCustomer.rows.length > 0) {
      // Update existing customer
      const customerId = existingCustomer.rows[0].id;

      await query(
        `UPDATE customer
         SET
           name = $1,
           phone = $2,
           company = $3,
           segment = $4::customer_segment,
           status = $5::customer_status,
           lifetime_value = $6,
           acquisition_date = $7,
           last_interaction_date = $8,
           address = $9::jsonb,
           metadata = $10::jsonb,
           tags = $11,
           updated_at = NOW()
         WHERE id = $12`,
        [
          mantisCustomer.name,
          mantisCustomer.phone,
          mantisCustomer.company,
          mantisCustomer.segment,
          mantisCustomer.status,
          mantisCustomer.lifetime_value,
          mantisCustomer.acquisition_date,
          mantisCustomer.last_interaction_date,
          JSON.stringify(mantisCustomer.address),
          JSON.stringify(mantisCustomer.metadata),
          mantisCustomer.tags,
          customerId,
        ]
      );

      return { success: true, customerId, wasUpdate: true };
    } else {
      // Create new customer
      const result = await query<any>(
        `INSERT INTO customer (
           org_id,
           name,
           email,
           phone,
           company,
           segment,
           status,
           lifetime_value,
           acquisition_date,
           last_interaction_date,
           address,
           metadata,
           tags,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6::customer_segment, $7::customer_status, $8, $9, $10, $11::jsonb, $12::jsonb, $13, NOW(), NOW())
         RETURNING id`,
        [
          orgId,
          mantisCustomer.name,
          mantisCustomer.email,
          mantisCustomer.phone,
          mantisCustomer.company,
          mantisCustomer.segment,
          mantisCustomer.status,
          mantisCustomer.lifetime_value,
          mantisCustomer.acquisition_date,
          mantisCustomer.last_interaction_date,
          JSON.stringify(mantisCustomer.address),
          JSON.stringify(mantisCustomer.metadata),
          mantisCustomer.tags,
        ]
      );

      return { success: true, customerId: result.rows[0].id, wasUpdate: false };
    }
  } catch (error: any) {
    console.error(`Error syncing customer ${wooCustomer.email}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Process customers in batches with delays to prevent overwhelming the database
 */
async function processBatch(
  batch: WooCommerceCustomer[],
  wooService: WooCommerceService,
  orgId: string,
  result: CustomerSyncResult
): Promise<void> {
  for (const wooCustomer of batch) {
    result.customersProcessed++;

    let syncResult = await syncSingleCustomer(wooService, wooCustomer, orgId);

    // CRITICAL FIX: If circuit breaker is open, wait and retry once
    if (syncResult.error && syncResult.error.includes('circuit breaker is open')) {
      console.log(`Circuit breaker open for ${wooCustomer.email}, waiting 60s and retrying...`);
      await delay(60000); // Wait 60 seconds for circuit to close
      syncResult = await syncSingleCustomer(wooService, wooCustomer, orgId);
    }

    if (syncResult.success) {
      if (syncResult.wasUpdate) {
        result.customersUpdated++;
      } else {
        result.customersCreated++;
      }
    } else {
      result.errors.push({
        wooCustomerId: wooCustomer.id,
        email: wooCustomer.email,
        error: syncResult.error || 'Unknown error',
      });
    }
  }
}

/**
 * Delay helper for batch processing
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * POST /api/v1/integrations/woocommerce/sync/customers
 * Sync customers from WooCommerce to MantisNXT
 */
export async function POST(request: NextRequest) {
  try {
    // Safely parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { config, org_id, options = {} } = body as {
      config: WooCommerceConfig;
      org_id: string;
      options?: {
        limit?: number;
        email?: string;
        wooCustomerId?: number;
      };
    };

    if (!config || !config.url || !config.consumerKey || !config.consumerSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'WooCommerce configuration is required (url, consumerKey, consumerSecret)',
        },
        { status: 400 }
      );
    }

    if (!org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_id is required',
        },
        { status: 400 }
      );
    }

    // Initialize WooCommerce service
    const wooService = new WooCommerceService(config);

    // Test connection
    const connected = await wooService.testConnection();
    if (!connected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to WooCommerce store',
        },
        { status: 500 }
      );
    }

    const result: CustomerSyncResult = {
      success: true,
      customersProcessed: 0,
      customersCreated: 0,
      customersUpdated: 0,
      errors: [],
    };

    // Fetch customers
    let wooCustomers: WooCommerceCustomer[];

    if (options.wooCustomerId) {
      // Sync single customer by ID
      const response = await wooService.getCustomer(options.wooCustomerId);
      wooCustomers = [response.data];
    } else if (options.email) {
      // Sync single customer by email
      const response = await wooService.getCustomers({ email: options.email });
      wooCustomers = response.data;
    } else {
      // Sync all customers (with pagination)
      wooCustomers = await wooService.fetchAllPages(
        (params) => wooService.getCustomers(params),
        {
          per_page: options.limit || 100,
          order: 'desc',
          orderby: 'registered_date',
        }
      );
    }

    console.log(`Syncing ${wooCustomers.length} customers from WooCommerce...`);

    // CRITICAL FIX: Process customers in batches to prevent overwhelming the database
    const BATCH_SIZE = 10; // Process 10 customers at a time
    const BATCH_DELAY_MS = 2000; // 2 second delay between batches

    for (let i = 0; i < wooCustomers.length; i += BATCH_SIZE) {
      const batch = wooCustomers.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(wooCustomers.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} customers)...`);

      await processBatch(batch, wooService, org_id, result);

      // Add delay between batches (except after the last batch)
      if (i + BATCH_SIZE < wooCustomers.length) {
        console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await delay(BATCH_DELAY_MS);
      }
    }

    result.success = result.errors.length === 0;

    return NextResponse.json({
      success: result.success,
      data: result,
      message: `Synced ${result.customersProcessed} customers: ${result.customersCreated} created, ${result.customersUpdated} updated`,
    });
  } catch (error: any) {
    console.error('Error syncing customers from WooCommerce:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync customers',
      },
      { status: 500 }
    );
  }
}
