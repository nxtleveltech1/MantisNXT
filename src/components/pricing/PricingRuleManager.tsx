/**
 * Pricing Rule Manager Component
 *
 * Comprehensive interface for managing pricing rules with
 * entity targeting (Supplier, Brand, Category, Product),
 * creation, editing, filtering, and activation controls
 *
 * Author: Aster
 * Date: 2025-11-02
 * Updated: 2026-01-07 - Added entity targeting functionality
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  Globe,
  Building2,
  Tag,
  FolderTree,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PricingRule } from '@/lib/db/pricing-schema';
import { PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';

// Entity types for rule targeting
type EntityType = 'global' | 'supplier' | 'brand' | 'category' | 'product';

interface EntityOption {
  id: string;
  name: string;
  code?: string;
  path?: string;
}

// Entity type configuration
const ENTITY_CONFIG: Record<
  EntityType,
  { label: string; icon: React.ElementType; color: string; description: string }
> = {
  global: {
    label: 'Global',
    icon: Globe,
    color: 'text-blue-500',
    description: 'Applies to all products',
  },
  supplier: {
    label: 'Supplier',
    icon: Building2,
    color: 'text-emerald-500',
    description: 'Apply rule to all products from a specific supplier',
  },
  brand: {
    label: 'Brand',
    icon: Tag,
    color: 'text-purple-500',
    description: 'Apply rule to all products of a specific brand',
  },
  category: {
    label: 'Category',
    icon: FolderTree,
    color: 'text-amber-500',
    description: 'Apply rule to all products in a specific category',
  },
  product: {
    label: 'Product',
    icon: Package,
    color: 'text-rose-500',
    description: 'Apply rule to a specific product',
  },
};

export function PricingRuleManager() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Entity data caches for displaying rule targets
  const [entityNames, setEntityNames] = useState<{
    suppliers: Map<string, string>;
    brands: Map<string, string>;
    categories: Map<string, string>;
    products: Map<string, string>;
  }>({
    suppliers: new Map(),
    brands: new Map(),
    categories: new Map(),
    products: new Map(),
  });

  const fetchRules = useCallback(async () => {
    try {
      let url = '/api/v1/pricing/rules?';
      if (filterType !== 'all') url += `rule_type=${filterType}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setRules(data.data);
        // Extract entity IDs to fetch names
        await fetchEntityNames(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchTerm]);

  // Fetch entity names for display
  const fetchEntityNames = async (rulesData: PricingRule[]) => {
    const supplierIds = new Set<string>();
    const brandIds = new Set<string>();
    const categoryIds = new Set<string>();
    const productIds = new Set<string>();

    rulesData.forEach(rule => {
      rule.applies_to_suppliers?.forEach(id => supplierIds.add(id));
      rule.applies_to_brands?.forEach(id => brandIds.add(id));
      rule.applies_to_categories?.forEach(id => categoryIds.add(id));
      rule.applies_to_products?.forEach(id => productIds.add(id));
    });

    // Fetch all entity data in parallel
    const [suppliers, brands, categories] = await Promise.all([
      supplierIds.size > 0 ? fetchSuppliers() : Promise.resolve([]),
      brandIds.size > 0 ? fetchBrands() : Promise.resolve([]),
      categoryIds.size > 0 ? fetchCategories() : Promise.resolve([]),
    ]);

    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
    const brandMap = new Map(brands.map(b => [b.id, b.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    setEntityNames({
      suppliers: supplierMap,
      brands: brandMap,
      categories: categoryMap,
      products: new Map(), // Products fetched on-demand due to volume
    });
  };

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

  // Determine what entity type a rule applies to
  const getRuleTargetInfo = (rule: PricingRule) => {
    if (rule.applies_to_products?.length) {
      const names = rule.applies_to_products
        .map(id => entityNames.products.get(id) || id.slice(0, 8))
        .join(', ');
      return { type: 'product' as EntityType, label: names, count: rule.applies_to_products.length };
    }
    if (rule.applies_to_categories?.length) {
      const names = rule.applies_to_categories
        .map(id => entityNames.categories.get(id) || id.slice(0, 8))
        .join(', ');
      return { type: 'category' as EntityType, label: names, count: rule.applies_to_categories.length };
    }
    if (rule.applies_to_brands?.length) {
      const names = rule.applies_to_brands
        .map(id => entityNames.brands.get(id) || id.slice(0, 8))
        .join(', ');
      return { type: 'brand' as EntityType, label: names, count: rule.applies_to_brands.length };
    }
    if (rule.applies_to_suppliers?.length) {
      const names = rule.applies_to_suppliers
        .map(id => entityNames.suppliers.get(id) || id.slice(0, 8))
        .join(', ');
      return { type: 'supplier' as EntityType, label: names, count: rule.applies_to_suppliers.length };
    }
    return { type: 'global' as EntityType, label: 'All Products', count: 0 };
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    fetchRules();
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Pricing Rule</DialogTitle>
              <DialogDescription>
                Define automated pricing strategies for your products
              </DialogDescription>
            </DialogHeader>
            <CreateRuleForm onSuccess={handleSuccess} onCancel={handleDialogClose} />
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
          rules.map(rule => {
            const targetInfo = getRuleTargetInfo(rule);
            const EntityIcon = ENTITY_CONFIG[targetInfo.type].icon;

            return (
            <Card key={rule.rule_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{rule.name}</CardTitle>
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
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
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
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Applies To</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <EntityIcon className={cn('h-4 w-4', ENTITY_CONFIG[targetInfo.type].color)} />
                        <span className="font-medium">
                          {targetInfo.type === 'global' ? (
                            'All Products'
                          ) : (
                            <>
                              {ENTITY_CONFIG[targetInfo.type].label}:{' '}
                              <span className="text-muted-foreground font-normal">
                                {targetInfo.label}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// Fetch functions for entities
async function fetchSuppliers(): Promise<EntityOption[]> {
  try {
    const response = await fetch('/api/suppliers?limit=500');
    const data = await response.json();
    if (data.success && data.data) {
      return data.data.map((s: any) => ({
        id: s.id || s.supplier_id,
        name: s.name || s.supplier_name,
        code: s.code,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchBrands(): Promise<EntityOption[]> {
  try {
    const response = await fetch('/api/brands');
    const data = await response.json();
    if (data.success && data.data) {
      return data.data.map((b: any) => ({
        id: b.brand_id || b.id,
        name: b.brand_name || b.name,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<EntityOption[]> {
  try {
    const response = await fetch('/api/categories');
    const data = await response.json();
    // Categories endpoint returns array directly
    if (Array.isArray(data)) {
      return data.map((c: any) => ({
        id: c.id || c.category_id,
        name: c.name,
        path: c.path,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchProducts(search?: string): Promise<EntityOption[]> {
  try {
    const url = search
      ? `/api/v1/products?search=${encodeURIComponent(search)}&limit=50`
      : '/api/v1/products?limit=50';
    const response = await fetch(url);
    const data = await response.json();
    if (data.success && data.data) {
      return data.data.map((p: any) => ({
        id: p.id || p.product_id,
        name: p.name,
        code: p.sku,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// Entity Combobox Component
function EntityCombobox({
  entityType,
  value,
  onChange,
  placeholder,
}: {
  entityType: EntityType;
  value: string | null;
  onChange: (value: string | null, label?: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  // Fetch options based on entity type
  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      let data: EntityOption[] = [];

      switch (entityType) {
        case 'supplier':
          data = await fetchSuppliers();
          break;
        case 'brand':
          data = await fetchBrands();
          break;
        case 'category':
          data = await fetchCategories();
          break;
        case 'product':
          data = await fetchProducts(search);
          break;
      }

      setOptions(data);
      setLoading(false);

      // Set initial label if value exists
      if (value) {
        const found = data.find(opt => opt.id === value);
        if (found) {
          setSelectedLabel(found.name);
        }
      }
    };

    loadOptions();
  }, [entityType, search, value]);

  // Filter options based on search (for non-product entities)
  const filteredOptions = useMemo(() => {
    if (entityType === 'product') return options; // Products are searched server-side
    if (!search) return options;

    const searchLower = search.toLowerCase();
    return options.filter(
      opt =>
        opt.name.toLowerCase().includes(searchLower) ||
        opt.code?.toLowerCase().includes(searchLower) ||
        opt.path?.toLowerCase().includes(searchLower)
    );
  }, [options, search, entityType]);

  const handleSelect = (option: EntityOption) => {
    onChange(option.id, option.name);
    setSelectedLabel(option.name);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(null);
    setSelectedLabel('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
            <span className="truncate">{selectedLabel || value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${ENTITY_CONFIG[entityType].label.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>No {ENTITY_CONFIG[entityType].label.toLowerCase()} found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map(option => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.name}</span>
                      {(option.code || option.path) && (
                        <span className="text-xs text-muted-foreground">
                          {option.code || option.path}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={handleClear}>
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CreateRuleForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: PricingRuleType.COST_PLUS,
    strategy: PricingStrategy.MAXIMIZE_PROFIT,
    priority: 50,
    margin_percent: 30,
    markup_percent: 0,
    min_price: 0,
    max_price: 0,
  });

  const [entityType, setEntityType] = useState<EntityType>('global');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityLabel, setSelectedEntityLabel] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Build the payload based on entity type
      const payload: Record<string, any> = {
        name: formData.name,
        description: formData.description,
        rule_type: formData.rule_type,
        strategy: formData.strategy,
        priority: formData.priority,
        config: {
          margin_percent: formData.margin_percent || undefined,
          markup_percent: formData.markup_percent || undefined,
          min_price: formData.min_price || undefined,
          max_price: formData.max_price || undefined,
        },
      };

      // Add entity targeting based on selection
      if (entityType !== 'global' && selectedEntityId) {
        switch (entityType) {
          case 'supplier':
            payload.applies_to_suppliers = [selectedEntityId];
            break;
          case 'brand':
            payload.applies_to_brands = [selectedEntityId];
            break;
          case 'category':
            payload.applies_to_categories = [selectedEntityId];
            break;
          case 'product':
            payload.applies_to_products = [selectedEntityId];
            break;
        }
      }

      const response = await fetch('/api/v1/pricing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        console.error('Failed to create rule:', error);
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntitySelect = (id: string | null, label?: string) => {
    setSelectedEntityId(id);
    if (label) setSelectedEntityLabel(label);
  };

  const handleEntityTypeChange = (type: EntityType) => {
    setEntityType(type);
    setSelectedEntityId(null);
    setSelectedEntityLabel('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Premium Supplier Markup"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description of this pricing rule"
        />
        </div>
      </div>

      {/* Rule Type & Strategy */}
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
              <SelectItem value={PricingRuleType.DYNAMIC}>Dynamic</SelectItem>
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
              <SelectItem value={PricingStrategy.MAXIMIZE_VOLUME}>Maximize Volume</SelectItem>
              <SelectItem value={PricingStrategy.MATCH_COMPETITION}>Match Competition</SelectItem>
              <SelectItem value={PricingStrategy.PREMIUM_POSITIONING}>Premium Positioning</SelectItem>
              <SelectItem value={PricingStrategy.VALUE_POSITIONING}>Value Positioning</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Entity Targeting Section */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Applies To</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose what this pricing rule applies to
          </p>
        </div>

        {/* Entity Type Selection */}
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(ENTITY_CONFIG) as EntityType[]).map(type => {
            const config = ENTITY_CONFIG[type];
            const Icon = config.icon;
            const isSelected = entityType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => handleEntityTypeChange(type)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all hover:border-primary/50',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Icon
                  className={cn('h-5 w-5', isSelected ? config.color : 'text-muted-foreground')}
                />
                <span className={cn('text-xs font-medium', isSelected && 'text-primary')}>
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Entity Selector (shown when not global) */}
        {entityType !== 'global' && (
          <div className="pt-2">
            <Label>Select {ENTITY_CONFIG[entityType].label}</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {ENTITY_CONFIG[entityType].description}
            </p>
            <EntityCombobox
              entityType={entityType}
              value={selectedEntityId}
              onChange={handleEntitySelect}
              placeholder={`Choose a ${ENTITY_CONFIG[entityType].label.toLowerCase()}...`}
            />
          </div>
        )}

        {entityType === 'global' && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            This rule will apply to <strong className="text-foreground">all products</strong> in
            your catalog
          </div>
        )}
      </div>

      {/* Pricing Parameters */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Pricing Parameters</Label>
        <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority (1-100)</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="100"
            value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })}
          />
            <p className="text-xs text-muted-foreground mt-1">Higher priority rules are applied first</p>
        </div>
        <div>
          <Label htmlFor="margin">Target Margin %</Label>
          <Input
            id="margin"
            type="number"
              step="0.1"
            value={formData.margin_percent}
              onChange={e =>
                setFormData({ ...formData, margin_percent: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="markup">Markup %</Label>
            <Input
              id="markup"
              type="number"
              step="0.1"
              value={formData.markup_percent}
              onChange={e =>
                setFormData({ ...formData, markup_percent: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label htmlFor="min_price">Min Price</Label>
            <Input
              id="min_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.min_price || ''}
              onChange={e =>
                setFormData({ ...formData, min_price: parseFloat(e.target.value) || 0 })
              }
              placeholder="No minimum"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={
            submitting ||
            !formData.name ||
            (entityType !== 'global' && !selectedEntityId)
          }
        >
          {submitting ? 'Creating...' : 'Create Rule'}
      </Button>
      </div>
    </form>
  );
}
