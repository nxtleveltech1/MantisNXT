/**
 * Temporary endpoint to add metadata column to stock_location table
 * DELETE THIS FILE AFTER RUNNING THE MIGRATION
 */

import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/database/unified-connection';

export async function POST() {
  try {
    // Check if column exists
    const checkResult = await query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'stock_location'
          AND column_name = 'metadata'
      ) as exists
    `);

    const columnExists = checkResult.rows[0]?.exists;

    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: 'metadata column already exists',
        alreadyExists: true,
      });
    }

    // Add the column
    await query(`
      ALTER TABLE core.stock_location
      ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    `);

    // Verify
    const verifyResult = await query<{ column_name: string; data_type: string }>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_location'
        AND column_name = 'metadata';
    `);

    if (verifyResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'metadata column added successfully',
        column: verifyResult.rows[0],
      });
    } else {
      throw new Error('Column was not created');
    }
  } catch (error: any) {
    console.error('Failed to add metadata column:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
