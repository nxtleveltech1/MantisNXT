/**
 * Parse and validate Odoo extraction JSON (odoo_xero_config_*.json)
 */

import type {
  OdooExtractionPayload,
  OdooAccount,
  OdooJournal,
  OdooTax,
  OdooPaymentTerm,
  OdooPartner,
  OdooFiscalPosition,
} from './types';

export interface ParseResult {
  payload: OdooExtractionPayload;
  errors: string[];
  valid: boolean;
}

/**
 * Parse JSON string or object into Odoo extraction payload and run basic validation.
 */
export function parseOdooExtraction(input: string | OdooExtractionPayload): ParseResult {
  const errors: string[] = [];
  let payload: OdooExtractionPayload;

  if (typeof input === 'string') {
    try {
      payload = JSON.parse(input) as OdooExtractionPayload;
    } catch {
      return {
        payload: {},
        errors: ['Invalid JSON'],
        valid: false,
      };
    }
  } else {
    payload = input;
  }

  if (!payload || typeof payload !== 'object') {
    return { payload: {}, errors: ['Payload must be an object'], valid: false };
  }

  if (payload.accounts && !Array.isArray(payload.accounts)) {
    errors.push('accounts must be an array');
  }
  if (payload.accounts?.length) {
    const first = payload.accounts[0] as OdooAccount;
    if (!first.code || !first.name || !first.account_type) {
      errors.push('Each account must have code, name, account_type');
    }
  }

  if (payload.journals && !Array.isArray(payload.journals)) {
    errors.push('journals must be an array');
  }
  if (payload.journals?.length) {
    const first = payload.journals[0] as OdooJournal;
    if (!first.code || !first.name || !first.type) {
      errors.push('Each journal must have code, name, type');
    }
  }

  if (payload.taxes && !Array.isArray(payload.taxes)) {
    errors.push('taxes must be an array');
  }
  if (payload.taxes?.length) {
    const first = payload.taxes[0] as OdooTax;
    if (first.name === undefined || first.amount === undefined) {
      errors.push('Each tax must have name and amount');
    }
  }

  if (payload.payment_terms && !Array.isArray(payload.payment_terms)) {
    errors.push('payment_terms must be an array');
  }
  if (payload.payment_terms?.length) {
    const first = payload.payment_terms[0] as OdooPaymentTerm;
    if (!first.name) {
      errors.push('Each payment term must have name');
    }
  }

  if (payload.partners && !Array.isArray(payload.partners)) {
    errors.push('partners must be an array');
  }
  if (payload.partners?.length) {
    const first = payload.partners[0] as OdooPartner;
    if (!first.name) {
      errors.push('Each partner must have name');
    }
  }

  if (payload.fiscal_positions && !Array.isArray(payload.fiscal_positions)) {
    errors.push('fiscal_positions must be an array');
  }
  if (payload.fiscal_positions?.length) {
    const first = payload.fiscal_positions[0] as OdooFiscalPosition;
    if (!first.name) {
      errors.push('Each fiscal position must have name');
    }
  }

  return {
    payload,
    errors,
    valid: errors.length === 0,
  };
}
