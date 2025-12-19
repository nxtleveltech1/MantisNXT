'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Package, MapPin, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  const actions = [
    {
      icon: Plus,
      label: 'New Delivery',
      description: 'Create delivery request',
      href: '/logistics/deliveries/new',
      color: 'text-blue-600',
    },
    {
      icon: Users,
      label: 'Assign Courier',
      description: 'Assign to available courier',
      href: '/logistics/couriers',
      color: 'text-green-600',
    },
    {
      icon: Package,
      label: 'Track Package',
      description: 'View delivery status',
      href: '/logistics/deliveries',
      color: 'text-purple-600',
    },
    {
      icon: MapPin,
      label: 'Route Optimizer',
      description: 'Optimize delivery routes',
      href: '/logistics/routes',
      color: 'text-orange-600',
    },
    {
      icon: BarChart3,
      label: 'Reports',
      description: 'View analytics',
      href: '/logistics/reports',
      color: 'text-indigo-600',
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'System configuration',
      href: '/logistics/settings',
      color: 'text-gray-600',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 bg-transparent"
              asChild
            >
              <Link href={action.href}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <div className="text-center">
                  <div className="text-xs font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}



