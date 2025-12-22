/**
 * Package Service
 * Handles equipment package management
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { EquipmentPackage, PackageItem } from '@/types/rentals';

export async function getPackageById(packageId: string): Promise<EquipmentPackage | null> {
  const result = await query<EquipmentPackage>(
    `
      SELECT * FROM rentals.equipment_packages
      WHERE package_id = $1
    `,
    [packageId]
  );

  return result.rows[0] || null;
}

export async function listPackages(activeOnly = true): Promise<EquipmentPackage[]> {
  let sql = 'SELECT * FROM rentals.equipment_packages';
  const params: unknown[] = [];

  if (activeOnly) {
    sql += ' WHERE is_active = true';
  }

  sql += ' ORDER BY name';

  const result = await query<EquipmentPackage>(sql, params);
  return result.rows;
}

export async function getPackageItems(packageId: string): Promise<PackageItem[]> {
  const result = await query<PackageItem>(
    `
      SELECT * FROM rentals.package_items
      WHERE package_id = $1
      ORDER BY sort_order, equipment_id
    `,
    [packageId]
  );

  return result.rows;
}

export async function createPackage(data: {
  name: string;
  description?: string;
  package_type?: string;
  rental_rate_daily?: number;
  rental_rate_weekly?: number;
  rental_rate_monthly?: number;
  items: Array<{
    equipment_id: string;
    quantity: number;
    is_required?: boolean;
  }>;
}): Promise<EquipmentPackage> {
  return await withTransaction(async (client) => {
    // Create package
    const packageResult = await client.query<EquipmentPackage>(
      `
        INSERT INTO rentals.equipment_packages (
          name, description, package_type, rental_rate_daily,
          rental_rate_weekly, rental_rate_monthly, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *
      `,
      [
        data.name,
        data.description || null,
        data.package_type || null,
        data.rental_rate_daily || null,
        data.rental_rate_weekly || null,
        data.rental_rate_monthly || null,
      ]
    );

    const packageData = packageResult.rows[0];

    // Add package items
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      await client.query(
        `
          INSERT INTO rentals.package_items (
            package_id, equipment_id, quantity, is_required, sort_order
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          packageData.package_id,
          item.equipment_id,
          item.quantity,
          item.is_required !== false,
          i,
        ]
      );
    }

    return packageData;
  });
}

export async function updatePackage(
  packageId: string,
  updates: Partial<{
    name: string;
    description: string;
    rental_rate_daily: number;
    rental_rate_weekly: number;
    rental_rate_monthly: number;
    is_active: boolean;
  }>
): Promise<EquipmentPackage> {
  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  if (updateFields.length === 0) {
    const packageData = await getPackageById(packageId);
    if (!packageData) {
      throw new Error('Package not found');
    }
    return packageData;
  }

  params.push(packageId);

  const sql = `
    UPDATE rentals.equipment_packages
    SET ${updateFields.join(', ')}
    WHERE package_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<EquipmentPackage>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Package not found');
  }

  return result.rows[0];
}

export async function deletePackage(packageId: string): Promise<void> {
  const result = await query(
    'DELETE FROM rentals.equipment_packages WHERE package_id = $1',
    [packageId]
  );

  if (result.rowCount === 0) {
    throw new Error('Package not found');
  }
}

