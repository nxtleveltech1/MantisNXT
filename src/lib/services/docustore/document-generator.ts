// UPDATE: [2025-12-25] Created unified DocumentGenerator service for all platform document generation

/**
 * DocuStore Document Generator Service
 * 
 * Unified service for generating PDF documents across all platform modules.
 * Handles template rendering, PDF conversion, DocuStore storage, and entity linking.
 */

import { DocumentService } from './document-service';
import { StorageFactory, DatabaseStorage } from '@/lib/docustore/storage';
import { query } from '@/lib/database';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { v4 as uuidv4 } from 'uuid';
import type { Document, DocumentArtifact } from './types';
import { 
  DOCUMENT_TYPES, 
  DOCUMENT_TYPE_INFO, 
  type DocumentType,
  getDocumentTypeInfo 
} from './document-types';
import {
  generateBaseDocument,
  formatCurrency,
  formatDate,
  formatDateShort,
  getStatusClass,
  type BaseTemplateOptions,
} from './templates';

// ============================================================================
// Types
// ============================================================================

export interface GenerateDocumentInput {
  /** Organization ID */
  orgId: string;
  /** Document type from DOCUMENT_TYPES */
  documentType: DocumentType;
  /** Human-readable title for the document */
  title: string;
  /** Description of the document */
  description?: string;
  /** Document number (e.g., INV-001, QUO-001) */
  documentNumber?: string;
  /** HTML content for the document body */
  htmlContent: string;
  /** Tags for categorization */
  tags?: string[];
  /** Custom metadata to store with the document */
  metadata?: Record<string, unknown>;
  /** Entity links to create */
  entityLinks?: EntityLink[];
  /** User ID who generated the document */
  generatedBy?: string;
  /** Company information for header */
  companyInfo?: CompanyInfo;
}

export interface EntityLink {
  entityType: string;
  entityId: string;
  linkType?: 'primary' | 'related' | 'source';
}

export interface CompanyInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
}

export interface GenerateDocumentResult {
  documentId: string;
  artifactId: string;
  storagePath: string;
  document: Document;
  artifact: DocumentArtifact;
}

// ============================================================================
// Document Generator Service
// ============================================================================

