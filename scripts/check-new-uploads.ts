#!/usr/bin/env bun
import { query } from '../src/lib/database/unified-connection';

const UPLOAD_IDS = [
  '9ad6e236-0b4f-45de-a097-654a56c26ad2', // June new
  'ecb46ac9-58a0-41d0-a406-626fa1abea95', // September new
];

async function main() {
  const uploadResult = await query(
    `
    SELECT upload_id, filename, status, row_count, errors_json
    FROM spp.pricelist_upload 
    WHERE upload_id = ANY($1)
    ORDER BY received_at
  `,
    [UPLOAD_IDS]
  );

  console.log('Uploads:', JSON.stringify(uploadResult.rows, null, 2));

  const rowsResult = await query(
    `
    SELECT upload_id, COUNT(*) as count
    FROM spp.pricelist_row 
    WHERE upload_id = ANY($1)
    GROUP BY upload_id
  `,
    [UPLOAD_IDS]
  );

  console.log('Rows:', JSON.stringify(rowsResult.rows, null, 2));

  process.exit(0);
}

main().catch(console.error);
