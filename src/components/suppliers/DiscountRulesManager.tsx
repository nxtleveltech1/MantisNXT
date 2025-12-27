'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Percent, Plus, Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiscountRule {
  discount_rule_id: string;
  supplier_id: string;
  rule_name: string;
  discount_percent: number;
  scope_type: 'supplier' | 'category' | 'brand' | 'sku';
  category_id?: string | null;
  brand_id?: string | null;
  supplier_sku?: string | null;
  priority: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string | null;
  category_name?: string | null;
  category_path?: string | null;
  brand_name?: string | null;
}

interface Category {
  category_id: string;
  category_name: string;
  category_path: string;
}

interface Brand {
  brand_id: string;
  brand_name: string;
}

interface DiscountRulesManagerProps {
  supplierId: string;
  baseDiscount: number;
  onBaseDiscountChange: (discount: number) => void;
}

export function DiscountRulesManager({
  supplierId,
  baseDiscount,
  onBaseDiscountChange,
}: DiscountRulesManagerProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    rule_name: '',
    discount_percent: 0,
    scope_type: 'category' as 'category' | 'brand' | 'sku',
    category_id: '',
    brand_id: '',
    supplier_sku: '',
    priority: 0,
    is_active: true,
  });

  useEffect(() => {
    loadRules();
    loadCategories();
    loadBrands();
  }, [supplierId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/suppliers/${supplierId}/discount-rules`);
      const data = await res.json();
      if (data.success) {
        setRules(data.data || []);
      }
    } catch (error) {
      console.error('Error loading discount rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load discount rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/brands`);
      const data = await res.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const openDialog = (rule?: DiscountRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        rule_name: rule.rule_name,
        discount_percent: rule.discount_percent,
        scope_type: rule.scope_type === 'supplier' ? 'category' : rule.scope_type,
        category_id: rule.category_id || '',
        brand_id: rule.brand_id || '',
        supplier_sku: rule.supplier_sku || '',
        priority: rule.priority,
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        rule_name: '',
        discount_percent: 0,
        scope_type: 'category',
        category_id: '',
        brand_id: '',
        supplier_sku: '',
        priority: 0,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
  };

  const saveRule = async () => {
    try {
      setSaving(true);

      if (!formData.rule_name || formData.discount_percent < 0 || formData.discount_percent > 100) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields with valid values',
          variant: 'destructive',
        });
        return;
      }

      if (formData.scope_type === 'category' && !formData.category_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a category',
          variant: 'destructive',
        });
        return;
      }

      if (formData.scope_type === 'brand' && !formData.brand_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a brand',
          variant: 'destructive',
        });
        return;
      }

      if (formData.scope_type === 'sku' && !formData.supplier_sku) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a supplier SKU',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        discount_rule_id: editingRule?.discount_rule_id,
        rule_name: formData.rule_name,
        discount_percent: formData.discount_percent,
        scope_type: formData.scope_type,
        category_id: formData.scope_type === 'category' ? formData.category_id : null,
        brand_id: formData.scope_type === 'brand' ? formData.brand_id : null,
        supplier_sku: formData.scope_type === 'sku' ? formData.supplier_sku : null,
        priority: formData.priority,
        is_active: formData.is_active,
      };

      const url = `/api/suppliers/${supplierId}/discount-rules`;
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save discount rule');
      }

      toast({
        title: 'Success',
        description: editingRule ? 'Discount rule updated' : 'Discount rule created',
      });

      closeDialog();
      loadRules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save discount rule',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule: DiscountRule) => {
    if (!confirm(`Delete discount rule "${rule.rule_name}"?`)) return;

    try {
      const res = await fetch(
        `/api/suppliers/${supplierId}/discount-rules?discount_rule_id=${rule.discount_rule_id}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete discount rule');
      }

      toast({
        title: 'Success',
        description: 'Discount rule deleted',
      });

      loadRules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete discount rule',
        variant: 'destructive',
      });
    }
  };

  const getScopeLabel = (rule: DiscountRule) => {
    switch (rule.scope_type) {
      case 'category':
        return rule.category_name || 'Category';
      case 'brand':
        return rule.brand_name || 'Brand';
      case 'sku':
        return rule.supplier_sku || 'SKU';
      case 'supplier':
        return 'Supplier';
      default:
        return rule.scope_type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Base Discount Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Percent className="text-primary h-5 w-5" />
            Base Discount (Fallback)
          </CardTitle>
          <CardDescription>
            Default discount percentage applied to all products when no specific rules match
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={baseDiscount}
                onChange={(e) => onBaseDiscountChange(parseFloat(e.target.value) || 0)}
                className="max-w-[150px]"
              />
              <span className="text-muted-foreground text-lg font-medium">%</span>
            </div>
            <p className="text-muted-foreground text-sm">
              This is the fallback discount used when no category/brand/SKU rules apply
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Discount Rules Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Percent className="text-primary h-5 w-5" />
                Discount Rules
              </CardTitle>
              <CardDescription>
                Configure discounts at category, brand, or SKU level. Higher priority rules
                override lower priority ones.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              <Percent className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No discount rules configured</p>
              <p className="mt-1 text-xs">Click "Add Rule" to create your first discount rule</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.discount_rule_id}
                    className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-semibold">{rule.rule_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rule.scope_type}
                        </Badge>
                        {!rule.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        <span className="font-medium">{getScopeLabel(rule)}</span> •{' '}
                        <span className="font-mono">{rule.discount_percent}%</span> discount •{' '}
                        Priority: {rule.priority}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(rule)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Discount Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Discount Rule' : 'Create Discount Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure a discount rule for a specific category, brand, or SKU
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., Electronics Category Discount"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Percentage *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.discount_percent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_percent: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-muted-foreground text-xs">
                  Higher priority rules override lower ones
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scope Type *</Label>
              <Select
                value={formData.scope_type}
                onValueChange={(value: 'category' | 'brand' | 'sku') =>
                  setFormData({
                    ...formData,
                    scope_type: value,
                    category_id: '',
                    brand_id: '',
                    supplier_sku: '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="sku">SKU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scope_type === 'category' && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.category_id} value={cat.category_id}>
                        {cat.category_path || cat.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.scope_type === 'brand' && (
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select
                  value={formData.brand_id}
                  onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.brand_id} value={brand.brand_id}>
                        {brand.brand_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.scope_type === 'sku' && (
              <div className="space-y-2">
                <Label>Supplier SKU *</Label>
                <Input
                  value={formData.supplier_sku}
                  onChange={(e) => setFormData({ ...formData, supplier_sku: e.target.value })}
                  placeholder="Enter supplier SKU"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (rule will be applied)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingRule ? (
                'Update Rule'
              ) : (
                'Create Rule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