export class DocumentGenerator {
  /**
   * Generate a document, store it in DocuStore, and create entity links
   */
  static async generate(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
    const typeInfo = getDocumentTypeInfo(input.documentType);
    
    // Build template options
    const templateOptions: BaseTemplateOptions = {
      title: typeInfo.label,
      documentNumber: input.documentNumber,
      showLogo: true,
      showFooter: true,
      companyName: input.companyInfo?.name,
      companyAddress: input.companyInfo?.address,
      companyPhone: input.companyInfo?.phone,
      companyEmail: input.companyInfo?.email,
      companyVat: input.companyInfo?.vatNumber,
    };
    
    // Generate complete HTML with base template
    const fullHtml = await generateBaseDocument(templateOptions, input.htmlContent);
    
    // Convert HTML to PDF
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    // Create document in DocuStore
    const document = await DocumentService.createDocument({
      org_id: input.orgId,
      title: input.title,
      description: input.description || `${typeInfo.label} document`,
      document_type: input.documentType,
      tags: [
        typeInfo.category.toLowerCase().replace(/\s+/g, '-'),
        input.documentType,
        ...(input.tags || []),
      ],
      metadata: {
        document_number: input.documentNumber,
        generated_at: new Date().toISOString(),
        ...input.metadata,
      },
      created_by: input.generatedBy,
    });
    
    // Store PDF as artifact
    const storage = StorageFactory.getDefault();
    const safeDocNumber = input.documentNumber?.replace(/[^a-zA-Z0-9-]/g, '_') || document.id;
    const filename = `${input.documentType}-${safeDocNumber}-${Date.now()}.pdf`;
    
    const storeResult = await storage.store(
      document.id,
      'artifact',
      filename,
      pdfBuffer,
      'application/pdf'
    );
    
    if (!storeResult.success || !storeResult.path) {
      throw new Error(`Failed to store PDF: ${storeResult.error || 'Unknown error'}`);
    }
    
    // Get file metadata
    const fileMetadata = await storage.getMetadata(storeResult.path);
    if (!fileMetadata) {
      throw new Error('Failed to retrieve PDF metadata');
    }
    
    // Create artifact record
    const artifactId = uuidv4();
    const storageProvider = (process.env.DOCUSTORE_STORAGE_PROVIDER as string) || 'database';
    const finalStoragePath = storageProvider === 'database'
      ? `db://artifact/${artifactId}`
      : storeResult.path;
    
    const artifactResult = await query<DocumentArtifact>(
      `INSERT INTO docustore.document_artifacts (
        id, document_id, artifact_type, storage_path, storage_provider,
        filename, mime_type, file_size, checksum_sha256, metadata, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        artifactId,
        document.id,
        `${input.documentType}_pdf`,
        finalStoragePath,
        storageProvider,
        filename,
        'application/pdf',
        fileMetadata.size,
        fileMetadata.checksum || null,
        JSON.stringify({
          generated_at: new Date().toISOString(),
          document_number: input.documentNumber,
          document_type: input.documentType,
        }),
        input.generatedBy || null,
      ]
    );
    
    const artifact = artifactResult.rows[0];
    
    // If using database storage, persist content
    if (storageProvider === 'database' && storage instanceof DatabaseStorage) {
      await (storage as DatabaseStorage).persistContent(artifactId, 'artifact', pdfBuffer);
    }
    
    // Create entity links
    if (input.entityLinks && input.entityLinks.length > 0) {
      for (const link of input.entityLinks) {
        await DocumentService.createLink({
          document_id: document.id,
          entity_type: link.entityType,
          entity_id: link.entityId,
          link_type: link.linkType || 'related',
          created_by: input.generatedBy,
        });
      }
    }
    
    // Log PDF generation event
    await query(
      `SELECT docustore.log_document_event($1, 'pdf_generated', $2, $3::jsonb)`,
      [
        document.id,
        input.generatedBy || null,
        JSON.stringify({
          artifact_id: artifactId,
          artifact_type: `${input.documentType}_pdf`,
          document_number: input.documentNumber,
        }),
      ]
    );
    
    return {
      documentId: document.id,
      artifactId,
      storagePath: finalStoragePath,
      document,
      artifact,
    };
  }
  
  /**
   * Generate a document and return PDF buffer without storing
   * Useful for preview or immediate download
   */
  static async generatePdfOnly(input: Omit<GenerateDocumentInput, 'orgId' | 'entityLinks'>): Promise<Buffer> {
    const typeInfo = getDocumentTypeInfo(input.documentType);
    
    const templateOptions: BaseTemplateOptions = {
      title: typeInfo.label,
      documentNumber: input.documentNumber,
      showLogo: true,
      showFooter: true,
      companyName: input.companyInfo?.name,
      companyAddress: input.companyInfo?.address,
      companyPhone: input.companyInfo?.phone,
      companyEmail: input.companyInfo?.email,
      companyVat: input.companyInfo?.vatNumber,
    };
    
    const fullHtml = await generateBaseDocument(templateOptions, input.htmlContent);
    return renderHtmlToPdfBuffer({ html: fullHtml });
  }
  
  /**
   * Get or generate a document for an entity
   * Returns existing document if found, otherwise generates new one
   */
  static async getOrGenerate(
    orgId: string,
    entityType: string,
    entityId: string,
    documentType: DocumentType,
    generateFn: () => Promise<GenerateDocumentInput>
  ): Promise<GenerateDocumentResult> {
    // Check for existing document
    const existingDoc = await this.findByEntity(orgId, entityType, entityId, documentType);
    
    if (existingDoc) {
      // Get artifact
      const artifactResult = await query<DocumentArtifact>(
        `SELECT * FROM docustore.document_artifacts 
         WHERE document_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [existingDoc.id]
      );
      
      if (artifactResult.rows.length > 0) {
        return {
          documentId: existingDoc.id,
          artifactId: artifactResult.rows[0].id,
          storagePath: artifactResult.rows[0].storage_path,
          document: existingDoc,
          artifact: artifactResult.rows[0],
        };
      }
    }
    
