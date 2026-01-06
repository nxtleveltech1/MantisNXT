#!/usr/bin/env bun
import { query } from '../../src/lib/database/unified-connection';

async function check() {
  console.log('Checking Active Music Distribution configuration...\n');
  
  const result = await query<{
    supplier_id: string;
    name: string;
    plusportal_enabled: boolean;
    plusportal_username: string | null;
    plusportal_last_sync: Date | null;
    json_feed_url: string | null;
    json_feed_enabled: boolean;
  }>(
    `SELECT supplier_id, name, 
            COALESCE(plusportal_enabled, false) as plusportal_enabled, 
            plusportal_username, 
            plusportal_last_sync,
            json_feed_url,
            COALESCE(json_feed_enabled, false) as json_feed_enabled
     FROM core.supplier 
     WHERE name ILIKE '%active music%'`
  );
  
  if (result.rows.length === 0) {
    console.log('Active Music Distribution not found!');
    return;
  }
  
  console.log('Active Music Distribution config:');
  console.log(JSON.stringify(result.rows[0], null, 2));
  
  // Check what import method was used
  const sampleResult = await query<{ attrs_json: Record<string, unknown> }>(
    `SELECT attrs_json 
     FROM core.supplier_product 
     WHERE supplier_id = $1 AND attrs_json IS NOT NULL 
     LIMIT 5`,
    [result.rows[0].supplier_id]
  );
  
  console.log('\nSample attrs_json from products:');
  for (const row of sampleResult.rows) {
    console.log('Keys:', Object.keys(row.attrs_json || {}));
  }
  
  process.exit(0);
}

check().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

