/**
 * Financial Reporting Service
 * Generates financial statements: Balance Sheet, Income Statement, Cash Flow, Trial Balance
 */

import { query } from '@/lib/database';
import { GLService } from './GLService';

export interface BalanceSheet {
  assets: {
    current_assets: Array<{ account_code: string; account_name: string; balance: number }>;
    fixed_assets: Array<{ account_code: string; account_name: string; balance: number }>;
    total_assets: number;
  };
  liabilities: {
    current_liabilities: Array<{ account_code: string; account_name: string; balance: number }>;
    long_term_liabilities: Array<{ account_code: string; account_name: string; balance: number }>;
    total_liabilities: number;
  };
  equity: Array<{ account_code: string; account_name: string; balance: number }>;
  total_equity: number;
  total_liabilities_and_equity: number;
}

export interface IncomeStatement {
  revenue: Array<{ account_code: string; account_name: string; amount: number }>;
  total_revenue: number;
  expenses: Array<{ account_code: string; account_name: string; amount: number }>;
  total_expenses: number;
  net_income: number;
}

export interface CashFlowStatement {
  operating_activities: Array<{ description: string; amount: number }>;
  investing_activities: Array<{ description: string; amount: number }>;
  financing_activities: Array<{ description: string; amount: number }>;
  net_cash_flow: number;
  opening_cash: number;
  closing_cash: number;
}

export class ReportService {
  /**
   * Generate Balance Sheet
   */
  static async generateBalanceSheet(
    orgId: string,
    asOfDate?: string,
    period?: string,
    fiscalYear?: number
  ): Promise<BalanceSheet> {
    try {
      const date = asOfDate || new Date().toISOString().split('T')[0];
      const p = period || date.substring(0, 7);
      const fy = fiscalYear || parseInt(date.substring(0, 4), 10);

      // Get account balances
      const balances = await GLService.getTrialBalance(orgId, p, fy);

      const assets: BalanceSheet['assets'] = {
        current_assets: [],
        fixed_assets: [],
        total_assets: 0,
      };

      const liabilities: BalanceSheet['liabilities'] = {
        current_liabilities: [],
        long_term_liabilities: [],
        total_liabilities: 0,
      };

      const equity: BalanceSheet['equity'] = [];

      // Categorize accounts
      for (const balance of balances) {
        const accountResult = await query<{ account_type: string; code: string }>(
          'SELECT account_type, code FROM account WHERE id = $1',
          [balance.account_id]
        );

        const account = accountResult.rows[0];
        if (!account) continue;

        const netBalance =
          balance.debit_balance > 0 ? balance.debit_balance : balance.credit_balance;

        if (account.account_type === 'asset') {
          if (account.code.startsWith('1') && parseInt(account.code.substring(0, 2), 10) < 15) {
            assets.current_assets.push({
              account_code: balance.account_code,
              account_name: balance.account_name,
              balance: netBalance,
            });
          } else {
            assets.fixed_assets.push({
              account_code: balance.account_code,
              account_name: balance.account_name,
              balance: netBalance,
            });
          }
        } else if (account.account_type === 'liability') {
          if (account.code.startsWith('2') && parseInt(account.code.substring(0, 2), 10) < 25) {
            liabilities.current_liabilities.push({
              account_code: balance.account_code,
              account_name: balance.account_name,
              balance: netBalance,
            });
          } else {
            liabilities.long_term_liabilities.push({
              account_code: balance.account_code,
              account_name: balance.account_name,
              balance: netBalance,
            });
          }
        } else if (account.account_type === 'equity') {
          equity.push({
            account_code: balance.account_code,
            account_name: balance.account_name,
            balance: netBalance,
          });
        }
      }

      assets.total_assets =
        assets.current_assets.reduce((sum, a) => sum + a.balance, 0) +
        assets.fixed_assets.reduce((sum, a) => sum + a.balance, 0);

      liabilities.total_liabilities =
        liabilities.current_liabilities.reduce((sum, l) => sum + l.balance, 0) +
        liabilities.long_term_liabilities.reduce((sum, l) => sum + l.balance, 0);

      const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

      return {
        assets,
        liabilities,
        equity,
        total_equity: totalEquity,
        total_liabilities_and_equity: liabilities.total_liabilities + totalEquity,
      };
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      throw error;
    }
  }