    // Generate new document
    const input = await generateFn();
    return this.generate(input);
  }
  
  /**
   * Find existing document by entity link
   */
  static async findByEntity(
    orgId: string,
    entityType: string,
    entityId: string,
    documentType?: DocumentType
  ): Promise<Document | null> {
    const conditions = [
      'd.org_id = $1',
      'd.deleted_at IS NULL',
      'd.status = $4',
      `EXISTS (
        SELECT 1 FROM docustore.document_links dl
        WHERE dl.document_id = d.id
        AND dl.entity_type = $2
        AND dl.entity_id = $3
      )`,
    ];
    const params: unknown[] = [orgId, entityType, entityId, 'active'];
    
    if (documentType) {
      conditions.push('d.document_type = $5');
      params.push(documentType);
    }
    
    const result = await query<Document>(
      `SELECT d.* FROM docustore.documents d
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.created_at DESC
       LIMIT 1`,
      params
    );
    
    return result.rows[0] || null;
  }
  
  /**
   * Regenerate a document with updated content
   */
  static async regenerate(
    documentId: string,
    input: Omit<GenerateDocumentInput, 'orgId' | 'entityLinks'>,
    orgId: string,
    userId?: string
  ): Promise<GenerateDocumentResult> {
    const typeInfo = getDocumentTypeInfo(input.documentType);
    
    // Get existing document
    const existingDoc = await DocumentService.getDocumentById(documentId);
    if (!existingDoc || existingDoc.org_id !== orgId) {
      throw new Error('Document not found');
    }
    
    // Generate new PDF
    const templateOptions: BaseTemplateOptions = {
      title: typeInfo.label,
      documentNumber: input.documentNumber,
      showLogo: true,
      showFooter: true,
      companyName: input.companyInfo?.name,
      companyAddress: input.companyInfo?.address,
      companyPhone: input.companyInfo?.phone,
      companyEmail: input.companyInfo?.email,
      companyVat: input.companyInfo?.vatNumber,
    };
    
    const fullHtml = await generateBaseDocument(templateOptions, input.htmlContent);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    // Store new artifact
    const storage = StorageFactory.getDefault();
    const safeDocNumber = input.documentNumber?.replace(/[^a-zA-Z0-9-]/g, '_') || documentId;
    const filename = `${input.documentType}-${safeDocNumber}-${Date.now()}.pdf`;
    
    const storeResult = await storage.store(
      documentId,
      'artifact',
      filename,
      pdfBuffer,
      'application/pdf'
    );
    
    if (!storeResult.success || !storeResult.path) {
      throw new Error(`Failed to store PDF: ${storeResult.error || 'Unknown error'}`);
    }
    
    const fileMetadata = await storage.getMetadata(storeResult.path);
    if (!fileMetadata) {
      throw new Error('Failed to retrieve PDF metadata');
    }
    
    const artifactId = uuidv4();
    const storageProvider = (process.env.DOCUSTORE_STORAGE_PROVIDER as string) || 'database';
    const finalStoragePath = storageProvider === 'database'
      ? `db://artifact/${artifactId}`
      : storeResult.path;
    
    const artifactResult = await query<DocumentArtifact>(
      `INSERT INTO docustore.document_artifacts (
        id, document_id, artifact_type, storage_path, storage_provider,
        filename, mime_type, file_size, checksum_sha256, metadata, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        artifactId,
        documentId,
        `${input.documentType}_pdf`,
        finalStoragePath,
        storageProvider,
        filename,
        'application/pdf',
        fileMetadata.size,
        fileMetadata.checksum || null,
        JSON.stringify({
          generated_at: new Date().toISOString(),
          document_number: input.documentNumber,
          document_type: input.documentType,
          regenerated: true,
        }),
        userId || null,
      ]
    );
    
    const artifact = artifactResult.rows[0];
    
    if (storageProvider === 'database' && storage instanceof DatabaseStorage) {
      await (storage as DatabaseStorage).persistContent(artifactId, 'artifact', pdfBuffer);
    }
    
    // Update document metadata
    await DocumentService.updateDocument(documentId, {
      metadata: {
        ...existingDoc.metadata,
        last_regenerated: new Date().toISOString(),
        document_number: input.documentNumber,
      },
      updated_by: userId,
    });
    
    // Log regeneration event
    await query(
      `SELECT docustore.log_document_event($1, 'pdf_regenerated', $2, $3::jsonb)`,
      [
        documentId,
        userId || null,
        JSON.stringify({
          artifact_id: artifactId,
          previous_artifact_count: (existingDoc.artifacts?.length || 0),
        }),
      ]
    );
    
    return {
      documentId,
      artifactId,
      storagePath: finalStoragePath,
      document: existingDoc,
      artifact,
    };
  }
}

// ============================================================================
// Re-export utilities for template building
// ============================================================================

export { 
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_INFO,
  formatCurrency,
  formatDate,
  formatDateShort,
  getStatusClass,
};

export type { DocumentType };

