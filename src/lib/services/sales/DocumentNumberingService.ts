/**
 * Document Numbering Service
 *
 * Handles auto-generation of year-prefixed document numbers
 * Format: PREFIX-YYYY-#### (e.g., QUO-2025-0001, SO-2025-0001)
 */

import { query } from '@/lib/database/unified-connection';

export class DocumentNumberingService {
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
      const result = await query<{ document_number: string }>(
        `SELECT generate_document_number($1, $2, $3) as document_number`,
        [orgId, prefix, `${prefix.toLowerCase()}_table`]
      );

      if (!result.rows[0]?.document_number) {
        throw new Error(`Failed to generate document number for prefix ${prefix}`);
      }

      return result.rows[0].document_number;
    } catch (error) {
      console.error('Error generating document number:', error);
      throw error;
    }
  }
}

