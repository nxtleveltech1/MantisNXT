/**
 * DocuStore PDF Generation Service
 * 
 * Generates PDF artifacts for documents (DocuStoreRecord, AuditPack)
 */

import { query } from '@/lib/database';
import { StorageFactory } from '@/lib/docustore/storage';
import type { DocumentWithRelations, DocumentArtifact } from './types';
import { v4 as uuidv4 } from 'uuid';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';

export class PDFService {
  /**
   * Generate DocuStoreRecord PDF for a document
   * This creates a comprehensive PDF record of the document with metadata, versions, links, and history
   */
  static async generateDocuStoreRecord(documentId: string, generatedBy?: string): Promise<DocumentArtifact> {
    // Get document with all relations
    const docResult = await query<DocumentWithRelations>(
      `SELECT 
        d.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', dv.id,
          'version_number', dv.version_number,
          'original_filename', dv.original_filename,
          'file_size', dv.file_size,
          'mime_type', dv.mime_type,
          'created_at', dv.created_at
        )) FILTER (WHERE dv.id IS NOT NULL) as versions,
        json_agg(DISTINCT jsonb_build_object(
          'id', dl.id,
          'entity_type', dl.entity_type,
          'entity_id', dl.entity_id,
          'link_type', dl.link_type,
          'created_at', dl.created_at
        )) FILTER (WHERE dl.id IS NOT NULL) as links,
        json_agg(DISTINCT jsonb_build_object(
          'id', de.id,
          'event_type', de.event_type,
          'created_at', de.created_at,
          'user_id', de.user_id
        )) FILTER (WHERE de.id IS NOT NULL) ORDER BY de.created_at DESC LIMIT 50 as events
      FROM docustore.documents d
      LEFT JOIN docustore.document_versions dv ON dv.document_id = d.id
      LEFT JOIN docustore.document_links dl ON dl.document_id = d.id
      LEFT JOIN docustore.document_events de ON de.document_id = d.id
      WHERE d.id = $1
      GROUP BY d.id`,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      throw new Error('Document not found');
    }

    const document = docResult.rows[0];

    // Generate a real PDF from HTML via Puppeteer.
    const html = this.generatePDFContent(document);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    // Store PDF artifact
    const storage = StorageFactory.getDefault();
    const filename = `docustore-record-${documentId}-${Date.now()}.pdf`;
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

    // Get file metadata
    const fileMetadata = await storage.getMetadata(storeResult.path);
    if (!fileMetadata) {
      throw new Error('Failed to retrieve PDF metadata');
    }

    // Create artifact record
    const artifactId = uuidv4();
    const artifactResult = await query<DocumentArtifact>(
      `INSERT INTO docustore.document_artifacts (
        id, document_id, artifact_type, storage_path, storage_provider,
        filename, mime_type, file_size, checksum_sha256, metadata, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        artifactId,
        documentId,
        'docustore_record',
        storeResult.path,
        'filesystem',
        filename,
        'application/pdf',
        fileMetadata.size,
        fileMetadata.checksum || null,
        JSON.stringify({
          generated_at: new Date().toISOString(),
          document_version_count: document.versions?.length || 0,
          link_count: document.links?.length || 0,
          event_count: document.events?.length || 0,
        }),
        generatedBy || null,
      ]
    );

    const artifact = artifactResult.rows[0];

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'pdf_generated', $2, $3::jsonb)`,
      [
        documentId,
        generatedBy || null,
        JSON.stringify({ artifact_id: artifactId, artifact_type: 'docustore_record' }),
      ]
    );

    return artifact;
  }

