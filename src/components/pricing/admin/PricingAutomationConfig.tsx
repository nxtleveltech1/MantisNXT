'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Loader2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PricingAutomationConfig {
  id: string;
  org_id: string;
  enable_auto_activation: boolean;
  auto_activation_confidence_threshold: number;
  enable_ai_recommendations: boolean;
  default_margin_percent: number;
  min_margin_percent: number;
  max_price_increase_percent: number;
  require_review_for_high_impact: boolean;
  high_impact_threshold_percent: number;
  enable_batch_processing: boolean;
  batch_size: number;
  created_at: string;
  updated_at: string;
}

export default function PricingAutomationConfig() {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(''); // TODO: Get from auth context
  const [config, setConfig] = useState<Partial<PricingAutomationConfig>>({
    enable_auto_activation: false,
    auto_activation_confidence_threshold: 85.0,
    enable_ai_recommendations: true,
    default_margin_percent: 30.0,
    min_margin_percent: 5.0,
    max_price_increase_percent: 50.0,
    require_review_for_high_impact: true,
    high_impact_threshold_percent: 20.0,
    enable_batch_processing: true,
    batch_size: 100,
  });

  // Fetch existing configuration
  const { data: existingConfig, isLoading } = useQuery<PricingAutomationConfig>({
    queryKey: ['pricing-automation-config', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/pricing/automation-config?org_id=${orgId}`);
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      return data.data;
    },
    enabled: !!orgId,
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<PricingAutomationConfig>) => {
      const response = await fetch('/api/v1/pricing/automation-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, ...data }),
      });
      if (!response.ok) throw new Error('Failed to update config');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-automation-config', orgId] });
      toast.success('Pricing automation configuration updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate(config);
  };

  // Update local config when fetched
  if (existingConfig && !isLoading) {
    if (JSON.stringify(existingConfig) !== JSON.stringify(config)) {
      setConfig(existingConfig);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pricing Automation</h2>
          <p className="text-muted-foreground">
            Configure automated pricing rules and AI recommendation settings
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI Pricing Recommendations
            </CardTitle>
            <CardDescription>
              Use AI to generate intelligent pricing recommendations based on market conditions,
              historical data, and business objectives
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-ai">Enable AI Recommendations</Label>
                <p className="text-sm text-muted-foreground">
                  Generate AI-powered pricing suggestions for all products
                </p>
              </div>
              <Switch
                id="enable-ai"
                checked={config.enable_ai_recommendations}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enable_ai_recommendations: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-auto">Enable Auto-Activation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically apply AI recommendations when confidence is high
                </p>
              </div>
              <Switch
                id="enable-auto"
                checked={config.enable_auto_activation}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enable_auto_activation: checked })
                }
                disabled={!config.enable_ai_recommendations}
              />
            </div>

            {config.enable_auto_activation && (
              <div className="space-y-2 rounded-lg border p-4">
                <Label htmlFor="confidence-threshold">
                  Auto-Activation Confidence Threshold (%)
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="confidence-threshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={config.auto_activation_confidence_threshold}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        auto_activation_confidence_threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    Recommendations with confidence ≥ {config.auto_activation_confidence_threshold}%
                    will be automatically applied
                  </span>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require-review">Require Review for High-Impact Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Flag recommendations with significant price changes for manual review
                </p>
              </div>
              <Switch
                id="require-review"
                checked={config.require_review_for_high_impact}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, require_review_for_high_impact: checked })
                }
              />
            </div>

            {config.require_review_for_high_impact && (
              <div className="space-y-2 rounded-lg border p-4">
                <Label htmlFor="high-impact-threshold">High-Impact Threshold (%)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="high-impact-threshold"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={config.high_impact_threshold_percent}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        high_impact_threshold_percent: parseFloat(e.target.value),
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    Price changes &gt; {config.high_impact_threshold_percent}% will require review
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Margin Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Default Pricing Rules
            </CardTitle>
            <CardDescription>
              Set default margins and constraints applied when no specific pricing rule exists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="default-margin">Default Margin (%)</Label>
                <Input
                  id="default-margin"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={config.default_margin_percent}
                  onChange={(e) =>
                    setConfig({ ...config, default_margin_percent: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Applied when no pricing rule matches
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-margin">Minimum Margin (%)</Label>
                <Input
                  id="min-margin"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.min_margin_percent}
                  onChange={(e) =>
                    setConfig({ ...config, min_margin_percent: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">Hard minimum for all products</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-increase">Max Price Increase (%)</Label>
                <Input
                  id="max-increase"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  value={config.max_price_increase_percent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      max_price_increase_percent: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum allowed price increase from cost
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Processing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Batch Processing
            </CardTitle>
            <CardDescription>
              Configure how many products to process at once for bulk operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-batch">Enable Batch Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Process multiple products simultaneously for faster pricing updates
                </p>
              </div>
              <Switch
                id="enable-batch"
                checked={config.enable_batch_processing}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enable_batch_processing: checked })
                }
              />
            </div>

            {config.enable_batch_processing && (
              <div className="space-y-2">
                <Label htmlFor="batch-size">Batch Size</Label>
                <Input
                  id="batch-size"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={config.batch_size}
                  onChange={(e) =>
                    setConfig({ ...config, batch_size: parseInt(e.target.value) })
                  }
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Number of products to process per batch
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['pricing-automation-config', orgId] })}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={updateConfigMutation.isPending}>
            {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
