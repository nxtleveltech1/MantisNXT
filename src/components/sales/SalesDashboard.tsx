'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';
import { SalesDashboardData } from '@/lib/sales/analytics-service';
import { CHART_COLORS, SALES_COLORS, GRADIENT_PAIRS } from '@/lib/colors';

interface SalesDashboardProps {
    channel: 'online' | 'in-store' | 'all';
    title: string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                <p className="mb-1 text-sm font-medium text-white">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        R {entry.value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function SalesDashboard({ channel, title }: SalesDashboardProps) {
    const [data, setData] = useState<SalesDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const res = await fetch(`/api/sales/analytics?channel=${channel}`);
                if (!res.ok) throw new Error('Failed to fetch sales data');
                const json = await res.json();
                setData(json.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [channel]);

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="p-4 rounded border" style={{ backgroundColor: `${CHART_COLORS[0]}10`, borderColor: `${CHART_COLORS[0]}40`, color: CHART_COLORS[0] }}>
                Error loading sales data: {error}
            </div>
        );
    }

    const { summary, trend, recentOrders } = data!;

    // Get channel-specific color
    const channelColor = channel === 'online' ? SALES_COLORS.online : channel === 'in-store' ? SALES_COLORS.inStore : SALES_COLORS.total;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                <div className="flex items-center space-x-2">
                    <Badge
                        style={{
                            backgroundColor: `${channelColor}20`,
                            color: channelColor,
                            borderColor: `${channelColor}40`
                        }}
                    >
                        {channel === 'all' ? 'All Channels' : channel === 'online' ? 'Online Store' : 'In-Store POS'}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card style={{ borderLeftWidth: '4px', borderLeftColor: SALES_COLORS.total }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4" style={{ color: SALES_COLORS.total }} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" style={{ color: SALES_COLORS.total }}>
                            R{summary.totalSales.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all {channel === 'all' ? 'channels' : 'transactions'}
                        </p>
                    </CardContent>
                </Card>
                <Card style={{ borderLeftWidth: '4px', borderLeftColor: SALES_COLORS.orders }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4" style={{ color: SALES_COLORS.orders }} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" style={{ color: SALES_COLORS.orders }}>
                            {summary.orderCount.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total completed orders
                        </p>
                    </CardContent>
                </Card>
                <Card style={{ borderLeftWidth: '4px', borderLeftColor: SALES_COLORS.trend }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4" style={{ color: SALES_COLORS.trend }} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" style={{ color: SALES_COLORS.trend }}>
                            R{summary.avgOrderValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per transaction
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={trend}>
                                <defs>
                                    <linearGradient id="salesLineGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#FF00FF" />
                                        <stop offset="15%" stopColor="#BF00FF" />
                                        <stop offset="30%" stopColor="#00BFFF" />
                                        <stop offset="50%" stopColor="#00FFFF" />
                                        <stop offset="65%" stopColor="#39FF14" />
                                        <stop offset="80%" stopColor="#FFFF00" />
                                        <stop offset="100%" stopColor="#FF6600" />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `R${(value / 1000).toFixed(0)}K`}
                                />
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="url(#salesLineGradient)"
                                    strokeWidth={3}
                                    dot={{ fill: channelColor, strokeWidth: 2, stroke: 'white', r: 4 }}
                                    activeDot={{ fill: channelColor, strokeWidth: 2, stroke: 'white', r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <div className="text-sm text-muted-foreground">
                            Latest transactions from {channel === 'all' ? 'all channels' : channel}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentOrders.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No recent orders found.</div>
                            ) : (
                                recentOrders.map((order, index) => (
                                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{order.orderNumber}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                style={{
                                                    backgroundColor: order.status === 'completed' ? `${SALES_COLORS.total}20` : `${CHART_COLORS[3]}20`,
                                                    color: order.status === 'completed' ? SALES_COLORS.total : CHART_COLORS[3],
                                                    fontSize: '10px',
                                                    padding: '2px 6px'
                                                }}
                                            >
                                                {order.status}
                                            </Badge>
                                            <div className="font-medium text-sm" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                                                R{order.total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} style={{ borderLeftWidth: '4px', borderLeftColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-24 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent><Skeleton className="h-[350px] w-full" /></CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex justify-between"><Skeleton className="h-10 w-full" /></div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
