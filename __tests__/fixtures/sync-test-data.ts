/**
 * Test fixtures and data generators for sync services
 */

export const generateCustomerData = (count: number = 10) => {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    customers.push({
      id: i,
      email: `customer${i}@example.com`,
      first_name: `Customer${i}`,
      last_name: `Test${i}`,
      username: `user${i}`,
      billing: {
        first_name: `Customer${i}`,
        last_name: `Test${i}`,
        company: `Company${i}`,
        address_1: `${i} Main St`,
        address_2: `Suite ${i}`,
        city: `City${i}`,
        state: `State${i}`,
        postcode: `12345`,
        country: `US`,
        phone: `555-000-${String(i).padStart(4, '0')}`,
      },
      shipping: {
        first_name: `Customer${i}`,
        last_name: `Test${i}`,
        company: `Company${i}`,
        address_1: `${i} Ship St`,
        address_2: `Suite ${i}`,
        city: `ShipCity${i}`,
        state: `ShipState${i}`,
        postcode: `54321`,
        country: `US`,
      },
      meta_data: [
        { key: 'vat_id', value: `VAT${i}` },
        { key: 'external_id', value: `ext-${i}` },
      ],
    });
  }
  return customers;
};

export const generateOrderData = (customerId: number, orderCount: number = 5) => {
  const orders = [];
  for (let i = 1; i <= orderCount; i++) {
    const isCompleted = Math.random() > 0.2; // 80% completed orders
    orders.push({
      id: `${customerId}-${i}`,
      customer_id: customerId,
      status: isCompleted ? 'completed' : 'processing',
      total: (Math.random() * 10000 + 100).toFixed(2),
      date_created: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      line_items: [
        {
          id: `${customerId}-${i}-1`,
          product_id: Math.floor(Math.random() * 100) + 1,
          quantity: Math.floor(Math.random() * 5) + 1,
          total: (Math.random() * 5000 + 50).toFixed(2),
        },
      ],
    });
  }
  return orders;
};

export const generateSyncQueueData = (
  orgId: string = 'org-123',
  queueName: string = 'Test Sync Queue',
  state: string = 'draft'
) => {
  return {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    org_id: orgId,
    queue_name: queueName,
    source_system: 'woocommerce',
    created_by: 'user-123',
    state: state,
    batch_size: 50,
    batch_delay_ms: 2000,
    idempotency_key: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    total_count: 0,
    done_count: 0,
    failed_count: 0,
    processing: false,
    process_count: 0,
    action_required: false,
    progress: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const generateSyncQueueLineData = (queueId: string, wooCustomerId: number) => {
  return {
    id: `line-${queueId}-${wooCustomerId}`,
    queue_id: queueId,
    woo_customer_id: wooCustomerId,
    state: 'draft',
    external_id: `ext-${wooCustomerId}`,
    customer_data: generateCustomerData(1)[0],
    result_id: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const generateDeltaData = () => {
  return {
    new: generateCustomerData(10),
    updated: generateCustomerData(5),
    deleted: generateCustomerData(3),
    total: 18,
    hasChanges: true,
  };
};

export const generateConflictData = (type: string = 'DataMismatch') => {
  const conflictId = `conflict-${Date.now()}`;

  const conflicts = {
    DataMismatch: {
      id: conflictId,
      type: 'DataMismatch',
      entityId: 'cust-123',
      externalId: 'woo-456',
      field: 'email',
      currentValue: 'old@example.com',
      incomingValue: 'new@example.com',
      source: 'woocommerce',
      timestamp: new Date().toISOString(),
      resolved: false,
      resolution: null,
    },
    DuplicateKey: {
      id: conflictId,
      type: 'DuplicateKey',
      entityId: 'cust-123',
      externalId: 'woo-456',
      key: 'email',
      value: 'duplicate@example.com',
      existingEntityId: 'cust-789',
      source: 'woocommerce',
      timestamp: new Date().toISOString(),
      resolved: false,
      resolution: null,
    },
    ValidationError: {
      id: conflictId,
      type: 'ValidationError',
      entityId: 'cust-123',
      externalId: 'woo-456',
      field: 'phone',
      value: 'invalid-phone',
      rule: 'phone_format',
      message: 'Invalid phone number format',
      source: 'woocommerce',
      timestamp: new Date().toISOString(),
      resolved: false,
      resolution: null,
    },
  };

  return conflicts[type as keyof typeof conflicts] || conflicts.DataMismatch;
};

export const generateProgressSnapshot = () => {
  const startTime = Date.now() - 60000; // 60s ago
  const elapsedMs = 45000;
  const processed = 225;
  const total = 500;

  return {
    jobId: `job-${Date.now()}`,
    state: 'processing',
    startTime,
    elapsedMs,
    processed,
    total,
    created: 150,
    updated: 75,
    failed: 0,
    progress: (processed / total) * 100,
    itemsPerSecond: processed / (elapsedMs / 1000),
    estimatedTimeRemaining: Math.ceil(((total - processed) / (processed / (elapsedMs / 1000))) * 1000),
  };
};

export const mockWooCommerceResponse = (type: string = 'customers') => {
  const responses: Record<string, any> = {
    customers: {
      data: generateCustomerData(5),
      headers: { 'x-wp-total': '5', 'x-wp-totalpages': '1' },
    },
    orders: {
      data: generateOrderData(1, 10),
      headers: { 'x-wp-total': '10', 'x-wp-totalpages': '1' },
    },
    customerDetails: {
      data: generateCustomerData(1)[0],
      headers: {},
    },
  };

  return responses[type] || responses.customers;
};

export const mockApiResponse = (success: boolean = true, data: any = null, error: string = null) => {
  return {
    status: success ? 200 : 400,
    data: {
      success,
      data: data,
      error: error,
      timestamp: new Date().toISOString(),
    },
  };
};

export const mockSSEEvent = (type: string = 'progress', data: any = {}) => {
  return {
    type,
    data: JSON.stringify(data),
    timestamp: new Date().toISOString(),
  };
};

/**
 * Performance test data generators
 */

export const generateLargeCustomerDataset = (count: number) => {
  console.log(`Generating ${count} customer records for performance testing...`);
  const customers = [];

  for (let i = 1; i <= count; i++) {
    customers.push({
      id: i,
      email: `perf-customer${i}@test.example.com`,
      first_name: `PerfCustomer${i}`,
      last_name: `Test`,
      username: `perfuser${i}`,
      billing: {
        first_name: `PerfCustomer${i}`,
        last_name: `Test`,
        company: `PerfCompany${i % 100}`,
        address_1: `${i} Performance St`,
        address_2: null,
        city: `TestCity${i % 50}`,
        state: `TS`,
        postcode: `00000`,
        country: `US`,
        phone: `555-${String(i).padStart(7, '0')}`,
      },
      shipping: {
        first_name: `PerfCustomer${i}`,
        last_name: `Test`,
        company: `PerfCompany${i % 100}`,
        address_1: `${i} Performance Blvd`,
        address_2: null,
        city: `TestCity${i % 50}`,
        state: `TS`,
        postcode: `00000`,
        country: `US`,
      },
      meta_data: [],
    });
  }

  return customers;
};

export const generateTestDatabase = () => {
  return {
    customers: [
      {
        id: 'cust-1',
        org_id: 'org-test',
        email: 'existing@example.com',
        name: 'Existing Customer',
        segment: 'smb',
        status: 'active',
        lifetime_value: 5000,
        created_at: new Date(),
      },
    ],
    conflicts: [],
    syncQueues: [],
    syncQueueLines: [],
  };
};
