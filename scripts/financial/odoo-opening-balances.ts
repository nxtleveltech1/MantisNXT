#!/usr/bin/env bun
/**
 * Odoo Opening Balances → Xero Journal Payload
 *
 * Reads a JSON file of account balances at cutover date (from Odoo trial balance
 * or account.move.line export) and outputs a Xero manual journal payload that can
 * be posted via API or used for manual entry.
 *
 * Usage:
 *   bun run scripts/financial/odoo-opening-balances.ts path/to/balances.json
 *   bun run scripts/financial/odoo-opening-balances.ts path/to/balances.json --output journal-payload.json
 *
 * Input JSON shape (one of):
 *   { "cutoverDate": "YYYY-MM-DD", "balances": [ { "accountCode": "101001", "debit": 0, "credit": 100 }, ... ] }
 *   or per-partner AR/AP: { "cutoverDate": "...", "balances": [ { "accountCode": "110010", "partnerRef": "CUST001", "debit": 500, "credit": 0 }, ... ] }
 */

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--output');
const outputPath = outIdx >= 0 ? args[outIdx + 1] : null;

interface BalanceLine {
  accountCode: string;
  debit: number;
  credit: number;
  partnerRef?: string;
  description?: string;
}

interface BalancesInput {
  cutoverDate: string;
  currency?: string;
  narration?: string;
  balances: BalanceLine[];
}

interface XeroJournalLine {
  LineAmount: number;
  AccountCode: string;
  Description?: string;
}

interface XeroManualJournalPayload {
  Date: string;
  Narration: string;
  JournalLines: XeroJournalLine[];
}

async function main() {
  if (!inputPath) {
    console.error('Usage: bun run scripts/financial/odoo-opening-balances.ts <balances.json> [--output out.json]');
    process.exit(1);
  }

  const fs = await import('node:fs');
  let raw: string;
  try {
    raw = fs.readFileSync(inputPath, 'utf-8');
  } catch (e) {
    console.error('Failed to read file:', inputPath, e);
    process.exit(1);
  }

  let data: BalancesInput;
  try {
    data = JSON.parse(raw) as BalancesInput;
  } catch (e) {
    console.error('Invalid JSON:', e);
    process.exit(1);
  }

  if (!data.cutoverDate || !Array.isArray(data.balances)) {
    console.error('Input must have cutoverDate and balances array');
    process.exit(1);
  }

  const journalLines: XeroJournalLine[] = [];
  for (const line of data.balances) {
    const net = (line.debit ?? 0) - (line.credit ?? 0);
    if (net === 0) continue;
    const desc = line.partnerRef
      ? `Opening balance ${data.cutoverDate}${line.description ? ` - ${line.description}` : ''} (${line.partnerRef})`
      : `Opening balance from Odoo ${data.cutoverDate}${line.description ? ` - ${line.description}` : ''}`;
    journalLines.push({
      LineAmount: net,
      AccountCode: line.accountCode,
      Description: desc,
    });
  }

  const payload: XeroManualJournalPayload = {
    Date: data.cutoverDate,
    Narration: data.narration ?? `Opening balances from Odoo as at ${data.cutoverDate}`,
    JournalLines: journalLines,
  };

  const out = JSON.stringify(payload, null, 2);

  if (outputPath) {
    try {
      fs.writeFileSync(outputPath, out, 'utf-8');
      console.log('Wrote', outputPath);
    } catch (e) {
      console.error('Failed to write:', outputPath, e);
      process.exit(1);
    }
  } else {
    console.log(out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