  /**
   * Generate Income Statement (P&L)
   */
  static async generateIncomeStatement(
    orgId: string,
    period?: string,
    fiscalYear?: number
  ): Promise<IncomeStatement> {
    try {
      const date = new Date();
      const p = period || date.toISOString().substring(0, 7);
      const fy = fiscalYear || date.getFullYear();

      const balances = await GLService.getTrialBalance(orgId, p, fy);

      const revenue: IncomeStatement['revenue'] = [];
      const expenses: IncomeStatement['expenses'] = [];

      for (const balance of balances) {
        const accountResult = await query<{ account_type: string }>(
          'SELECT account_type FROM account WHERE id = $1',
          [balance.account_id]
        );

        const account = accountResult.rows[0];
        if (!account) continue;

        const amount = balance.debit_balance > 0 ? balance.debit_balance : balance.credit_balance;

        if (account.account_type === 'revenue') {
          revenue.push({
            account_code: balance.account_code,
            account_name: balance.account_name,
            amount: Math.abs(amount),
          });
        } else if (account.account_type === 'expense') {
          expenses.push({
            account_code: balance.account_code,
            account_name: balance.account_name,
            amount: Math.abs(amount),
          });
        }
      }

      const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        revenue,
        total_revenue: totalRevenue,
        expenses,
        total_expenses: totalExpenses,
        net_income: totalRevenue - totalExpenses,
      };
    } catch (error) {
      console.error('Error generating income statement:', error);
      throw error;
    }
  }

  /**
   * Generate Cash Flow Statement
   */
  static async generateCashFlow(
    orgId: string,
    period?: string,
    fiscalYear?: number
  ): Promise<CashFlowStatement> {
    try {
      const date = new Date();
      const p = period || date.toISOString().substring(0, 7);
      const fy = fiscalYear || date.getFullYear();

      // Get journal entries for the period
      const entriesResult = await GLService.getJournalEntries(orgId, { period: p, fiscal_year: fy });

      const operating: CashFlowStatement['operating_activities'] = [];
      const investing: CashFlowStatement['investing_activities'] = [];
      const financing: CashFlowStatement['financing_activities'] = [];

      // Categorize transactions (simplified - in production, use account mapping)
      for (const entry of entriesResult.data) {
        if (entry.reference_type === 'sales_invoice' || entry.reference_type === 'ar_receipt') {
          operating.push({
            description: entry.description,
            amount: entry.total_debits,
          });
        } else if (entry.reference_type === 'ap_payment') {
          operating.push({
            description: entry.description,
            amount: -entry.total_credits,
          });
        }
      }

      const netOperating = operating.reduce((sum, o) => sum + o.amount, 0);
      const netInvesting = investing.reduce((sum, i) => sum + i.amount, 0);
      const netFinancing = financing.reduce((sum, f) => sum + f.amount, 0);

      // Get opening and closing cash balances
      const cashAccountResult = await query<{ id: string }>(
        `SELECT id FROM account
         WHERE org_id = $1 AND account_type = 'asset' AND code LIKE '1100%'
         LIMIT 1`,
        [orgId]
      );

      let openingCash = 0;
      let closingCash = 0;

      if (cashAccountResult.rows[0]) {
        const openingBalance = await GLService.getAccountBalance(
          cashAccountResult.rows[0].id,
          orgId,
          p,
          fy
        );
        openingCash = openingBalance?.opening_balance || 0;
        closingCash = openingCash + netOperating + netInvesting + netFinancing;
      }

      return {
        operating_activities: operating,
        investing_activities: investing,
        financing_activities: financing,
        net_cash_flow: netOperating + netInvesting + netFinancing,
        opening_cash: openingCash,
        closing_cash: closingCash,
      };
    } catch (error) {
      console.error('Error generating cash flow statement:', error);
      throw error;
    }
  }

  /**
   * Generate Trial Balance
   */
  static async generateTrialBalance(
    orgId: string,
    period?: string,
    fiscalYear?: number
  ): Promise<ReturnType<typeof GLService.getTrialBalance>> {
    try {
      return await GLService.getTrialBalance(orgId, period, fiscalYear);
    } catch (error) {
      console.error('Error generating trial balance:', error);
      throw error;
    }
  }

  /**
   * Generate custom report
   */
  static async generateCustomReport(
    orgId: string,
    templateId: string,
    parameters?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const templateResult = await query<{ report_type: string; template_config: Record<string, unknown> }>(
        'SELECT report_type, template_config FROM report_templates WHERE id = $1 AND org_id = $2',
        [templateId, orgId]
      );

      const template = templateResult.rows[0];
      if (!template) {
        throw new Error('Report template not found');
      }

      // Generate report based on type
      switch (template.report_type) {
        case 'balance_sheet':
          return await this.generateBalanceSheet(
            orgId,
            parameters?.as_of_date as string,
            parameters?.period as string,
            parameters?.fiscal_year as number
          );
        case 'income_statement':
          return await this.generateIncomeStatement(
            orgId,
            parameters?.period as string,
            parameters?.fiscal_year as number
          );
        case 'cash_flow':
          return await this.generateCashFlow(
            orgId,
            parameters?.period as string,
            parameters?.fiscal_year as number
          );
        case 'trial_balance':
          return await this.generateTrialBalance(
            orgId,
            parameters?.period as string,
            parameters?.fiscal_year as number
          );
        default:
          throw new Error(`Unsupported report type: ${template.report_type}`);
      }
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }
}

