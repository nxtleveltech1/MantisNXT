// UPDATE: [2025-12-25] Added fallback logic and retry mechanism for document number generation

/**
 * Document Numbering Service
 *
 * Handles auto-generation of year-prefixed document numbers
 * Format: PREFIX-YYYY-#### (e.g., QUO-2025-0001, SO-2025-0001)
 */

import { query } from '@/lib/database/unified-connection';

export class DocumentNumberingService {
  // Table name mapping for each prefix
  private static readonly TABLE_MAP: Record<string, string> = {
    QUO: 'quotations',
    SO: 'sales_orders',
    PFI: 'proforma_invoices',
    INV: 'invoices',
  };

  /**
   * Generate a document number with year prefix
   * @param orgId Organization ID
   * @param prefix Document prefix (QUO, SO, PFI, INV)
   * @returns Generated document number
   */
  static async generateDocumentNumber(
    orgId: string,
    prefix: 'QUO' | 'SO' | 'PFI' | 'INV'
  ): Promise<string> {
    try {
      // First, try the database function
      const result = await query<{ document_number: string }>(
        `SELECT generate_document_number($1, $2, $3) as document_number`,
        [orgId, prefix, `${prefix.toLowerCase()}_table`]
      );

      if (result.rows[0]?.document_number) {
        return result.rows[0].document_number;
      }

      // If database function returns null, use fallback
      console.warn(`Database function returned null for ${prefix}, using fallback`);
      return this.generateFallbackNumber(orgId, prefix);
    } catch (error) {
      console.error('Error generating document number via DB function:', error);
      
      // Check if it's a "function does not exist" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('function') ||
        errorMessage.includes('relation')
      ) {
        console.warn(`Database function not available for ${prefix}, using fallback`);
        return this.generateFallbackNumber(orgId, prefix);
      }
      
      // For other errors, still try fallback
      console.warn('Attempting fallback document number generation');
      try {
        return await this.generateFallbackNumber(orgId, prefix);
      } catch (fallbackError) {
        console.error('Fallback document number generation also failed:', fallbackError);
        // Last resort: generate a simple unique number
        return this.generateSimpleNumber(prefix);
      }
    }
  }

  /**
   * Fallback: Query the actual table to get the next sequence number
   */
  private static async generateFallbackNumber(
    orgId: string,
    prefix: 'QUO' | 'SO' | 'PFI' | 'INV'
  ): Promise<string> {
    const year = new Date().getFullYear().toString();
    const tableName = this.TABLE_MAP[prefix];
    
    if (!tableName) {
      throw new Error(`Unknown prefix: ${prefix}`);
    }

    try {
      // Try to get the max document number from the actual table
      const pattern = `${prefix}-${year}-%`;
      
      const result = await query<{ max_num: string | null }>(
        `SELECT MAX(CAST(SUBSTRING(document_number FROM '(\\d+)$') AS integer))::text as max_num
         FROM ${tableName}
         WHERE org_id = $1 
           AND document_number LIKE $2`,
        [orgId, pattern]
      );

      const currentMax = parseInt(result.rows[0]?.max_num || '0', 10);
      const nextNum = currentMax + 1;

      return `${prefix}-${year}-${nextNum.toString().padStart(4, '0')}`;
    } catch (tableError) {
      console.error(`Error querying ${tableName} table:`, tableError);
      
      // Table might not exist, generate a simple number
      return this.generateSimpleNumber(prefix);
    }
  }

  /**
   * Last resort: Generate a simple unique document number
   * Uses timestamp to ensure uniqueness
   */
  private static generateSimpleNumber(prefix: string): string {
    const year = new Date().getFullYear().toString();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    
    return `${prefix}-${year}-${timestamp}${random}`;
  }

  /**
   * Validate document number format
   */
  static isValidDocumentNumber(documentNumber: string): boolean {
    // Format: PREFIX-YYYY-XXXX or PREFIX-YYYY-XXXXXXXX
    const pattern = /^(QUO|SO|PFI|INV)-\d{4}-\w{4,}$/;
    return pattern.test(documentNumber);
  }

  /**
   * Extract prefix from document number
   */
  static extractPrefix(documentNumber: string): string | null {
    const match = documentNumber.match(/^(QUO|SO|PFI|INV)-/);
    return match ? match[1] : null;
  }

  /**
   * Extract year from document number
   */
  static extractYear(documentNumber: string): string | null {
    const match = documentNumber.match(/^(?:QUO|SO|PFI|INV)-(\d{4})-/);
    return match ? match[1] : null;
  }

  /**
   * Generate a reference number (separate from document number)
   * Format: REF-YYYY-XXXXXX
   */
  static generateReferenceNumber(): string {
    const year = new Date().getFullYear().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REF-${year}-${random}`;
  }
}
