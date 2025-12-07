import { NextResponse } from 'next/server';
import { getSchemaMode } from '@/lib/cmm/db';
import { getTagAnalytics } from '@/lib/cmm/tag-service-core';
import { getTagSalesAnalytics, TagSalesData } from '@/lib/sales/analytics-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const schemaMode = await getSchemaMode();

    if (schemaMode === 'none') {
      return NextResponse.json(
        {
          success: false,
          message: 'Tag service unavailable (no schema detected).',
        },
        { status: 503 }
      );
    }

    if (schemaMode !== 'core') {
      return NextResponse.json(
        {
          success: false,
          message: 'Analytics only supported in core schema mode',
        },
        { status: 501 }
      );
    }

    const dateRange =
      startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;

    const analytics = await getTagAnalytics(tagId || undefined, dateRange);
    const salesData = await getTagSalesAnalytics(dateRange?.start, dateRange?.end);

    // Create a map of sales data for quick lookup
    const salesMap = new Map<string, TagSalesData>(salesData.map((s: TagSalesData) => [s.tagId, s]));

    // Helper to merge data
    const mergeData = (tag: any) => {
      const sales = salesMap.get(tag.tag_id);
      const salesUnits = sales?.totalUnits || 0;
      const salesRevenue = sales?.totalSales || 0;

      // In this context, "Turnover" acts as total revenue from sales
      const totalTurnover = salesRevenue;
      // simple estimation for margin if not available
      const totalMargin = totalTurnover * 0.3;
      const productCount = Number(tag.product_count);

      return {
        tagId: tag.tag_id,
        tagName: tag.tag_name,
        totalSales: salesUnits, // Maps to "Sales" (quantity)
        totalTurnover: totalTurnover,
        totalMargin: totalMargin,
        productCount: productCount,
        avgPrice: salesUnits > 0 ? (totalTurnover / salesUnits) : 0,
      };
    };

    let responseData;
    if (Array.isArray(analytics)) {
      responseData = analytics.map(mergeData);
    } else if (analytics) {
      responseData = [mergeData(analytics)];
    } else {
      responseData = [];
    }

    return NextResponse.json({
      success: true,
      tagAnalytics: responseData,
      mode: 'core',
      isDemoMode: false,
    });
  } catch (error) {
    console.error('Tag analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch tag analytics',
      },
      { status: 500 }
    );
  }
}
