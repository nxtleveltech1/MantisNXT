'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, XCircle, Clock } from 'lucide-react';

interface Alert {
  id: number;
  type: 'warning' | 'error' | 'info';
  message: string;
  time: string;
  deliveryId?: string | null;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>System Alerts</span>
          <Badge variant="outline">{alerts.length}</Badge>
        </CardTitle>
        <CardDescription>Recent notifications and system events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No active alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600">{alert.time}</span>
                      {alert.deliveryId && (
                        <Badge className={getBadgeVariant(alert.type)} variant="outline">
                          {alert.deliveryId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {alerts.length > 0 && (
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
              Mark All Read
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
              View All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



