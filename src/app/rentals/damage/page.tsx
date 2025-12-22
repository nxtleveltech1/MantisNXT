'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Search, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DamageReport } from '@/types/rentals';

export default function DamageReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchDamageReports();
  }, [statusFilter]);

  const fetchDamageReports = async () => {
    try {
      setLoading(true);
      const url =
        statusFilter === 'all'
          ? '/api/rentals/damage'
          : `/api/rentals/damage?status=${statusFilter}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setDamageReports(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load damage reports',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching damage reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load damage reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = damageReports.filter(
    (report) =>
      report.damage_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reservation_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'minor':
        return 'default';
      case 'moderate':
        return 'secondary';
      case 'major':
        return 'destructive';
      case 'total_loss':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported':
        return 'default';
      case 'assessed':
        return 'secondary';
      case 'invoiced':
        return 'outline';
      case 'paid':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `R ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const breadcrumbs = [{ label: 'Rentals', href: '/rentals' }, { label: 'Damage Reports' }];

  return (
    <AppLayout title="Damage Reports" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Damage Reports</h1>
            <p className="text-muted-foreground">Track and manage equipment damage incidents</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Damage Reports</CardTitle>
            <CardDescription>View and manage equipment damage incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search damage reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported Date</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Damage Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Cost Estimate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer Liable</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No damage reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.damage_report_id}>
                        <TableCell>{formatDate(report.reported_at)}</TableCell>
                        <TableCell className="font-medium">
                          {report.equipment_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {report.damage_type ? (
                            <Badge variant="outline">{report.damage_type.replace('_', ' ')}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {report.severity ? (
                            <Badge variant={getSeverityColor(report.severity)}>
                              {report.severity}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {report.final_cost
                            ? formatCurrency(report.final_cost)
                            : report.repair_cost_estimate
                              ? formatCurrency(report.repair_cost_estimate)
                              : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(report.status)}>{report.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.customer_liable ? 'destructive' : 'outline'}>
                            {report.customer_liable ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/rentals/reservations/${report.reservation_id}?tab=damage&report=${report.damage_report_id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

