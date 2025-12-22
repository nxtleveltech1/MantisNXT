'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Save, Undo2, CheckCircle, AlertTriangle, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import type { ModuleVisibilitySettings } from '@/lib/services/ModuleVisibilityService';

interface ModuleGroup {
  title: string;
  description: string;
  modules: Array<{
    key: keyof ModuleVisibilitySettings;
    label: string;
    description?: string;
  }>;
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    title: 'Main Navigation',
    description: 'Core modules displayed in the primary sidebar',
    modules: [
      { key: 'dashboard', label: 'Dashboard (AI)', description: 'AI-powered dashboard' },
      { key: 'analytics', label: 'Analytics', description: 'Business analytics and insights' },
      { key: 'systemHealth', label: 'System Health', description: 'System monitoring and health' },
      { key: 'projectManagement', label: 'Project Management', description: 'Tasks and project tracking' },
      { key: 'suppliers', label: 'Suppliers', description: 'Supplier management and portfolio' },
      { key: 'productManagement', label: 'Product Management', description: 'Inventory and catalog management' },
      { key: 'customers', label: 'Customers', description: 'Customer relationship management' },
      { key: 'salesServices', label: 'Sales Services', description: 'Quotations, orders, and invoices' },
      { key: 'salesChannels', label: 'Sales Channels', description: 'Multi-channel sales integration' },
      { key: 'courierLogistics', label: 'Courier Logistics', description: 'Delivery and logistics management' },
      { key: 'rentals', label: 'Rentals', description: 'Equipment rental management' },
      { key: 'repairsWorkshop', label: 'Repairs Workshop', description: 'Repair order management' },
      { key: 'docustore', label: 'DocuStore', description: 'Document management' },
      { key: 'aiServices', label: 'AI Services', description: 'AI configuration and services' },
      { key: 'financial', label: 'Financial', description: 'Accounting and financial management' },
    ],
  },
  {
    title: 'Secondary Navigation',
    description: 'Additional modules in the secondary sidebar section',
    modules: [
      { key: 'systemIntegration', label: 'System Integration', description: 'API and integration settings' },
      { key: 'administration', label: 'Administration', description: 'System administration' },
      { key: 'support', label: 'Support', description: 'Support and help resources' },
    ],
  },
  {
    title: 'Projects',
    description: 'Project-specific modules',
    modules: [
      { key: 'loyalty', label: 'Loyalty', description: 'Loyalty program management' },
      { key: 'communication', label: 'Communication', description: 'Messaging and communication' },
    ],
  },
];

export default function ModuleVisibilityPage() {
  const [settings, setSettings] = useState<ModuleVisibilitySettings>({
    dashboard: true,
    analytics: true,
    systemHealth: true,
    projectManagement: true,
    suppliers: true,
    productManagement: true,
    customers: true,
    salesServices: true,
    salesChannels: true,
    courierLogistics: true,
    rentals: true,
    repairsWorkshop: true,
    docustore: true,
    aiServices: true,
    financial: true,
    systemIntegration: true,
    administration: true,
    support: true,
    loyalty: true,
    communication: true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSettings, setOriginalSettings] = useState<ModuleVisibilitySettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/settings/module-visibility');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const data = await response.json();
      if (data.success && data.data) {
        setSettings(data.data);
        setOriginalSettings(data.data);
        setHasChanges(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      console.error('Failed to load module visibility settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof ModuleVisibilitySettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/settings/module-visibility', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }

      const data = await response.json();
      if (data.success) {
        setOriginalSettings(settings);
        setHasChanges(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      console.error('Failed to save module visibility settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
    }
  };

  const handleSelectAll = (groupModules: ModuleGroup['modules']) => {
    const newSettings = { ...settings };
    const allEnabled = groupModules.every(module => settings[module.key]);
    
    groupModules.forEach(module => {
      newSettings[module.key] = !allEnabled;
    });
    
    setSettings(newSettings);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Module Visibility</h1>
          <p className="mt-1 text-sm text-gray-500">
            Control which modules appear in the sidebar for all users
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-orange-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Unsaved Changes
            </span>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            <Undo2 className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Module visibility settings saved successfully! Changes will apply to all users.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Module Groups */}
      <div className="space-y-6">
        {MODULE_GROUPS.map((group, groupIndex) => {
          const allEnabled = group.modules.every(module => settings[module.key]);
          const someEnabled = group.modules.some(module => settings[module.key]);

          return (
            <Card key={groupIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5" />
                      {group.title}
                    </CardTitle>
                    <CardDescription className="mt-1">{group.description}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(group.modules)}
                  >
                    {allEnabled ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Disable All
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Enable All
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.modules.map(module => (
                    <div
                      key={module.key}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={module.key} className="text-sm font-medium cursor-pointer">
                          {module.label}
                        </Label>
                        {module.description && (
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        )}
                      </div>
                      <Switch
                        id={module.key}
                        checked={settings[module.key]}
                        onCheckedChange={() => handleToggle(module.key)}
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Important Notes
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Changes apply to all users immediately after saving</li>
                <li>Disabled modules will be hidden from the sidebar for everyone</li>
                <li>Users will need to refresh their browser to see changes</li>
                <li>Administration module cannot be disabled (always visible to admins)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

