// UPDATE: [2025-12-25] Created customer statement PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../_helpers';
import { CustomerPDFService, type CustomerStatementData } from '@/lib/services/customers/customer-pdf-service';
import { query } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CustomerRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  account_number: string | null;
}

interface TransactionRow {
  transaction_date: string;
  transaction_type: string;
  reference: string;
  description: string;
  debit: number | null;
  credit: number | null;
  running_balance: number;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await context.params;
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;

    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get('start') || 
      new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10);
    const periodEnd = searchParams.get('end') || new Date().toISOString().slice(0, 10);

    // Fetch customer details
    const customerResult = await query<CustomerRow>(
      `SELECT id, name, company, email, phone, address, account_number
       FROM customers.customers 
       WHERE id = $1 AND org_id = $2`,
      [customerId, orgId]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0];

    // Fetch transactions for the period
    const transactionsResult = await query<TransactionRow>(
      `WITH transactions AS (
        SELECT 
          created_at as transaction_date,
          'Invoice' as transaction_type,
          document_number as reference,
          COALESCE(description, 'Sales Invoice') as description,
          total as debit,
          NULL as credit
        FROM sales.invoices
        WHERE customer_id = $1 AND org_id = $2 
          AND created_at BETWEEN $3 AND $4
          AND status NOT IN ('cancelled', 'draft')
        UNION ALL
        SELECT 
          payment_date as transaction_date,
          'Payment' as transaction_type,
          payment_reference as reference,
          'Payment received' as description,
          NULL as debit,
          amount as credit
        FROM financial.ar_payments
        WHERE customer_id = $1 AND org_id = $2 
          AND payment_date BETWEEN $3 AND $4
      )
      SELECT 
        transaction_date,
        transaction_type,
        reference,
        description,
        debit,
        credit,
        SUM(COALESCE(debit, 0) - COALESCE(credit, 0)) OVER (ORDER BY transaction_date) as running_balance
      FROM transactions
      ORDER BY transaction_date`,
      [customerId, orgId, periodStart, periodEnd]
    );

    // Calculate opening balance
    const openingBalanceResult = await query<{ balance: number }>(
      `SELECT COALESCE(
        (SELECT SUM(CASE WHEN type = 'debit' THEN amount ELSE -amount END)
         FROM (
           SELECT total as amount, 'debit' as type FROM sales.invoices 
           WHERE customer_id = $1 AND org_id = $2 AND created_at < $3 AND status NOT IN ('cancelled', 'draft')
           UNION ALL
           SELECT amount, 'credit' as type FROM financial.ar_payments 
           WHERE customer_id = $1 AND org_id = $2 AND payment_date < $3
         ) sub), 0) as balance`,
      [customerId, orgId, periodStart]
    );

    const openingBalance = openingBalanceResult.rows[0]?.balance || 0;
    const transactions = transactionsResult.rows;
    const closingBalance = transactions.length > 0 
      ? transactions[transactions.length - 1].running_balance 
      : openingBalance;

    const data: CustomerStatementData = {
      customerId,
      orgId,
      customer: {
        name: customer.name,
        company: customer.company || undefined,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined,
        accountNumber: customer.account_number || undefined,
      },
      periodStart,
      periodEnd,
      openingBalance,
      closingBalance,
      currency: 'ZAR',
      transactions: transactions.map(tx => ({
        date: tx.transaction_date,
        type: tx.transaction_type,
        reference: tx.reference,
        description: tx.description,
        debit: tx.debit || undefined,
        credit: tx.credit || undefined,
        balance: tx.running_balance,
      })),
    };

    const { pdfBuffer } = await CustomerPDFService.generateStatement(data, userId);
    const filename = `statement-${customer.account_number || customerId.slice(0, 8)}-${periodEnd}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating customer statement PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

