'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, AlertCircle, Bell } from 'lucide-react';
import { useCompetitors, useOrgId } from '@/hooks/api/useCompetitiveIntel';

interface AlertThreshold {
  alert_type: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold_percent?: number;
  threshold_amount?: number;
  competitor_id?: string;
  notification_channels: string[];
  metadata?: Record<string, unknown>;
}

const ALERT_TYPES = [
  {
    id: 'price_breach',
    name: 'Price Breach',
    description: 'Alert when competitor undercuts price by threshold',
    requires_threshold: true,
  },
  {
    id: 'map_violation',
    name: 'MAP Violation',
    description: 'Detect Minimum Advertised Price violations',
    requires_threshold: false,
  },
  {
    id: 'new_product',
    name: 'New Product Detection',
    description: 'Alert when competitor adds new products',
    requires_threshold: false,
  },
  {
    id: 'assortment_gap',
    name: 'Assortment Gap',
    description: "Identify products competitors sell that we don't",
    requires_threshold: false,
  },
  {
    id: 'stock_status_change',
    name: 'Stock Status Change',
    description: 'Alert when competitor stock status changes significantly',
    requires_threshold: false,
  },
  {
    id: 'promotion_detected',
    name: 'Promotion Detected',
    description: 'Alert when competitor launches promotions',
    requires_threshold: true,
  },
];

export default function ConfigureAlertsPage() {
  const router = useRouter();
  const { data: orgId } = useOrgId();
  const { data: competitors = [] } = useCompetitors(orgId);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Record<string, AlertThreshold>>({});

  useEffect(() => {
    // Initialize default alert configurations
    const defaultAlerts: Record<string, AlertThreshold> = {};
    ALERT_TYPES.forEach(type => {
      defaultAlerts[type.id] = {
        alert_type: type.id,
        enabled: false,
        severity: 'medium',
        notification_channels: [],
        metadata: {},
      };
    });
    setAlerts(defaultAlerts);
  }, []);

  const updateAlert = (alertType: string, updates: Partial<AlertThreshold>) => {
    setAlerts(prev => ({
      ...prev,
      [alertType]: {
        ...prev[alertType],
        ...updates,
      },
    }));
  };

  const handleSave = async () => {
    if (!orgId) {
      alert('Organization ID not available');
      return;
    }

    setLoading(true);

    try {
      // Save each alert configuration
      const alertConfigs = Object.values(alerts).filter(a => a.enabled);

      for (const alert of alertConfigs) {
        const response = await fetch('/api/v1/pricing-intel/alerts/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId,
            ...alert,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to configure ${alert.alert_type} alert`);
        }
      }

      router.push('/pricing-optimization/competitive-intelligence/alerts');
    } catch (error) {
      console.error('Failed to save alert configurations:', error);
      alert(error instanceof Error ? error.message : 'Failed to save configurations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Configure Alerts"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        {
          label: 'Alerts',
          href: '/pricing-optimization/competitive-intelligence/alerts',
        },
        { label: 'Configure' },
      ]}
    >
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configure Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Set up alert thresholds and notification preferences for competitive intelligence
          </p>
        </div>

        <div className="space-y-4">
          {ALERT_TYPES.map(type => {
            const alert = alerts[type.id];
            if (!alert) return null;

            return (
              <Card key={type.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Bell className="text-primary h-5 w-5" />
                        <CardTitle>{type.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">{type.description}</CardDescription>
                    </div>
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={enabled => updateAlert(type.id, { enabled })}
                    />
                  </div>
                </CardHeader>
                {alert.enabled && (
                  <CardContent className="space-y-4">
                    {/* Severity */}
                    <div>
                      <Label htmlFor={`${type.id}-severity`}>Severity</Label>
                      <Select
                        value={alert.severity}
                        onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') =>
                          updateAlert(type.id, { severity: value })
                        }
                      >
                        <SelectTrigger id={`${type.id}-severity`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Threshold (for price-related alerts) */}
                    {type.requires_threshold && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`${type.id}-threshold-percent`}>Threshold (%)</Label>
                          <Input
                            id={`${type.id}-threshold-percent`}
                            type="number"
                            step="0.1"
                            min="0"
                            value={alert.threshold_percent || ''}
                            onChange={e =>
                              updateAlert(type.id, {
                                threshold_percent: parseFloat(e.target.value) || undefined,
                              })
                            }
                            placeholder="e.g., 5.0"
                          />
                          <p className="text-muted-foreground mt-1 text-xs">
                            Percentage difference to trigger alert
                          </p>
                        </div>
                        <div>
                          <Label htmlFor={`${type.id}-threshold-amount`}>Threshold (Amount)</Label>
                          <Input
                            id={`${type.id}-threshold-amount`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={alert.threshold_amount || ''}
                            onChange={e =>
                              updateAlert(type.id, {
                                threshold_amount: parseFloat(e.target.value) || undefined,
                              })
                            }
                            placeholder="e.g., 10.00"
                          />
                          <p className="text-muted-foreground mt-1 text-xs">
                            Absolute amount difference
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Competitor Filter */}
                    <div>
                      <Label htmlFor={`${type.id}-competitor`}>Competitor Filter (Optional)</Label>
                      <Select
                        value={alert.competitor_id || 'all'}
                        onValueChange={value =>
                          updateAlert(type.id, {
                            competitor_id: value === 'all' ? undefined : value,
                          })
                        }
                      >
                        <SelectTrigger id={`${type.id}-competitor`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Competitors</SelectItem>
                          {competitors.map(comp => (
                            <SelectItem key={comp.competitor_id} value={comp.competitor_id}>
                              {comp.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notification Channels */}
                    <div>
                      <Label>Notification Channels</Label>
                      <div className="mt-2 space-y-2">
                        {['email', 'webhook', 'in_app'].map(channel => (
                          <div key={channel} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`${type.id}-${channel}`}
                              checked={alert.notification_channels?.includes(channel) || false}
                              onChange={e => {
                                const channels = alert.notification_channels || [];
                                if (e.target.checked) {
                                  updateAlert(type.id, {
                                    notification_channels: [...channels, channel],
                                  });
                                } else {
                                  updateAlert(type.id, {
                                    notification_channels: channels.filter(c => c !== channel),
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label
                              htmlFor={`${type.id}-${channel}`}
                              className="cursor-pointer font-normal capitalize"
                            >
                              {channel.replace('_', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configurations
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}







