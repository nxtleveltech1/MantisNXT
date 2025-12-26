/**
 * Seed DocuStore with module folders and sample documents
 * Run: bun run scripts/seed-docustore.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const FOLDERS = [
  { id: 'f0000001-0000-0000-0000-000000000001', name: 'Sales', slug: 'sales', icon: 'file-text', color: '#3b82f6' },
  { id: 'f0000002-0000-0000-0000-000000000002', name: 'Rentals', slug: 'rentals', icon: 'calendar', color: '#10b981' },
  { id: 'f0000003-0000-0000-0000-000000000003', name: 'Repairs', slug: 'repairs', icon: 'wrench', color: '#f59e0b' },
  { id: 'f0000004-0000-0000-0000-000000000004', name: 'Financial', slug: 'financial', icon: 'dollar-sign', color: '#8b5cf6' },
  { id: 'f0000005-0000-0000-0000-000000000005', name: 'Purchasing', slug: 'purchasing', icon: 'shopping-cart', color: '#ec4899' },
  { id: 'f0000006-0000-0000-0000-000000000006', name: 'Logistics', slug: 'logistics', icon: 'truck', color: '#06b6d4' },
  { id: 'f0000007-0000-0000-0000-000000000007', name: 'Customers', slug: 'customers', icon: 'users', color: '#84cc16' },
  { id: 'f0000008-0000-0000-0000-000000000008', name: 'Inventory', slug: 'inventory', icon: 'package', color: '#f97316' },
];

const DOCUMENTS = [
  { title: 'Sales Invoice #INV-2025-001', type: 'invoice', folder: 'f0000001-0000-0000-0000-000000000001', tags: ['sales', 'invoice'] },
  { title: 'Quotation #QUO-2025-001', type: 'quotation', folder: 'f0000001-0000-0000-0000-000000000001', tags: ['sales', 'quotation'] },
  { title: 'Sales Order #SO-2025-001', type: 'sales_order', folder: 'f0000001-0000-0000-0000-000000000001', tags: ['sales', 'order'] },
  { title: 'Rental Agreement #RA-2025-001', type: 'rental_agreement', folder: 'f0000002-0000-0000-0000-000000000002', tags: ['rentals', 'agreement'] },
  { title: 'Repair Order #RO-2025-001', type: 'repair_order', folder: 'f0000003-0000-0000-0000-000000000003', tags: ['repairs', 'order'] },
  { title: 'Journal Entry #JE-2025-001', type: 'journal_entry', folder: 'f0000004-0000-0000-0000-000000000004', tags: ['financial', 'gl'] },
  { title: 'AP Invoice #AP-2025-001', type: 'ap_invoice', folder: 'f0000004-0000-0000-0000-000000000004', tags: ['financial', 'ap'] },
  { title: 'Purchase Order #PO-2025-001', type: 'purchase_order', folder: 'f0000005-0000-0000-0000-000000000005', tags: ['purchasing', 'order'] },
  { title: 'Delivery Note #DN-2025-001', type: 'delivery_note', folder: 'f0000006-0000-0000-0000-000000000006', tags: ['logistics', 'delivery'] },
  { title: 'Customer Statement #CS-2025-001', type: 'customer_statement', folder: 'f0000007-0000-0000-0000-000000000007', tags: ['customers', 'statement'] },
  { title: 'Stock Adjustment #SA-2025-001', type: 'stock_adjustment', folder: 'f0000008-0000-0000-0000-000000000008', tags: ['inventory', 'adjustment'] },
];

async function seed() {
  console.log('Seeding DocuStore folders...');
  
  for (const folder of FOLDERS) {
    await sql`
      INSERT INTO docustore.document_folders (id, org_id, name, slug, icon, color)
      VALUES (${folder.id}::uuid, ${ORG_ID}::uuid, ${folder.name}, ${folder.slug}, ${folder.icon}, ${folder.color})
      ON CONFLICT (org_id, slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color
    `;
    console.log(`  ✓ Folder: ${folder.name}`);
  }

  console.log('Seeding DocuStore documents...');
  
  for (const doc of DOCUMENTS) {
    await sql`
      INSERT INTO docustore.documents (org_id, title, document_type, status, folder_id, tags)
      VALUES (${ORG_ID}::uuid, ${doc.title}, ${doc.type}, 'active', ${doc.folder}::uuid, ${doc.tags})
    `;
    console.log(`  ✓ Document: ${doc.title}`);
  }

  console.log('Done!');
}

seed().catch(console.error);