  /**
   * Generate AuditPack PDF for an entity
   * This creates a comprehensive audit pack PDF containing all linked documents for an entity
   */
  static async generateAuditPack(
    entityType: string,
    entityId: string,
    orgId: string,
    generatedBy?: string
  ): Promise<DocumentArtifact> {
    // Get all documents linked to this entity
    const docsResult = await query<DocumentWithRelations>(
      `SELECT DISTINCT d.*
      FROM docustore.documents d
      INNER JOIN docustore.document_links dl ON dl.document_id = d.id
      WHERE dl.entity_type = $1
        AND dl.entity_id = $2
        AND d.org_id = $3
        AND d.deleted_at IS NULL
        AND d.status = 'active'
      ORDER BY d.created_at DESC`,
      [entityType, entityId, orgId]
    );

    const documents = docsResult.rows;

    // Generate a real PDF from HTML via Puppeteer.
    const html = this.generateAuditPackPDFContent(entityType, entityId, documents);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    // Store PDF artifact (use a temporary document ID for storage organization)
    const tempDocId = uuidv4();
    const storage = StorageFactory.getDefault();
    const filename = `audit-pack-${entityType}-${entityId}-${Date.now()}.pdf`;
    const storeResult = await storage.store(
      tempDocId,
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

    // Create artifact record (link to first document if available, or create a placeholder)
    const artifactId = uuidv4();
    const documentId = documents.length > 0 ? documents[0].id : tempDocId;

    const artifactResult = await query<DocumentArtifact>(
      `INSERT INTO docustore.document_artifacts (
        id, document_id, artifact_type, storage_path, storage_provider,
        filename, mime_type, file_size, checksum_sha256, metadata, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        artifactId,
        documentId,
        'audit_pack',
        storeResult.path,
        'filesystem',
        filename,
        'application/pdf',
        fileMetadata.size,
        fileMetadata.checksum || null,
        JSON.stringify({
          generated_at: new Date().toISOString(),
          entity_type: entityType,
          entity_id: entityId,
          document_count: documents.length,
        }),
        generatedBy || null,
      ]
    );

    return artifactResult.rows[0];
  }

  /**
   * Generate PDF content as HTML (simplified - in production use proper PDF library)
   * This is a placeholder that generates HTML which can be converted to PDF using puppeteer
   */
  private static generatePDFContent(document: DocumentWithRelations): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DocuStore Record: ${document.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #007bff; color: white; }
    .tag { display: inline-block; background: #e9ecef; padding: 4px 8px; border-radius: 4px; margin: 2px; }
  </style>
</head>
<body>
  <h1>DocuStore Record</h1>
  
  <div class="metadata">
    <h2>Document Information</h2>
    <p><strong>Title:</strong> ${document.title}</p>
    ${document.description ? `<p><strong>Description:</strong> ${document.description}</p>` : ''}
    ${document.document_type ? `<p><strong>Type:</strong> ${document.document_type}</p>` : ''}
    <p><strong>Status:</strong> ${document.status}</p>
    <p><strong>Created:</strong> ${new Date(document.created_at).toLocaleString()}</p>
    <p><strong>Updated:</strong> ${new Date(document.updated_at).toLocaleString()}</p>
    ${document.tags && document.tags.length > 0 ? `<p><strong>Tags:</strong> ${document.tags.map(t => `<span class="tag">${t}</span>`).join('')}</p>` : ''}
  </div>

  ${document.versions && document.versions.length > 0 ? `
  <div class="section">
    <h2>Versions (${document.versions.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Filename</th>
          <th>Size</th>
          <th>Uploaded</th>
        </tr>
      </thead>
      <tbody>
        ${document.versions.map((v: any) => `
        <tr>
          <td>v${v.version_number}</td>
          <td>${v.original_filename}</td>
          <td>${(v.file_size / 1024 / 1024).toFixed(2)} MB</td>
          <td>${new Date(v.created_at).toLocaleString()}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${document.links && document.links.length > 0 ? `
  <div class="section">
    <h2>Entity Links (${document.links.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Entity Type</th>
          <th>Entity ID</th>
          <th>Link Type</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${document.links.map((l: any) => `
        <tr>
          <td>${l.entity_type}</td>
          <td>${l.entity_id}</td>
          <td>${l.link_type}</td>
          <td>${new Date(l.created_at).toLocaleString()}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${document.events && document.events.length > 0 ? `
  <div class="section">
    <h2>Activity History (Last ${Math.min(document.events.length, 50)})</h2>
    <table>
      <thead>
        <tr>
          <th>Event Type</th>
          <th>Timestamp</th>
          <th>User</th>
        </tr>
      </thead>
      <tbody>
        ${document.events.map((e: any) => `
        <tr>
          <td>${e.event_type}</td>
          <td>${new Date(e.created_at).toLocaleString()}</td>
          <td>${e.user_id || 'System'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <p style="color: #666; font-size: 12px; margin-top: 40px;">
      Generated on ${new Date().toLocaleString()} by DocuStore
    </p>
  </div>
</body>
</html>
    `.trim();

    // In production, convert HTML to PDF using puppeteer or similar
    // For now, return HTML (can be converted server-side)
    return html;
  }

  /**
   * Generate AuditPack PDF content
   */
  private static generateAuditPackPDFContent(
    entityType: string,
    entityId: string,
    documents: DocumentWithRelations[]
  ): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Audit Pack: ${entityType} ${entityId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .document { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #007bff; color: white; }
  </style>
</head>
<body>
  <h1>Audit Pack</h1>
  
  <div class="metadata">
    <h2>Entity Information</h2>
    <p><strong>Entity Type:</strong> ${entityType}</p>
    <p><strong>Entity ID:</strong> ${entityId}</p>
    <p><strong>Document Count:</strong> ${documents.length}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <h2>Linked Documents</h2>
  ${documents.length === 0 ? '<p>No documents found for this entity.</p>' : ''}
  ${documents.map((doc, index) => `
  <div class="document">
    <h3>Document ${index + 1}: ${doc.title}</h3>
    ${doc.description ? `<p><strong>Description:</strong> ${doc.description}</p>` : ''}
    ${doc.document_type ? `<p><strong>Type:</strong> ${doc.document_type}</p>` : ''}
    <p><strong>Created:</strong> ${new Date(doc.created_at).toLocaleString()}</p>
    <p><strong>Status:</strong> ${doc.status}</p>
    ${doc.tags && doc.tags.length > 0 ? `<p><strong>Tags:</strong> ${doc.tags.join(', ')}</p>` : ''}
  </div>
  `).join('')}

  <div style="color: #666; font-size: 12px; margin-top: 40px;">
    <p>Generated on ${new Date().toLocaleString()} by DocuStore</p>
  </div>
</body>
</html>
    `.trim();

    return html;
  }
}

