import { NextRequest, NextResponse } from 'next/server';
import { CompetitorProfileService } from '@/lib/services/pricing-intel/CompetitorProfileService';
import { getOrgId } from '../../_helpers';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const format = request.nextUrl.searchParams.get('format') || 'csv';

    const service = new CompetitorProfileService();
    const competitors = await service.list(orgId);

    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      const data = competitors.map(c => ({
        'Company Name': c.company_name,
        'Website URL': c.website_url || '',
        Currency: c.default_currency || 'USD',
        Notes: c.notes || '',
        'Created At': c.created_at?.toISOString() || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = [
        { wch: 30 }, // Company Name
        { wch: 40 }, // Website URL
        { wch: 10 }, // Currency
        { wch: 50 }, // Notes
        { wch: 20 }, // Created At
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Competitors');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="competitors-export-${Date.now()}.xlsx"`,
        },
      });
    }

    // CSV format
    const header = ['Company Name', 'Website URL', 'Currency', 'Notes'];
    const lines = [
      header.join(','),
      ...competitors.map(c =>
        [c.company_name, c.website_url || '', c.default_currency || 'USD', c.notes || '']
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="competitors-export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting competitors:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to export competitors',
        },
      },
      { status: 500 }
    );
  }
}





