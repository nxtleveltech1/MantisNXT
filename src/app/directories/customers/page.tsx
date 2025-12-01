'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, UserCheck, Mail, Phone, Plus, Building2 } from 'lucide-react';

export default function CustomersDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Placeholder data - to be replaced with actual customer data
  const customers: unknown[] = [];

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) || customer.email?.toLowerCase().includes(query)
    );
  });

  return (
    <AppLayout
      title="Customer Directory"
      breadcrumbs={[
        { label: 'Business Directories', href: '/directories' },
        { label: 'Customers' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Customers</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
                <UserCheck className="text-primary h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Customers</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Contacts</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">New This Month</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Plus className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search customers, contacts, or emails..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Directory */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <div className="py-12 text-center">
                <UserCheck className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">No Customers Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Customer directory management will be available soon.
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Customer
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                      </TableCell>
                      <TableCell>{customer.code}</TableCell>
                      <TableCell>{customer.contactName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-4 w-4" />
                          {customer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-4 w-4" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
