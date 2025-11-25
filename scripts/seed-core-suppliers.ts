import { randomUUID } from 'crypto';

import { withTransaction } from '../lib/database/unified-connection';

type SupplierSeed = {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  products: Array<{
    sku: string;
    name: string;
    price: number;
    stock: number;
    uom?: string;
    categoryId?: string | null;
  }>;
};

const suppliers: SupplierSeed[] = [
  {
    id: '00000000-0000-0000-0000-000000000111',
    name: 'Decksaver AV Distribution',
    code: 'DECKSAVER',
    contactEmail: 'inventory@decksaver.local',
    contactPhone: '+27110000001',
    currency: 'ZAR',
    products: [
      {
        sku: 'DS-AVM-001',
        name: 'Decksaver Modular Mixer Cover',
        price: 1299.99,
        stock: 25,
      },
      {
        sku: 'DS-LED-002',
        name: 'Decksaver LED Panel Protector',
        price: 899.5,
        stock: 40,
      },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000222',
    name: 'Pro Audio Imports',
    code: 'PROAUDIO',
    contactEmail: 'orders@proaudio.local',
    contactPhone: '+27110000002',
    currency: 'USD',
    products: [
      {
        sku: 'PA-SPKR-100',
        name: 'ProAudio Touring Speaker',
        price: 349.0,
        stock: 60,
      },
      {
        sku: 'PA-MIC-500',
        name: 'ProAudio Studio Microphone',
        price: 249.0,
        stock: 80,
      },
    ],
  },
];

async function seedSuppliers() {
  console.log('🌱 Seeding demo suppliers, products, and inventory (core schema)...');

  await withTransaction(async (client) => {
    for (const supplier of suppliers) {
      console.log(`→ Upserting supplier ${supplier.name}`);

      await client.query(
        `
          INSERT INTO core.supplier (
            supplier_id,
            name,
            code,
            active,
            default_currency,
            contact_email,
            contact_phone,
            payment_terms,
            contact_info,
            created_at,
            updated_at
          ) VALUES (
            $1,
            $2,
            $3,
            true,
            $4,
            $5,
            $6,
            'Net 30',
            jsonb_build_object(
              'status', 'active',
              'tier', 'preferred',
              'category', 'Electronics'
            ),
            NOW(),
            NOW()
          )
          ON CONFLICT (supplier_id) DO UPDATE
          SET
            name = EXCLUDED.name,
            code = EXCLUDED.code,
            default_currency = EXCLUDED.default_currency,
            contact_email = EXCLUDED.contact_email,
            contact_phone = EXCLUDED.contact_phone,
            updated_at = NOW()
        `,
        [
          supplier.id,
          supplier.name,
          supplier.code,
          supplier.currency,
          supplier.contactEmail,
          supplier.contactPhone,
        ]
      );

      for (const product of supplier.products) {
        const productIdResult = await client.query<{ supplier_product_id: string }>(
          `
            INSERT INTO core.supplier_product (
              supplier_product_id,
              supplier_id,
              supplier_sku,
              name_from_supplier,
              uom,
              category_id,
              is_active,
              first_seen_at,
              created_at,
              updated_at
            ) VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              true,
              NOW(),
              NOW(),
              NOW()
            )
            ON CONFLICT (supplier_id, supplier_sku) DO UPDATE
            SET
              name_from_supplier = EXCLUDED.name_from_supplier,
              updated_at = NOW()
            RETURNING supplier_product_id
          `,
          [
            randomUUID(),
            supplier.id,
            product.sku,
            product.name,
            product.uom ?? 'unit',
            product.categoryId ?? null,
          ]
        );

        const supplierProductId = productIdResult.rows[0].supplier_product_id;

        await client.query(
          `
            UPDATE core.price_history
            SET is_current = false, valid_to = NOW()
            WHERE supplier_product_id = $1 AND is_current = true
          `,
          [supplierProductId]
        );

        await client.query(
          `
            INSERT INTO core.price_history (
              supplier_product_id,
              price,
              currency,
              valid_from,
              is_current,
              created_at
            ) VALUES (
              $1,
              $2,
              $3,
              NOW(),
              true,
              NOW()
            )
          `,
          [supplierProductId, product.price, supplier.currency]
        );

        await client.query(
          `
            INSERT INTO core.stock_on_hand (
              soh_id,
              supplier_product_id,
              location_id,
              qty,
              unit_cost,
              as_of_ts,
              created_at
            ) VALUES (
              $1,
              $2,
              (
                SELECT location_id
                FROM core.stock_location
                WHERE supplier_id = $3 OR type = 'internal'
                ORDER BY (supplier_id = $3) DESC, created_at ASC
                LIMIT 1
              ),
              $4,
              $5,
              NOW(),
              NOW()
            )
            ON CONFLICT (supplier_product_id, location_id) DO UPDATE
            SET
              qty = EXCLUDED.qty,
              unit_cost = EXCLUDED.unit_cost,
              updated_at = NOW()
          `,
          [randomUUID(), supplierProductId, supplier.id, product.stock, product.price]
        );
      }
    }
  });

  console.log('✅ Core suppliers/products/stock seeded.');
}

if (require.main === module) {
  seedSuppliers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed to seed suppliers:', error);
      process.exit(1);
    });
}

export { seedSuppliers };

