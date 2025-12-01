/**
 * Export Utilities
 *
 * Provides CSV and Excel export functionality for data tables
 */

import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export class ExportUtils {
  /**
   * Export data to CSV
   */
  static exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[],
    filename: string
  ): void {
    const headers = columns.map(col => col.label);
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        if (col.format) {
          return col.format(value);
        }
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  /**
   * Export data to Excel
   */
  static exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[],
    filename: string,
    sheetName: string = 'Sheet1'
  ): void {
    const headers = columns.map(col => col.label);
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        if (col.format) {
          return col.format(value);
        }
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value;
      })
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-size columns
    const colWidths = columns.map((col, i) => {
      const maxLength = Math.max(col.label.length, ...rows.map(row => String(row[i] || '').length));
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  /**
   * Download blob as file
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Format currency value
   */
  static formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  /**
   * Format date value
   */
  static formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format array as comma-separated string
   */
  static formatArray(value: unknown[] | null | undefined): string {
    if (!value || !Array.isArray(value)) return '';
    return value.join(', ');
  }
}
