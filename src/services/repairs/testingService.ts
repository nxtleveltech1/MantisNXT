/**
 * Testing Service
 * Handles quality control testing for repairs
 */

import { query } from '@/lib/database/unified-connection';
import type { RepairTest, CreateRepairTestInput, TestResult } from '@/types/repairs';

export async function getTestById(testId: string): Promise<RepairTest | null> {
  const result = await query<RepairTest>(
    `
      SELECT * FROM repairs.repair_tests
      WHERE test_id = $1
    `,
    [testId]
  );

  return result.rows[0] || null;
}

export async function getTestsByRepairOrder(
  repairOrderId: string
): Promise<RepairTest[]> {
  const result = await query<RepairTest>(
    `
      SELECT * FROM repairs.repair_tests
      WHERE repair_order_id = $1
      ORDER BY tested_at DESC
    `,
    [repairOrderId]
  );

  return result.rows;
}

export async function createRepairTest(
  input: CreateRepairTestInput,
  testedBy?: string
): Promise<RepairTest> {
  const result = await query<RepairTest>(
    `
      INSERT INTO repairs.repair_tests (
        repair_order_id, test_type, test_name, test_result, test_data, tested_by, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      input.repair_order_id,
      input.test_type || null,
      input.test_name,
      input.test_result || null,
      input.test_data ? JSON.stringify(input.test_data) : null,
      testedBy || null,
      input.notes || null,
    ]
  );

  return result.rows[0];
}

export async function updateTestResult(
  testId: string,
  testResult: TestResult,
  testData?: Record<string, unknown>,
  notes?: string
): Promise<RepairTest> {
  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  updateFields.push(`test_result = $${paramIndex++}`);
  params.push(testResult);

  if (testData !== undefined) {
    updateFields.push(`test_data = $${paramIndex++}`);
    params.push(JSON.stringify(testData));
  }

  if (notes !== undefined) {
    updateFields.push(`notes = $${paramIndex++}`);
    params.push(notes);
  }

  params.push(testId);

  const sql = `
    UPDATE repairs.repair_tests
    SET ${updateFields.join(', ')}
    WHERE test_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<RepairTest>(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Test not found');
  }

  return result.rows[0];
}

export async function getAllTestsPassed(repairOrderId: string): Promise<boolean> {
  const tests = await getTestsByRepairOrder(repairOrderId);

  if (tests.length === 0) {
    return false;
  }

  return tests.every((test) => test.test_result === 'pass');
}

