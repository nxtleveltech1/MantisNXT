'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings, TestTube, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIServiceConfig {
  id: string;
  service_type: 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant';
  config: {
    provider?: string;
    model?: string;
    apiKey?: string;
    rateLimit?: number;
    [key: string]: any;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const SERVICE_INFO = {
  demand_forecasting: {
    name: 'Demand Forecasting',
    description: 'Predict future product demand using historical data',
    icon: '📊',
    providers: ['openai', 'anthropic', 'custom'],
    defaultModel: 'gpt-4o-mini',
  },
  anomaly_detection: {
    name: 'Anomaly Detection',
    description: 'Detect unusual patterns in sales and inventory',
    icon: '🔍',
    providers: ['openai', 'anthropic', 'custom'],
    defaultModel: 'claude-3-haiku',
  },
  supplier_scoring: {
    name: 'Supplier Scoring',
    description: 'Evaluate supplier performance and reliability',
    icon: '⭐',
    providers: ['openai', 'anthropic', 'custom'],
    defaultModel: 'gpt-4o',
  },
  assistant: {
    name: 'AI Assistant',
    description: 'Conversational AI for business insights',
    icon: '💬',
    providers: ['openai', 'anthropic'],
    defaultModel: 'claude-3-5-sonnet',
  },
};

export default function AIServiceConfiguration() {
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  // Fetch all configurations
  const { data: configs = [], isLoading } = useQuery<AIServiceConfig[]>({
    queryKey: ['ai-configs'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/config');
      if (!response.ok) throw new Error('Failed to fetch configurations');
      const data = await response.json();
      return data.data || [];
    },
  });

  // Update configuration
  const updateConfigMutation = useMutation({
    mutationFn: async ({
      service,
      updates,
    }: {
      service: string;
      updates: Partial<AIServiceConfig>;
    }) => {
      const response = await fetch(`/api/v1/ai/config/${service}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
      toast.success('Configuration updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async (service: string) => {
      const response = await fetch(`/api/v1/ai/config/${service}/test`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Connection test failed');
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message || 'Connection successful!' });
      setIsTestDialogOpen(true);
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      setIsTestDialogOpen(true);
    },
  });

  // Toggle service enabled/disabled
  const handleToggleService = (service: string, enabled: boolean) => {
    updateConfigMutation.mutate({
      service,
      updates: { enabled },
    });
  };

  // Get config for specific service
  const getServiceConfig = (serviceType: string): AIServiceConfig | undefined => {
    return configs.find((c) => c.service_type === serviceType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Service Configuration</h2>
          <p className="text-muted-foreground">
            Configure and manage AI services for your organization
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {Object.entries(SERVICE_INFO).map(([serviceType, info]) => {
          const config = getServiceConfig(serviceType);
          const isEnabled = config?.enabled || false;

          return (
            <Card key={serviceType} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{info.icon}</span>
                    <div>
                      <CardTitle className="text-xl">{info.name}</CardTitle>
                      <CardDescription className="mt-1">{info.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${serviceType}-enabled`} className="text-sm">
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                      id={`${serviceType}-enabled`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleService(serviceType, checked)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${serviceType}-provider`}>Provider</Label>
                  <Select
                    value={config?.config?.provider || info.providers[0]}
                    onValueChange={(value) => {
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: {
                          config: {
                            ...config?.config,
                            provider: value,
                          },
                        },
                      });
                    }}
                  >
                    <SelectTrigger id={`${serviceType}-provider`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {info.providers.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${serviceType}-model`}>Model</Label>
                  <Input
                    id={`${serviceType}-model`}
                    placeholder={info.defaultModel}
                    value={config?.config?.model || ''}
                    onChange={(e) => {
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: {
                          config: {
                            ...config?.config,
                            model: e.target.value,
                          },
                        },
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${serviceType}-rate-limit`}>Rate Limit (requests/min)</Label>
                  <Input
                    id={`${serviceType}-rate-limit`}
                    type="number"
                    placeholder="60"
                    value={config?.config?.rateLimit || ''}
                    onChange={(e) => {
                      updateConfigMutation.mutate({
                        service: serviceType,
                        updates: {
                          config: {
                            ...config?.config,
                            rateLimit: parseInt(e.target.value) || 60,
                          },
                        },
                      });
                    }}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedService(serviceType)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Advanced
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{info.name} - Advanced Configuration</DialogTitle>
                        <DialogDescription>
                          Edit the JSON configuration for advanced settings
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          className="font-mono text-sm"
                          rows={12}
                          defaultValue={JSON.stringify(config?.config || {}, null, 2)}
                          placeholder="{}"
                        />
                        <Button>
                          <Save className="mr-2 h-4 w-4" />
                          Save Configuration
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnectionMutation.mutate(serviceType)}
                    disabled={!isEnabled || testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Result Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Connection Successful
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Connection Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>{testResult?.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setIsTestDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
