/**
 * Cash Management Service
 * Handles bank accounts, reconciliation, cash forecasts, and petty cash
 */

import { query } from '@/lib/database';

export interface BankAccount {
  id: string;
  org_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code?: string | null;
  branch_code?: string | null;
  account_type: 'checking' | 'savings' | 'money_market' | 'other';
  currency: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  is_reconciled: boolean;
  last_reconciled_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  org_id: string;
  bank_account_id: string;
  transaction_date: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest';
  amount: number;
  balance_after?: number | null;
  description?: string | null;
  reference_number?: string | null;
  check_number?: string | null;
  payee?: string | null;
  category?: string | null;
  is_reconciled: boolean;
  reconciled_at?: string | null;
  imported_from?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface BankReconciliation {
  id: string;
  org_id: string;
  bank_account_id: string;
  reconciliation_date: string;
  statement_balance: number;
  book_balance: number;
  reconciled_balance?: number | null;
  status: 'unreconciled' | 'reconciled' | 'pending_review' | 'disputed' | 'adjusted';
  notes?: string | null;
  reconciled_by?: string | null;
  reconciled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashForecast {
  id: string;
  org_id: string;
  forecast_date: string;
  bank_account_id?: string | null;
  opening_balance: number;
  projected_inflows: number;
  projected_outflows: number;
  projected_balance: number;
  confidence_level?: 'high' | 'medium' | 'low' | null;
  assumptions?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export class CashService {
  /**
   * Create bank account
   */
  static async createBankAccount(data: {
    org_id: string;
    account_name: string;
    account_number: string;
    bank_name: string;
    bank_code?: string;
    branch_code?: string;
    account_type: BankAccount['account_type'];
    currency?: string;
    opening_balance?: number;
    notes?: string;
  }): Promise<BankAccount> {
    try {
      const result = await query<BankAccount>(
        `INSERT INTO cash_bank_accounts (
          org_id, account_name, account_number, bank_name,
          bank_code, branch_code, account_type, currency,
          opening_balance, current_balance, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          data.org_id,
          data.account_name,
          data.account_number,
          data.bank_name,
          data.bank_code || null,
          data.branch_code || null,
          data.account_type,
          data.currency || 'ZAR',
          data.opening_balance || 0,
          data.opening_balance || 0,
          data.notes || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating bank account:', error);
      throw error;
    }
  }

  /**
   * Get bank accounts
   */
  static async getBankAccounts(orgId: string, isActive?: boolean): Promise<BankAccount[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];

      if (isActive !== undefined) {
        conditions.push('is_active = $2');
        params.push(isActive);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<BankAccount>(
        `SELECT * FROM cash_bank_accounts ${whereClause} ORDER BY account_name`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      throw error;
    }
  }

  /**
   * Reconcile bank account
   */
  static async reconcileBankAccount(data: {
    org_id: string;
    bank_account_id: string;
    reconciliation_date: string;
    statement_balance: number;
    notes?: string;
    reconciled_by?: string;
  }): Promise<BankReconciliation> {
    try {
      // Get book balance
      const bookBalanceResult = await query<{ balance: number }>(
        `SELECT current_balance as balance FROM cash_bank_accounts WHERE id = $1`,
        [data.bank_account_id]
      );
      const bookBalance = bookBalanceResult.rows[0]?.balance || 0;

      const result = await query<BankReconciliation>(
        `INSERT INTO cash_bank_reconciliation (
          org_id, bank_account_id, reconciliation_date,
          statement_balance, book_balance, notes, reconciled_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          data.org_id,
          data.bank_account_id,
          data.reconciliation_date,
          data.statement_balance,
          bookBalance,
          data.notes || null,
          data.reconciled_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating reconciliation:', error);
      throw error;
    }
  }

  /**
   * Match transactions in reconciliation
   */
  static async matchTransactions(
    reconciliationId: string,
    matches: Array<{
      bank_transaction_id?: string;
      journal_entry_id?: string;
      ar_receipt_id?: string;
      ap_payment_id?: string;
      amount: number;
    }>
  ): Promise<void> {
    try {
      for (const match of matches) {
        await query(
          `INSERT INTO cash_reconciliation_lines (
            reconciliation_id, bank_transaction_id, journal_entry_id,
            ar_receipt_id, ap_payment_id, amount, is_match
          ) VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [
            reconciliationId,
            match.bank_transaction_id || null,
            match.journal_entry_id || null,
            match.ar_receipt_id || null,
            match.ap_payment_id || null,
            match.amount,
          ]
        );

        // Mark bank transaction as reconciled if provided
        if (match.bank_transaction_id) {
          await query(
            `UPDATE cash_bank_transactions
             SET is_reconciled = true, reconciled_at = now()
             WHERE id = $1`,
            [match.bank_transaction_id]
          );
        }
      }

      // Update reconciliation status
      await query(
        `UPDATE cash_bank_reconciliation
         SET status = 'reconciled'::reconciliation_status,
             reconciled_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [reconciliationId]
      );
    } catch (error) {
      console.error('Error matching transactions:', error);
      throw error;
    }
  }

  /**
   * Import bank statement
   */
  static async importBankStatement(
    bankAccountId: string,
    transactions: Array<{
      transaction_date: string;
      transaction_type: BankTransaction['transaction_type'];
      amount: number;
      description?: string;
      reference_number?: string;
      check_number?: string;
      payee?: string;
    }>
  ): Promise<BankTransaction[]> {
    try {
      const imported: BankTransaction[] = [];

      for (const txn of transactions) {
        const result = await query<BankTransaction>(
          `INSERT INTO cash_bank_transactions (
            bank_account_id, transaction_date, transaction_type,
            amount, description, reference_number, check_number, payee,
            imported_from
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual_import')
          RETURNING *`,
          [
            bankAccountId,
            txn.transaction_date,
            txn.transaction_type,
            txn.amount,
            txn.description || null,
            txn.reference_number || null,
            txn.check_number || null,
            txn.payee || null,
          ]
        );

        imported.push(result.rows[0]);

        // Update bank account balance
        await query(
          `UPDATE cash_bank_accounts
           SET current_balance = current_balance + $1,
               updated_at = now()
           WHERE id = $2`,
          [
            txn.transaction_type === 'deposit' || txn.transaction_type === 'interest'
              ? txn.amount
              : -txn.amount,
            bankAccountId,
          ]
        );
      }

      return imported;
    } catch (error) {
      console.error('Error importing bank statement:', error);
      throw error;
    }
  }

  /**
   * Create cash forecast
   */
  static async createCashForecast(data: {
    org_id: string;
    forecast_date: string;
    bank_account_id?: string;
    opening_balance: number;
    projected_inflows: number;
    projected_outflows: number;
    confidence_level?: 'high' | 'medium' | 'low';
    assumptions?: string;
    created_by?: string;
  }): Promise<CashForecast> {
    try {
      const result = await query<CashForecast>(
        `INSERT INTO cash_forecasts (
          org_id, forecast_date, bank_account_id,
          opening_balance, projected_inflows, projected_outflows,
          confidence_level, assumptions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.org_id,
          data.forecast_date,
          data.bank_account_id || null,
          data.opening_balance,
          data.projected_inflows,
          data.projected_outflows,
          data.confidence_level || null,
          data.assumptions || null,
          data.created_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating cash forecast:', error);
      throw error;
    }
  }

  /**
   * Get cash forecasts
   */
  static async getCashForecasts(
    orgId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<CashForecast[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (dateFrom) {
        conditions.push(`forecast_date >= $${paramIndex}`);
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        conditions.push(`forecast_date <= $${paramIndex}`);
        params.push(dateTo);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<CashForecast>(
        `SELECT * FROM cash_forecasts ${whereClause} ORDER BY forecast_date`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching cash forecasts:', error);
      throw error;
    }
  }

  /**
   * Process petty cash transaction
   */
  static async processPettyCash(data: {
    petty_cash_id: string;
    transaction_date?: string;
    transaction_type: 'replenish' | 'expense' | 'transfer';
    amount: number;
    description: string;
    receipt_number?: string;
    category?: string;
    approved_by?: string;
    created_by: string;
  }): Promise<{ id: string }> {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO cash_petty_cash_transactions (
          petty_cash_id, transaction_date, transaction_type,
          amount, description, receipt_number, category,
          approved_by, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          data.petty_cash_id,
          data.transaction_date || new Date().toISOString().split('T')[0],
          data.transaction_type,
          data.amount,
          data.description,
          data.receipt_number || null,
          data.category || null,
          data.approved_by || null,
          data.created_by,
        ]
      );

      // Update petty cash balance
      const adjustment =
        data.transaction_type === 'replenish' ? data.amount : -data.amount;

      await query(
        `UPDATE cash_petty_cash
         SET current_balance = current_balance + $1,
             updated_at = now()
         WHERE id = $2`,
        [adjustment, data.petty_cash_id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error processing petty cash:', error);
      throw error;
    }
  }
}

