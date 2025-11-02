/**
 * Customer Data Seed Script
 *
 * Populates the database with sample customer data for testing
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.NEON_SPP_DATABASE_URL,
});

const SAMPLE_CUSTOMERS = [
  {
    name: 'John Smith',
    email: 'john.smith@techcorp.com',
    phone: '+1-555-0101',
    company: 'TechCorp Inc',
    segment: 'enterprise',
    status: 'active',
    lifetime_value: 125000,
    acquisition_date: '2023-01-15',
    last_interaction_date: '2025-10-28',
    tags: ['vip', 'tech-stack', 'long-term'],
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@startupco.io',
    phone: '+1-555-0102',
    company: 'StartupCo',
    segment: 'startup',
    status: 'active',
    lifetime_value: 8500,
    acquisition_date: '2024-06-20',
    last_interaction_date: '2025-10-30',
    tags: ['startup', 'high-growth'],
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@midmarket.com',
    phone: '+1-555-0103',
    company: 'MidMarket Solutions',
    segment: 'mid_market',
    status: 'active',
    lifetime_value: 45000,
    acquisition_date: '2023-09-10',
    last_interaction_date: '2025-10-25',
    tags: ['mid-market', 'reliable'],
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.r@smallbiz.com',
    phone: '+1-555-0104',
    company: 'Small Biz LLC',
    segment: 'smb',
    status: 'active',
    lifetime_value: 12000,
    acquisition_date: '2024-03-05',
    last_interaction_date: '2025-10-29',
    tags: ['smb', 'growing'],
  },
  {
    name: 'David Park',
    email: 'david.park@individual.net',
    phone: '+1-555-0105',
    company: null,
    segment: 'individual',
    status: 'active',
    lifetime_value: 2500,
    acquisition_date: '2024-08-12',
    last_interaction_date: '2025-10-26',
    tags: ['individual', 'frequent'],
  },
  {
    name: 'Lisa Anderson',
    email: 'lisa@enterprisemega.com',
    phone: '+1-555-0106',
    company: 'Enterprise Mega Corp',
    segment: 'enterprise',
    status: 'active',
    lifetime_value: 250000,
    acquisition_date: '2022-11-01',
    last_interaction_date: '2025-10-31',
    tags: ['enterprise', 'vip', 'strategic'],
  },
  {
    name: 'Robert Taylor',
    email: 'robert@inactive.com',
    phone: '+1-555-0107',
    company: 'Inactive Corp',
    segment: 'smb',
    status: 'inactive',
    lifetime_value: 5000,
    acquisition_date: '2023-05-15',
    last_interaction_date: '2024-12-10',
    tags: ['inactive', 'follow-up'],
  },
  {
    name: 'Jennifer White',
    email: 'jennifer@prospect.com',
    phone: '+1-555-0108',
    company: 'Prospect Industries',
    segment: 'mid_market',
    status: 'prospect',
    lifetime_value: 0,
    acquisition_date: '2025-10-15',
    last_interaction_date: '2025-10-20',
    tags: ['prospect', 'interested'],
  },
  {
    name: 'James Martinez',
    email: 'james@churned.com',
    phone: '+1-555-0109',
    company: 'Churned Co',
    segment: 'smb',
    status: 'churned',
    lifetime_value: 15000,
    acquisition_date: '2023-02-20',
    last_interaction_date: '2025-03-15',
    tags: ['churned', 'win-back'],
  },
  {
    name: 'Amanda Lewis',
    email: 'amanda@superenterprise.com',
    phone: '+1-555-0110',
    company: 'Super Enterprise',
    segment: 'enterprise',
    status: 'active',
    lifetime_value: 500000,
    acquisition_date: '2022-01-05',
    last_interaction_date: '2025-11-01',
    tags: ['enterprise', 'vip', 'platinum', 'strategic'],
  },
  {
    name: 'Christopher Hall',
    email: 'chris@startupnext.io',
    phone: '+1-555-0111',
    company: 'StartupNext',
    segment: 'startup',
    status: 'active',
    lifetime_value: 3500,
    acquisition_date: '2024-09-01',
    last_interaction_date: '2025-10-27',
    tags: ['startup', 'fast-growing'],
  },
  {
    name: 'Michelle Garcia',
    email: 'michelle@individual.net',
    phone: '+1-555-0112',
    company: null,
    segment: 'individual',
    status: 'active',
    lifetime_value: 750,
    acquisition_date: '2024-11-10',
    last_interaction_date: '2025-10-22',
    tags: ['individual', 'occasional'],
  },
  {
    name: 'Daniel Young',
    email: 'daniel@midmarket2.com',
    phone: '+1-555-0113',
    company: 'MidMarket Two',
    segment: 'mid_market',
    status: 'active',
    lifetime_value: 32000,
    acquisition_date: '2023-07-18',
    last_interaction_date: '2025-10-24',
    tags: ['mid-market', 'steady'],
  },
  {
    name: 'Jessica King',
    email: 'jessica@smallbusiness.com',
    phone: '+1-555-0114',
    company: 'Small Business Inc',
    segment: 'smb',
    status: 'active',
    lifetime_value: 9800,
    acquisition_date: '2024-04-22',
    last_interaction_date: '2025-10-28',
    tags: ['smb', 'growing'],
  },
  {
    name: 'Kevin Wright',
    email: 'kevin@prospect2.com',
    phone: '+1-555-0115',
    company: 'Prospect Two LLC',
    segment: 'startup',
    status: 'prospect',
    lifetime_value: 0,
    acquisition_date: '2025-10-25',
    last_interaction_date: '2025-10-25',
    tags: ['prospect', 'demo-scheduled'],
  },
];

async function seedCustomers() {
  const client = await pool.connect();

  try {
    console.log('Starting customer data seed...');

    // Check if customers already exist
    const countResult = await client.query('SELECT COUNT(*) FROM customer');
    const existingCount = parseInt(countResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing customers. Skipping seed.`);
      console.log('To re-seed, first delete existing customers: DELETE FROM customer;');
      return;
    }

    // Insert customers
    for (const customer of SAMPLE_CUSTOMERS) {
      await client.query(
        `INSERT INTO customer (
          name, email, phone, company, segment, status, lifetime_value,
          acquisition_date, last_interaction_date, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          customer.name,
          customer.email,
          customer.phone,
          customer.company,
          customer.segment,
          customer.status,
          customer.lifetime_value,
          customer.acquisition_date,
          customer.last_interaction_date,
          customer.tags,
        ]
      );
    }

    console.log(`Successfully seeded ${SAMPLE_CUSTOMERS.length} customers!`);

    // Show summary
    const summaryResult = await client.query(`
      SELECT
        segment,
        status,
        COUNT(*) as count,
        SUM(lifetime_value) as total_value
      FROM customer
      GROUP BY segment, status
      ORDER BY segment, status
    `);

    console.log('\nCustomer Summary:');
    console.table(summaryResult.rows);

  } catch (error) {
    console.error('Error seeding customers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedCustomers();
