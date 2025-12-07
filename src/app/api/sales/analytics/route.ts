import { NextResponse } from 'next/server';
import { getSalesDashboardData } from '@/lib/sales/analytics-service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const channelParam = searchParams.get('channel');
        const channel = (channelParam === 'online' || channelParam === 'in-store') ? channelParam : 'all';

        // Parse dates if provided
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const startDate = startDateParam ? new Date(startDateParam) : undefined;
        const endDate = endDateParam ? new Date(endDateParam) : undefined;

        const data = await getSalesDashboardData(channel, startDate, endDate);

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Sales analytics error:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch sales analytics',
            },
            { status: 500 }
        );
    }
}
