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
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { SalesDashboardData } from '@/lib/sales/analytics-service';

interface SalesDashboardProps {
    channel: 'online' | 'in-store' | 'all';
    title: string;
}

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
            <div className="p-4 text-red-500 bg-red-50 rounded border border-red-200">
                Error loading sales data: {error}
            </div>
        );
    }

    const { summary, trend, recentOrders } = data!;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                <div className="flex items-center space-x-2">
                    <Badge variant={channel === 'online' ? 'default' : channel === 'in-store' ? 'secondary' : 'outline'}>
                        {channel === 'all' ? 'All Channels' : channel === 'online' ? 'Online Store' : 'In-Store POS'}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${summary.totalSales.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all {channel === 'all' ? 'channels' : 'transactions'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.orderCount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Total completed orders
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${summary.avgOrderValue.toFixed(2)}</div>
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
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <div className="text-sm text-muted-foreground">
                            Latest transactions from {channel}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentOrders.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No recent orders found.</div>
                            ) : (
                                recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{order.orderNumber}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0 h-5">
                                                {order.status}
                                            </Badge>
                                            <div className="font-medium text-sm">${order.total.toFixed(2)}</div>
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
                    <Card key={i}>
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
