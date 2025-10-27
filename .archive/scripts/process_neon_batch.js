const fs = require('fs');

const SUPPLIER_MAP = {
  '66666666-6666-6666-6666-666666666666': 8,  // Stage Audio Works
  '77777777-7777-7777-7777-777777777777': 9,  // Stage One Distribution
  'cd8fa19a-2749-47ed-b932-d6b28fe9e149': 1,  // BK Percussion
  '06de9fb9-252b-4273-97eb-00140f03af55': 2,  // BC Electronics
  '11111111-1111-1111-1111-111111111111': 3,  // Viva Afrika
  '1994eee7-5b44-43e6-95ce-70ea930a6cd2': 4,  // Active Music Distribution
  '22222222-2222-2222-2222-222222222222': 5,  // Audiolite
  '33333333-3333-3333-3333-333333333333': 6,  // Tuerk Multimedia
  '48328342-709d-42f0-82aa-85395022e8f7': 7,  // Legacy Brands
  '7d851f8b-99a7-4f55-a9b6-60ab0ff489bc': 10, // Pro Audio platinum
  '88888888-8888-8888-8888-888888888888': 11, // Yamaha Music South Africa
  '8f968e95-acc9-42f7-bad1-0507525dfa25': 12, // SonicInformed
  '99999999-9999-9999-9999-999999999999': 13, // AV Distribution
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1': 14, // Audiosure
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 15, // Sennheiser South Africa
  'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2': 16, // ApexPro Distribution
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': 17, // Planetworld
  'cccccccc-cccc-cccc-cccc-cccccccccccc': 18, // MD Distribution
  'dddddddd-dddd-dddd-dddd-dddddddddddd': 19, // Rockit Distribution
  'ecc30b28-10eb-4719-9bce-8d7267c7d37d': 20, // Music Power
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': 21, // Rolling Thunder
  'fc6cb400-493c-400d-a534-4f10dcf66f07': 22, // Alpha Technologies
  'ffffffff-ffff-ffff-ffff-ffffffffffff': 23  // Global Music
};

const batchFile = process.argv[2] || '/tmp/inventory_batch_1.txt';
const startId = parseInt(process.argv[3] || '100');

const data = fs.readFileSync(batchFile, 'utf8');
const lines = data.trim().split('\n');

const supplierProducts = [];
const products = [];
const stockRecords = [];

let currentId = startId;

for (const line of lines) {
  const [sku, name, supplierUuid, stockQty, unitPrice, uom] = line.split('|');

  const supplierId = SUPPLIER_MAP[supplierUuid];
  if (!supplierId) {
    console.error(`Unknown supplier: ${supplierUuid}`);
    continue;
  }

  const escapedName = name.replace(/'/g, "''");
  const escapedSku = sku.replace(/'/g, "''");
  const qty = parseInt(stockQty) || 0;
  const price = parseFloat(unitPrice) || 0;
  const value = qty * price;

  supplierProducts.push(`(${currentId}, ${supplierId}, '${escapedSku}', ${currentId}, '${escapedName}', '${uom}', NULL, NULL, NULL, NOW(), NOW(), true, false, NULL, NOW(), NOW())`);
  products.push(`(${currentId}, '${escapedName}', NULL, NULL, true, NOW(), NOW())`);
  stockRecords.push(`(1, ${currentId}, ${qty}, ${price > 0 ? price : 'NULL'}, ${value > 0 ? value : 'NULL'}, NOW(), 'migration')`);

  currentId++;
}

console.log(`Processing ${lines.length} items, IDs ${startId} to ${currentId-1}`);
console.log(`\n-- Insert supplier_product records`);
console.log(`INSERT INTO core.supplier_product (supplier_product_id, supplier_id, supplier_sku, product_id, name_from_supplier, uom, pack_size, barcode, brand_from_supplier, first_seen_at, last_seen_at, is_active, is_new, attrs_json, created_at, updated_at) VALUES`);
console.log(supplierProducts.join(',\n'));
console.log(`ON CONFLICT (supplier_product_id) DO NOTHING;`);

console.log(`\n-- Insert product records`);
console.log(`INSERT INTO core.product (product_id, name, brand_id, category_id, active, created_at, updated_at) VALUES`);
console.log(products.join(',\n'));
console.log(`ON CONFLICT (product_id) DO NOTHING;`);

console.log(`\n-- Insert stock_on_hand records`);
console.log(`INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty, unit_cost, total_value, as_of_ts, source) VALUES`);
console.log(stockRecords.join(',\n'));
console.log(`ON CONFLICT (location_id, supplier_product_id) DO UPDATE SET qty = EXCLUDED.qty, unit_cost = EXCLUDED.unit_cost, total_value = EXCLUDED.total_value;`);
