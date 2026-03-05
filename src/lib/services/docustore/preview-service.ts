/**
 * Document Preview Service
 *
 * Generates document preview thumbnails from PDF artifacts using pdf-to-img (PDF.js).
 * Pure JavaScript—no native binaries. Works in serverless/Vercel.
 */

import { query } from '@/lib/database';
import { StorageFactory } from '@/lib/docustore/storage';
import type { DocumentArtifact } from './types';
import { pdf } from 'pdf-to-img';

export class PreviewService {
  /**
   * Generate preview image/thumbnail for a document
   */
  static async generatePreview(documentId: string): Promise<Buffer | null> {

    const artifactResult = await query<DocumentArtifact>(
      `SELECT * FROM docustore.document_artifacts 
       WHERE document_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [documentId]
    );

    if (artifactResult.rows.length === 0) {
      return null;
    }

    const artifact = artifactResult.rows[0];

    const config = {
      provider: (artifact.storage_provider || 'database') as 'filesystem' | 'database',
      basePath: process.env.DOCUSTORE_STORAGE_PATH || '/app/docustore',
    };
    const storageInstance = StorageFactory.create(config);

    const pdfBuffer = await storageInstance.retrieve(artifact.storage_path);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return null;
    }

    try {
      const document = await pdf(pdfBuffer, { scale: 2 });
      const pageBuffer = await document.getPage(1);
      if (!pageBuffer) return null;

      // pdf-to-img returns PNG buffer. JPEG would need sharp—PNG works everywhere
      return Buffer.isBuffer(pageBuffer) ? pageBuffer : Buffer.from(pageBuffer);
    } catch (error) {
      console.error('Preview generation failed:', error);
      return null;
    }
  }

  /**
   * Get preview URL (cached or generate on demand)
   */
  static async getPreviewUrl(documentId: string): Promise<string | null> {
    const buffer = await this.generatePreview(documentId);
    if (!buffer) return null;
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}
