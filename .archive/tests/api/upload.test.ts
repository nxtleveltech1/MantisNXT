import { NextRequest } from 'next/server';
import { POST, GET, HEAD } from '@/app/api/upload/route';
import { UploadFileFactory, createTestXLSXBuffer } from '../fixtures/factories';
import { promises as fs } from 'fs';
import path from 'path';

// Mock file system operations
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('/api/upload', () => {
  const mockUploadDir = '/tmp/test-uploads';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful file operations by default
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    // Set test environment variables
    process.env.UPLOAD_DIR = mockUploadDir;
    process.env.UPLOAD_MAX_SIZE = '10485760'; // 10MB
    process.env.UPLOAD_ALLOWED_TYPES =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg';
    delete process.env.DISABLE_UPLOADS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/upload', () => {
    it('should upload a valid XLSX file successfully', async () => {
      const testData = [
        ['SKU', 'Name', 'Price'],
        ['TEST-001', 'Test Item', '99.99'],
      ];
      const xlsxBuffer = createTestXLSXBuffer(testData);

      const formData = new FormData();
      const file = new File([xlsxBuffer], 'test-inventory.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('File uploaded successfully');
      expect(data.fileId).toBe('test-uuid-1234');
      expect(data.fileName).toBe('test-uuid-1234_test-inventory.xlsx');
      expect(data.fileType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(data.uploadPath).toBe('/uploads/test-uuid-1234_test-inventory.xlsx');

      // Verify file system operations
      expect(mockFs.mkdir).toHaveBeenCalledWith(mockUploadDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockUploadDir, 'test-uuid-1234_test-inventory.xlsx'),
        expect.any(Buffer)
      );
    });

    it('should upload a valid CSV file successfully', async () => {
      const csvContent = 'SKU,Name,Price\nTEST-001,Test Item,99.99';
      const file = new File([csvContent], 'test-inventory.csv', {
        type: 'text/csv',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.fileName).toBe('test-uuid-1234_test-inventory.csv');
    });

    it('should reject file that exceeds size limit', async () => {
      // Create a large buffer that exceeds the 10MB limit
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const file = new File([largeBuffer], 'large-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_FAILED');
      expect(data.message).toContain('File size exceeds maximum allowed size');
    });

    it('should reject unsupported file types', async () => {
      const file = new File(['test content'], 'test.exe', {
        type: 'application/x-executable',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_FAILED');
      expect(data.message).toContain('File type application/x-executable is not allowed');
    });

    it('should reject empty files', async () => {
      const file = new File([], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_FAILED');
      expect(data.message).toBe('File is empty');
    });

    it('should reject files with malicious content', async () => {
      const maliciousContent = '<script>alert("xss")</script>';
      const file = new File([maliciousContent], 'malicious.html', {
        type: 'text/html',
      });

      const formData = new FormData();
      formData.append('file', file);

      // Allow HTML files for this test
      process.env.UPLOAD_ALLOWED_TYPES = 'text/html';

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SECURITY_CHECK_FAILED');
      expect(data.message).toContain('File contains script tags');
    });

    it('should reject PHP files', async () => {
      const phpContent = '<?php echo "Hello World"; ?>';
      const file = new File([phpContent], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', file);

      // Allow text files for this test
      process.env.UPLOAD_ALLOWED_TYPES = 'text/plain';

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SECURITY_CHECK_FAILED');
      expect(data.message).toContain('File contains PHP code');
    });

    it('should return 400 when no file is provided', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NO_FILE');
      expect(data.message).toBe('No file provided');
    });

    it('should return 503 when uploads are disabled', async () => {
      process.env.DISABLE_UPLOADS = 'true';

      const formData = new FormData();
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UPLOADS_DISABLED');
      expect(data.message).toBe('File uploads are currently disabled');
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      const file = new File(['test content'], 'test.csv', {
        type: 'text/csv',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SERVER_ERROR');
      expect(data.message).toBe('Upload failed due to server error');
    });

    it('should generate safe filenames', async () => {
      const file = new File(['test'], '../../../etc/passwd', {
        type: 'text/csv',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.fileName).toBe('test-uuid-1234____etc_passwd');
      expect(data.fileName).not.toContain('../');
      expect(data.fileName).not.toContain('/');
    });
  });

  describe('GET /api/upload', () => {
    it('should return upload configuration', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        maxFileSize: 10485760,
        allowedTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'image/jpeg',
        ],
        uploadEnabled: true,
        uploadEndpoint: '/api/upload',
      });
    });

    it('should show uploads disabled when disabled', async () => {
      process.env.DISABLE_UPLOADS = 'true';

      const request = new NextRequest('http://localhost:3000/api/upload');
      const response = await GET(request);
      const data = await response.json();

      expect(data.uploadEnabled).toBe(false);
    });
  });

  describe('HEAD /api/upload', () => {
    it('should return 200 when upload directory is accessible', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload');
      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(mockFs.mkdir).toHaveBeenCalledWith(mockUploadDir, { recursive: true });
    });

    it('should return 503 when upload directory cannot be created', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const request = new NextRequest('http://localhost:3000/api/upload');
      const response = await HEAD(request);

      expect(response.status).toBe(503);
    });
  });

  describe('File validation edge cases', () => {
    it('should handle Unicode filenames correctly', async () => {
      const file = new File(['test'], '测试文件.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.fileName).toBe('test-uuid-1234______.xlsx');
    });

    it('should truncate very long filenames', async () => {
      const longName = 'a'.repeat(200) + '.xlsx';
      const file = new File(['test'], longName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // Should be truncated to 100 characters + UUID prefix
      expect(data.fileName.length).toBeLessThanOrEqual(150);
    });

    it('should detect executable file signatures', async () => {
      // Windows PE executable signature
      const exeContent = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');
      const file = new File([exeContent], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', file);

      // Allow text files for this test
      process.env.UPLOAD_ALLOWED_TYPES = 'text/plain';

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('SECURITY_CHECK_FAILED');
      expect(data.message).toContain('File appears to be executable');
    });

    it('should detect shell script signatures', async () => {
      const scriptContent = '#!/bin/bash\necho "Hello World"';
      const file = new File([scriptContent], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', file);

      // Allow text files for this test
      process.env.UPLOAD_ALLOWED_TYPES = 'text/plain';

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('SECURITY_CHECK_FAILED');
      expect(data.message).toContain('File appears to be executable');
    });
  });
});
