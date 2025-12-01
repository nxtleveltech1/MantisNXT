'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Upload, Save, Undo2, CheckCircle, AlertTriangle, Globe } from 'lucide-react';

interface GeneralSettings {
  companyName: string;
  companyDescription: string;
  companyWebsite: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  logoUrl: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
}

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>({
    companyName: 'MantisNXT',
    companyDescription: 'Complete supplier management and procurement platform',
    companyWebsite: 'https://mantisnxt.com',
    companyEmail: 'info@mantisnxt.com',
    companyPhone: '+27 11 123 4567',
    companyAddress: '123 Business Park, Johannesburg, South Africa',
    logoUrl: '/logo.png',
    favicon: '/favicon.ico',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    timezone: 'Africa/Johannesburg',
    theme: 'light',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (field: keyof GeneralSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    // Reset to default values
    setSettings({
      companyName: 'MantisNXT',
      companyDescription: 'Complete supplier management and procurement platform',
      companyWebsite: 'https://mantisnxt.com',
      companyEmail: 'info@mantisnxt.com',
      companyPhone: '+27 11 123 4567',
      companyAddress: '123 Business Park, Johannesburg, South Africa',
      logoUrl: '/logo.png',
      favicon: '/favicon.ico',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      timezone: 'Africa/Johannesburg',
      theme: 'light',
    });
    setHasChanges(false);
  };

  const handleFileUpload = (field: 'logoUrl' | 'favicon') => {
    // Simulate file upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = field === 'logoUrl' ? 'image/*' : '.ico,.png';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // In real implementation, upload to server and get URL
        const mockUrl = `/uploads/${field}_${Date.now()}.${file.name.split('.').pop()}`;
        handleInputChange(field, mockUrl);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">General Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your company information and branding</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isLoading}>
            <Undo2 className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Company Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={e => handleInputChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <div className="relative">
                  <Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    id="companyWebsite"
                    value={settings.companyWebsite}
                    onChange={e => handleInputChange('companyWebsite', e.target.value)}
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyDescription">Description</Label>
              <Textarea
                id="companyDescription"
                value={settings.companyDescription}
                onChange={e => handleInputChange('companyDescription', e.target.value)}
                placeholder="Brief description of your company"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={settings.companyEmail}
                  onChange={e => handleInputChange('companyEmail', e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Phone</Label>
                <Input
                  id="companyPhone"
                  value={settings.companyPhone}
                  onChange={e => handleInputChange('companyPhone', e.target.value)}
                  placeholder="+27 11 123 4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyAddress">Address</Label>
              <Textarea
                id="companyAddress"
                value={settings.companyAddress}
                onChange={e => handleInputChange('companyAddress', e.target.value)}
                placeholder="Full company address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding & Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                  {settings.logoUrl ? (
                    <Image
                      src={settings.logoUrl}
                      alt="Logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleFileUpload('logoUrl')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-gray-500">Recommended: 256x256px, PNG or SVG</p>
            </div>

            <Separator />

            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-gray-50">
                  {settings.favicon && (
                    <Image
                      src={settings.favicon}
                      alt="Favicon"
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleFileUpload('favicon')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-gray-500">16x16px or 32x32px, ICO or PNG</p>
            </div>

            <Separator />

            {/* Color Theme */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded border border-gray-300"
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                  <Input
                    id="primaryColor"
                    type="color"
                    value={settings.primaryColor}
                    onChange={e => handleInputChange('primaryColor', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={e => handleInputChange('primaryColor', e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded border border-gray-300"
                    style={{ backgroundColor: settings.secondaryColor }}
                  />
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={settings.secondaryColor}
                    onChange={e => handleInputChange('secondaryColor', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={settings.secondaryColor}
                    onChange={e => handleInputChange('secondaryColor', e.target.value)}
                    placeholder="#64748b"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded text-white"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <Building2 className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium">{settings.companyName}</span>
                </div>
                <Button
                  size="sm"
                  style={{ backgroundColor: settings.primaryColor }}
                  className="mr-2"
                >
                  Primary Button
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  style={{ borderColor: settings.secondaryColor, color: settings.secondaryColor }}
                >
                  Secondary
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
