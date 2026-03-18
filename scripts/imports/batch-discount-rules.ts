#!/usr/bin/env bun
import data from './stage-one-parsed.json';
import { writeFileSync } from 'fs';

const BATCH = 50;
for (let i = 0; i < data.length; i += BATCH) {
  const batch = data.slice(i, i + BATCH).map((r: { sku: string; discount: number }) => ({
    sku: r.sku,
    discount: r.discount,
  }));
  writeFileSync(`discount-batch-${Math.floor(i / BATCH)}.json`, JSON.stringify(batch));
}
console.log('Batches:', Math.ceil(data.length / BATCH));
