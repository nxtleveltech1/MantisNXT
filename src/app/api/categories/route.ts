import { NextResponse } from 'next/server';
import { getSchemaMode, clearSchemaModeCache } from '@/lib/cmm/db';
import { getCategories } from '@/lib/cmm/db-sql';
import { normalizeCategoryLabel } from '@/lib/cmm/proposed-categories';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET() {
  try {
    // Clear schema mode cache to force fresh detection
    clearSchemaModeCache();
    const schemaMode = await getSchemaMode();

    if (schemaMode === 'none') {
      // Return mock categories for demo
      return NextResponse.json([
        { id: 'cat-001', name: 'Instruments', parentId: null, path: 'Instruments' },
        {
          id: 'cat-002',
          name: 'Electric Guitars',
          parentId: 'cat-001',
          path: 'Instruments>Electric Guitars',
        },
        {
          id: 'cat-003',
          name: 'Acoustic Guitars',
          parentId: 'cat-001',
          path: 'Instruments>Acoustic Guitars',
        },
        { id: 'cat-004', name: 'Drums', parentId: 'cat-001', path: 'Instruments>Drums' },
        { id: 'cat-005', name: 'Keyboards', parentId: 'cat-001', path: 'Instruments>Keyboards' },
      ]);
    }

    if (schemaMode === 'core') {
      const { rows } = await dbQuery<{
        category_id: string;
        name: string;
        parent_id: string | null;
        path: string;
        level: number;
        is_active: boolean;
        product_count: number | null;
        pending_review_count: number | null;
        has_children: boolean;
      }>(`
        WITH product_stats AS (
          SELECT
            sp.category_id,
            COUNT(*) AS product_count,
            COUNT(*) FILTER (WHERE sp.ai_categorization_status = 'pending_review') AS pending_review_count
          FROM core.supplier_product sp
          GROUP BY sp.category_id
        )
        SELECT
          c.category_id,
          c.name,
          c.parent_id,
          c.path,
          c.level,
          c.is_active,
          ps.product_count,
          ps.pending_review_count,
          EXISTS (
            SELECT 1
            FROM core.category child
            WHERE child.parent_id = c.category_id
          ) AS has_children
        FROM core.category c
        LEFT JOIN product_stats ps ON ps.category_id = c.category_id
        WHERE c.is_active = true
        ORDER BY c.path, c.name
      `);

      const categories = rows.map(row => ({
        id: row.category_id,
        name: row.name,
        parentId: row.parent_id,
        path: row.path,
        level: Number(row.level ?? 0),
        isActive: row.is_active,
        productCount: Number(row.product_count ?? 0),
        pendingReviewCount: Number(row.pending_review_count ?? 0),
        hasChildren: row.has_children,
      }));

      return NextResponse.json(categories);
    }

    // Legacy fallback
    const legacyCategories = await getCategories();
    return NextResponse.json(legacyCategories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const schemaMode = await getSchemaMode();
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const parentId =
      typeof body?.parentId === 'string' && body.parentId.length > 0 ? body.parentId : null;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      );
    }

    if (schemaMode === 'none') {
      return NextResponse.json(
        { success: false, message: 'Database schema not available' },
        { status: 503 }
      );
    }

    const slug = normalizeCategoryLabel(name);

    if (schemaMode === 'core') {
      let level = 1;
      let path = `/${slug}`;

      if (parentId) {
        const parentResult = await dbQuery<{ path: string; level: number }>(
          `
            SELECT path, level
            FROM core.category
            WHERE category_id = $1
          `,
          [parentId]
        );

        if (parentResult.rows.length === 0) {
          return NextResponse.json(
            { success: false, message: 'Parent category not found' },
            { status: 404 }
          );
        }

        const parent = parentResult.rows[0];
        level = Number(parent.level ?? 0) + 1;
        path = `${parent.path}/${slug}`;
      }

      const insertResult = await dbQuery<{
        category_id: string;
        name: string;
        parent_id: string | null;
        path: string;
        level: number;
        is_active: boolean;
      }>(
        `
          INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
          VALUES ($1, $2::uuid, $3, $4, true, NOW(), NOW())
          RETURNING category_id, name, parent_id, path, level, is_active
        `,
        [name, parentId, level, path]
      );

      const created = insertResult.rows[0];

      return NextResponse.json(
        {
          success: true,
          category: {
            id: created.category_id,
            name: created.name,
            parentId: created.parent_id,
            path: created.path,
            level: Number(created.level ?? 0),
            isActive: created.is_active,
          },
        },
        { status: 201 }
      );
    }

    // Legacy schema fallback
    let level = 0;
    let path = name;

    if (parentId) {
      const parentResult = await dbQuery<{ path: string; level: number }>(
        `
          SELECT path, level
          FROM categories
          WHERE id = $1
        `,
        [parentId]
      );

      if (parentResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Parent category not found' },
          { status: 404 }
        );
      }

      const parent = parentResult.rows[0];
      level = Number(parent.level ?? 0) + 1;
      path = `${parent.path}>${name}`;
    }

    const insertResult = await dbQuery<{
      id: string;
      name: string;
      parentId: string | null;
      path: string;
      level: number;
    }>(
      `
        INSERT INTO categories (name, parent_id, path, level)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, parent_id AS "parentId", path, level
      `,
      [name, parentId, path, level]
    );

    return NextResponse.json(
      {
        success: true,
        category: insertResult.rows[0],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'A category with this name already exists.' },
        { status: 409 }
      );
    }

    console.error('Category creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    );
  }
}
