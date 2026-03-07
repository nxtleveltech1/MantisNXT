import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeTextOrNull,
  resolveInventoryDescription,
  resolveInventoryName,
} from '@/lib/inventory/name-description-fallback';

describe('Inventory Name/Description Fallbacks', () => {
  it('normalizes empty and whitespace strings to null', () => {
    assert.equal(normalizeTextOrNull(undefined), null);
    assert.equal(normalizeTextOrNull(null), null);
    assert.equal(normalizeTextOrNull(''), null);
    assert.equal(normalizeTextOrNull('   '), null);
    assert.equal(normalizeTextOrNull('  Product  '), 'Product');
  });

  it('resolves inventory name from supplier name first, then SKU', () => {
    assert.equal(resolveInventoryName('  Mixer X  ', 'SKU-001'), 'Mixer X');
    assert.equal(resolveInventoryName('   ', 'SKU-001'), 'SKU-001');
    assert.equal(resolveInventoryName('', '  SKU-002  '), 'SKU-002');
  });

  it('returns empty name when both supplier name and SKU are empty', () => {
    assert.equal(resolveInventoryName('', ''), '');
    assert.equal(resolveInventoryName('   ', '   '), '');
  });

  it('resolves description from attrs description first, then supplier name', () => {
    assert.equal(
      resolveInventoryDescription('  Premium studio monitor  ', 'Fallback Name'),
      'Premium studio monitor'
    );
    assert.equal(resolveInventoryDescription('   ', '  Fallback Name  '), 'Fallback Name');
    assert.equal(resolveInventoryDescription('', '   '), null);
  });
});
