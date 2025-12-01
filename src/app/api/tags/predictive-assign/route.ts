import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { getProducts, assignTag as assignLegacyTag, predictiveTags } from '@/lib/cmm/db-sql';
import { ensureCoreTagInfrastructure, predictiveAssignCoreTags } from '@/lib/cmm/tag-service-core';
import type { Product } from '@/lib/cmm/types';

export async function POST() {
  try {
    const schemaMode = await getSchemaMode();

    if (schemaMode === 'none') {
      return NextResponse.json(
        {
          success: false,
          message: 'Tag service unavailable (no schema detected).',
          assigned: 0,
        },
        { status: 503 }
      );
    }

    if (schemaMode === 'core') {
      await ensureCoreTagInfrastructure();
      await predictiveAssignCoreTags();
      return NextResponse.json({
        success: true,
        message: 'Predictive rules applied to supplier products.',
        assigned: 'auto',
      });
    }

    const products = await getProducts();
    let assigned = 0;

    for (const product of products) {
      const fullProduct: Product = {
        sku: product.sku,
        supplierId: 'unknown',
        categoryId: product.categoryId ?? undefined,
        description: product.description,
        brand: product.brand,
        seriesRange: product.seriesRange,
        price: undefined,
        stockType: 'stock',
        imageUrl: undefined,
        tags: product.tags ?? [],
        attributes: {},
        updatedAt: Date.now(),
      };

      const suggestedTags = predictiveTags(fullProduct);

      for (const tagId of suggestedTags) {
        if (!product.tags.includes(tagId)) {
          try {
            await assignLegacyTag(product.sku, tagId);
            assigned++;
          } catch (error) {
            console.error(`Failed to assign tag ${tagId} to ${product.sku}:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Predictively assigned ${assigned} tags`,
      assigned,
    });
  } catch (error) {
    console.error('Predictive assign error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign predictive tags',
        assigned: 0,
      },
      { status: 500 }
    );
  }
}
