/**
 * Pricing Rule Manager Component
 *
 * Comprehensive interface for managing pricing rules with
 * creation, editing, filtering, and activation controls
 *
 * Author: Aster
 * Date: 2025-11-02
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import type { PricingRule } from '@/lib/db/pricing-schema';
import { PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';

export function PricingRuleManager() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRules = useCallback(async () => {
    try {
      let url = '/api/v1/pricing/rules?';
      if (filterType !== 'all') url += `rule_type=${filterType}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchTerm]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRuleActivation = async (ruleId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/v1/pricing/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/v1/pricing/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const getRuleTypeLabel = (type: PricingRuleType) => {
    const labels: Record<PricingRuleType, string> = {
      [PricingRuleType.COST_PLUS]: 'Cost Plus',
      [PricingRuleType.MARKET_BASED]: 'Market Based',
      [PricingRuleType.COMPETITIVE]: 'Competitive',
      [PricingRuleType.DYNAMIC]: 'Dynamic',
      [PricingRuleType.BUNDLE]: 'Bundle',
      [PricingRuleType.CLEARANCE]: 'Clearance',
      [PricingRuleType.PROMOTIONAL]: 'Promotional',
    };
    return labels[type] || type;
  };

  const getStrategyLabel = (strategy: PricingStrategy) => {
    const labels: Record<PricingStrategy, string> = {
      [PricingStrategy.MAXIMIZE_REVENUE]: 'Max Revenue',
      [PricingStrategy.MAXIMIZE_PROFIT]: 'Max Profit',
      [PricingStrategy.MAXIMIZE_VOLUME]: 'Max Volume',
      [PricingStrategy.MATCH_COMPETITION]: 'Match Competition',
      [PricingStrategy.PREMIUM_POSITIONING]: 'Premium',
      [PricingStrategy.VALUE_POSITIONING]: 'Value',
    };
    return labels[strategy] || strategy;
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={PricingRuleType.COST_PLUS}>Cost Plus</SelectItem>
              <SelectItem value={PricingRuleType.MARKET_BASED}>Market Based</SelectItem>
              <SelectItem value={PricingRuleType.COMPETITIVE}>Competitive</SelectItem>
              <SelectItem value={PricingRuleType.DYNAMIC}>Dynamic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Pricing Rule</DialogTitle>
              <DialogDescription>
                Define automated pricing strategies for your products
              </DialogDescription>
            </DialogHeader>
            <CreateRuleForm onSuccess={fetchRules} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center">
              Loading rules...
            </CardContent>
          </Card>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center">
              No pricing rules found. Create your first rule to get started.
            </CardContent>
          </Card>
        ) : (
          rules.map(rule => (
            <Card key={rule.rule_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{rule.name}</CardTitle>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          'Inactive'
                        )}
                      </Badge>
                      <Badge variant="outline">{getRuleTypeLabel(rule.rule_type)}</Badge>
                      <Badge variant="outline">{getStrategyLabel(rule.strategy)}</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {rule.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleActivation(rule.rule_id, rule.is_active)}
                    />
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.rule_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <p className="font-medium">{rule.priority}</p>
                  </div>
                  {rule.config.margin_percent && (
                    <div>
                      <Label className="text-muted-foreground">Target Margin</Label>
                      <p className="font-medium">{rule.config.margin_percent}%</p>
                    </div>
                  )}
                  {rule.config.markup_percent && (
                    <div>
                      <Label className="text-muted-foreground">Markup</Label>
                      <p className="font-medium">{rule.config.markup_percent}%</p>
                    </div>
                  )}
                  {rule.applies_to_categories && rule.applies_to_categories.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Applies To</Label>
                      <p className="font-medium">{rule.applies_to_categories.length} categories</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CreateRuleForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: PricingRuleType.COST_PLUS,
    strategy: PricingStrategy.MAXIMIZE_PROFIT,
    priority: 50,
    margin_percent: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/v1/pricing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          config: {
            margin_percent: formData.margin_percent,
          },
        }),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rule_type">Rule Type</Label>
          <Select
            value={formData.rule_type}
            onValueChange={value =>
              setFormData({ ...formData, rule_type: value as PricingRuleType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PricingRuleType.COST_PLUS}>Cost Plus</SelectItem>
              <SelectItem value={PricingRuleType.MARKET_BASED}>Market Based</SelectItem>
              <SelectItem value={PricingRuleType.COMPETITIVE}>Competitive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="strategy">Strategy</Label>
          <Select
            value={formData.strategy}
            onValueChange={value =>
              setFormData({ ...formData, strategy: value as PricingStrategy })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PricingStrategy.MAXIMIZE_PROFIT}>Maximize Profit</SelectItem>
              <SelectItem value={PricingStrategy.MAXIMIZE_REVENUE}>Maximize Revenue</SelectItem>
              <SelectItem value={PricingStrategy.MATCH_COMPETITION}>Match Competition</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority (1-100)</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="100"
            value={formData.priority}
            onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="margin">Target Margin %</Label>
          <Input
            id="margin"
            type="number"
            value={formData.margin_percent}
            onChange={e => setFormData({ ...formData, margin_percent: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        Create Rule
      </Button>
    </form>
  );
}
