/**
 * General Ledger Service
 * Handles journal entries, account balances, period management, and GL operations
 */

import { query } from '@/lib/database';

export interface JournalEntry {
  id: string;
  org_id: string;
  entry_number: string;
  description: string;
  entry_date: string;
  reference_type?: string | null;
  reference_id?: string | null;
  total_debits: number;
  total_credits: number;
  is_posted: boolean;
  posted_at?: string | null;
  posted_by?: string | null;
  created_by: string;
  status?: 'draft' | 'posted' | 'reversed' | 'adjusted' | 'closed';
  period?: string | null;
  fiscal_year?: number | null;
  reversed_by?: string | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  created_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description?: string | null;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
  created_at: string;
}

export interface AccountBalance {
  id: string;
  org_id: string;
  account_id: string;
  period: string;
  fiscal_year: number;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  closing_balance: number;
  created_at: string;
  updated_at: string;
}

export interface GLPeriod {
  id: string;
  org_id: string;
  period: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
}

export interface GLFiscalYear {
  id: string;
  org_id: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
}

export interface RecurringEntry {
  id: string;
  org_id: string;
  template_name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  day_of_month?: number | null;
  is_active: boolean;
  next_run_date?: string | null;
  last_run_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class GLService {
  /**
   * Create journal entry
   */
  static async createJournalEntry(data: {
    org_id: string;
    entry_number?: string;
    description: string;
    entry_date?: string;
    reference_type?: string;
    reference_id?: string;
    lines: Array<{
      account_id: string;
      description?: string;
      debit_amount: number;
      credit_amount: number;
    }>;
    created_by: string;
  }): Promise<JournalEntry> {
    try {
      // Generate entry number if not provided
      let entryNumber = data.entry_number;
      if (!entryNumber) {
        const year = new Date().getFullYear();
        const result = await query<{ max_num: string | null }>(
          `SELECT MAX(CAST(substring(entry_number FROM '\\d+$') AS integer)) as max_num
           FROM journal_entry
           WHERE org_id = $1 AND entry_number LIKE $2`,
          [data.org_id, `JE-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        entryNumber = `JE-${year}-${nextNum.toString().padStart(6, '0')}`;
      }

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      for (const line of data.lines) {
        if (line.debit_amount > 0 && line.credit_amount > 0) {
          throw new Error('Line cannot have both debit and credit amounts');
        }
        if (line.debit_amount < 0 || line.credit_amount < 0) {
          throw new Error('Amounts cannot be negative');
        }
        totalDebits += line.debit_amount;
        totalCredits += line.credit_amount;
      }

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error('Journal entry must balance (debits must equal credits)');
      }

      const entryDate = data.entry_date || new Date().toISOString().split('T')[0];
      const period = entryDate.substring(0, 7); // YYYY-MM
      const fiscalYear = parseInt(entryDate.substring(0, 4), 10);

      // Insert journal entry
      const entryResult = await query<JournalEntry>(
        `INSERT INTO journal_entry (
          org_id, entry_number, description, entry_date,
          reference_type, reference_id, total_debits, total_credits,
          is_posted, created_by, period, fiscal_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.org_id,
          entryNumber,
          data.description,
          entryDate,
          data.reference_type || null,
          data.reference_id || null,
          totalDebits,
          totalCredits,
          false,
          data.created_by,
          period,
          fiscalYear,
        ]
      );

      const entry = entryResult.rows[0];

      // Insert lines
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        await query(
          `INSERT INTO journal_entry_line (
            journal_entry_id, account_id, description,
            debit_amount, credit_amount, line_number
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            entry.id,
            line.account_id,
            line.description || null,
            line.debit_amount,
            line.credit_amount,
            i + 1,
          ]
        );
      }

      return entry;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      throw error;
    }
  }

  /**
   * Get journal entries
   */
  static async getJournalEntries(
    orgId: string,
    filters?: {
      period?: string;
      fiscal_year?: number;
      is_posted?: boolean;
      reference_type?: string;
      date_from?: string;
      date_to?: string;
    },
    limit = 50,
    offset = 0
  ): Promise<{ data: JournalEntry[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.period) {
        conditions.push(`period = $${paramIndex}`);
        params.push(filters.period);
        paramIndex++;
      }

      if (filters?.fiscal_year) {
        conditions.push(`fiscal_year = $${paramIndex}`);
        params.push(filters.fiscal_year);
        paramIndex++;
      }

      if (filters?.is_posted !== undefined) {
        conditions.push(`is_posted = $${paramIndex}`);
        params.push(filters.is_posted);
        paramIndex++;
      }

      if (filters?.reference_type) {
        conditions.push(`reference_type = $${paramIndex}`);
        params.push(filters.reference_type);
        paramIndex++;
      }

      if (filters?.date_from) {
        conditions.push(`entry_date >= $${paramIndex}`);
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters?.date_to) {
        conditions.push(`entry_date <= $${paramIndex}`);
        params.push(filters.date_to);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM journal_entry ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get entries
      params.push(limit, offset);
      const result = await query<JournalEntry>(
        `SELECT * FROM journal_entry
         ${whereClause}
         ORDER BY entry_date DESC, created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      throw error;
    }
  }

  /**
   * Get journal entry by ID
   */
  static async getJournalEntryById(id: string, orgId: string): Promise<JournalEntry | null> {
    try {
      const result = await query<JournalEntry>(
        'SELECT * FROM journal_entry WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      throw error;
    }
  }

  /**
   * Get journal entry lines
   */
  static async getJournalEntryLines(entryId: string): Promise<JournalEntryLine[]> {
    try {
      const result = await query<JournalEntryLine>(
        'SELECT * FROM journal_entry_line WHERE journal_entry_id = $1 ORDER BY line_number',
        [entryId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching journal entry lines:', error);
      throw error;
    }
  }

  /**
   * Post journal entry
   */
  static async postJournalEntry(
    entryId: string,
    orgId: string,
    postedBy: string
  ): Promise<JournalEntry> {
    try {
      // Verify entry balances
      const entry = await this.getJournalEntryById(entryId, orgId);
      if (!entry) {
        throw new Error('Journal entry not found');
      }

      if (Math.abs(entry.total_debits - entry.total_credits) > 0.01) {
        throw new Error('Journal entry does not balance');
      }

      // Post entry
      await query(
        `UPDATE journal_entry
         SET is_posted = true,
             posted_at = now(),
             posted_by = $1,
             status = 'posted'::journal_entry_status,
             updated_at = now()
         WHERE id = $2 AND org_id = $3`,
        [postedBy, entryId, orgId]
      );

      // Update account balances
      const lines = await this.getJournalEntryLines(entryId);
      const period = entry.period || new Date().toISOString().substring(0, 7);
      const fiscalYear = entry.fiscal_year || new Date().getFullYear();

      for (const line of lines) {
        // Update or insert account balance
        await query(
          `INSERT INTO gl_account_balances (
            org_id, account_id, period, fiscal_year,
            debit_total, credit_total
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (org_id, account_id, period, fiscal_year)
          DO UPDATE SET
            debit_total = gl_account_balances.debit_total + $5,
            credit_total = gl_account_balances.credit_total + $6,
            closing_balance = CASE
              WHEN (SELECT normal_balance FROM account WHERE id = $2) = 'debit' THEN
                opening_balance + gl_account_balances.debit_total + $5 - gl_account_balances.credit_total - $6
              ELSE
                opening_balance - gl_account_balances.debit_total - $5 + gl_account_balances.credit_total + $6
            END,
            updated_at = now()`,
          [
            orgId,
            line.account_id,
            period,
            fiscalYear,
            line.debit_amount,
            line.credit_amount,
          ]
        );
      }

      const result = await query<JournalEntry>(
        'SELECT * FROM journal_entry WHERE id = $1',
        [entryId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error posting journal entry:', error);
      throw error;
    }
  }

  /**
   * Reverse journal entry
   */
  static async reverseJournalEntry(
    entryId: string,
    orgId: string,
    reversedBy: string,
    reason?: string
  ): Promise<JournalEntry> {
    try {
      const originalEntry = await this.getJournalEntryById(entryId, orgId);
      if (!originalEntry) {
        throw new Error('Journal entry not found');
      }

      if (!originalEntry.is_posted) {
        throw new Error('Can only reverse posted entries');
      }

      // Create reversal entry
      const lines = await this.getJournalEntryLines(entryId);
      const reversalLines = lines.map(line => ({
        account_id: line.account_id,
        description: `Reversal: ${line.description || ''}`,
        debit_amount: line.credit_amount, // Swap debits and credits
        credit_amount: line.debit_amount,
      }));

      const reversalEntry = await this.createJournalEntry({
        org_id: orgId,
        description: `Reversal of ${originalEntry.entry_number}: ${originalEntry.description}`,
        entry_date: new Date().toISOString().split('T')[0],
        reference_type: 'reversal',
        reference_id: entryId,
        lines: reversalLines,
        created_by: reversedBy,
      });

      // Post reversal entry
      await this.postJournalEntry(reversalEntry.id, orgId, reversedBy);

      // Update original entry
      await query(
        `UPDATE journal_entry
         SET status = 'reversed'::journal_entry_status,
             reversed_by = $1,
             reversed_at = now(),
             reversal_reason = $2,
             updated_at = now()
         WHERE id = $3`,
        [reversedBy, reason || null, entryId]
      );

      const result = await query<JournalEntry>(
        'SELECT * FROM journal_entry WHERE id = $1',
        [entryId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error reversing journal entry:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  static async getAccountBalance(
    accountId: string,
    orgId: string,
    period?: string,
    fiscalYear?: number
  ): Promise<AccountBalance | null> {
    try {
      const p = period || new Date().toISOString().substring(0, 7);
      const fy = fiscalYear || new Date().getFullYear();

      const result = await query<AccountBalance>(
        `SELECT * FROM gl_account_balances
         WHERE account_id = $1 AND org_id = $2 AND period = $3 AND fiscal_year = $4`,
        [accountId, orgId, p, fy]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw error;
    }
  }

  /**
   * Get trial balance
   */
  static async getTrialBalance(
    orgId: string,
    period?: string,
    fiscalYear?: number
  ): Promise<Array<{
    account_id: string;
    account_code: string;
    account_name: string;
    debit_balance: number;
    credit_balance: number;
  }>> {
    try {
      const p = period || new Date().toISOString().substring(0, 7);
      const fy = fiscalYear || new Date().getFullYear();

      const result = await query<{
        account_id: string;
        account_code: string;
        account_name: string;
        debit_balance: string;
        credit_balance: string;
      }>(
        `SELECT
          a.id as account_id,
          a.code as account_code,
          a.name as account_name,
          COALESCE(SUM(CASE WHEN a.normal_balance = 'debit' THEN gab.debit_total - gab.credit_total ELSE 0 END), 0) as debit_balance,
          COALESCE(SUM(CASE WHEN a.normal_balance = 'credit' THEN gab.credit_total - gab.debit_total ELSE 0 END), 0) as credit_balance
        FROM account a
        LEFT JOIN gl_account_balances gab ON gab.account_id = a.id
          AND gab.org_id = $1
          AND gab.period = $2
          AND gab.fiscal_year = $3
        WHERE a.org_id = $1 AND a.is_active = true
        GROUP BY a.id, a.code, a.name, a.normal_balance
        HAVING COALESCE(SUM(gab.debit_total), 0) > 0 OR COALESCE(SUM(gab.credit_total), 0) > 0
        ORDER BY a.code`,
        [orgId, p, fy]
      );

      return result.rows.map(row => ({
        account_id: row.account_id,
        account_code: row.account_code,
        account_name: row.account_name,
        debit_balance: parseFloat(row.debit_balance),
        credit_balance: parseFloat(row.credit_balance),
      }));
    } catch (error) {
      console.error('Error generating trial balance:', error);
      throw error;
    }
  }

  /**
   * Close period
   */
  static async closePeriod(
    periodId: string,
    orgId: string,
    closedBy: string
  ): Promise<GLPeriod> {
    try {
      // Verify all entries are posted
      const period = await query<GLPeriod>(
        'SELECT * FROM gl_periods WHERE id = $1 AND org_id = $2',
        [periodId, orgId]
      );

      if (!period.rows[0]) {
        throw new Error('Period not found');
      }

      const unpostedCount = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM journal_entry
         WHERE org_id = $1 AND period = $2 AND is_posted = false`,
        [orgId, period.rows[0].period]
      );

      if (parseInt(unpostedCount.rows[0]?.count || '0', 10) > 0) {
        throw new Error('Cannot close period with unposted entries');
      }

      // Close period
      await query(
        `UPDATE gl_periods
         SET is_closed = true,
             closed_at = now(),
             closed_by = $1
         WHERE id = $2`,
        [closedBy, periodId]
      );

      const result = await query<GLPeriod>(
        'SELECT * FROM gl_periods WHERE id = $1',
        [periodId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error closing period:', error);
      throw error;
    }
  }

  /**
   * Create recurring entry template
   */
  static async createRecurringEntry(data: {
    org_id: string;
    template_name: string;
    description: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    day_of_month?: number;
    lines: Array<{
      account_id: string;
      description?: string;
      debit_amount: number;
      credit_amount: number;
    }>;
    created_by: string;
  }): Promise<RecurringEntry> {
    try {
      // Create recurring entry
      const entryResult = await query<RecurringEntry>(
        `INSERT INTO gl_recurring_entries (
          org_id, template_name, description, frequency,
          day_of_month, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.org_id,
          data.template_name,
          data.description,
          data.frequency,
          data.day_of_month || null,
          data.created_by,
        ]
      );

      const entry = entryResult.rows[0];

      // Insert lines
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        await query(
          `INSERT INTO gl_recurring_entry_lines (
            recurring_entry_id, account_id, description,
            debit_amount, credit_amount, line_number
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            entry.id,
            line.account_id,
            line.description || null,
            line.debit_amount,
            line.credit_amount,
            i + 1,
          ]
        );
      }

      return entry;
    } catch (error) {
      console.error('Error creating recurring entry:', error);
      throw error;
    }
  }

  /**
   * Get periods
   */
  static async getPeriods(
    orgId: string,
    fiscalYear?: number
  ): Promise<GLPeriod[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];

      if (fiscalYear) {
        conditions.push('fiscal_year = $2');
        params.push(fiscalYear);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<GLPeriod>(
        `SELECT * FROM gl_periods ${whereClause} ORDER BY period`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching periods:', error);
      throw error;
    }
  }

  /**
   * Get fiscal years
   */
  static async getFiscalYears(orgId: string): Promise<GLFiscalYear[]> {
    try {
      const result = await query<GLFiscalYear>(
        'SELECT * FROM gl_fiscal_years WHERE org_id = $1 ORDER BY fiscal_year DESC',
        [orgId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
      throw error;
    }
  }
}

