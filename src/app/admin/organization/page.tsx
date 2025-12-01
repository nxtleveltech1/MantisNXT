'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, MapPin, Phone, Shield, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth, ProtectedComponent } from '@/lib/auth/auth-context';
import type { Organization } from '@/types/auth';
import { formatZAR, SA_VAT_RATE } from '@/lib/utils/currency';
import { mockAuthProvider } from '@/lib/auth/mock-provider';

const SA_PROVINCES = [
  { value: 'eastern_cape', label: 'Eastern Cape' },
  { value: 'free_state', label: 'Free State' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu_natal', label: 'KwaZulu-Natal' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'northern_cape', label: 'Northern Cape' },
  { value: 'north_west', label: 'North West' },
  { value: 'western_cape', label: 'Western Cape' },
];

const BEE_LEVELS = [
  { value: '1', label: 'Level 1 (135% Procurement Recognition)' },
  { value: '2', label: 'Level 2 (125% Procurement Recognition)' },
  { value: '3', label: 'Level 3 (110% Procurement Recognition)' },
  { value: '4', label: 'Level 4 (100% Procurement Recognition)' },
  { value: '5', label: 'Level 5 (80% Procurement Recognition)' },
  { value: '6', label: 'Level 6 (60% Procurement Recognition)' },
  { value: '7', label: 'Level 7 (50% Procurement Recognition)' },
  { value: '8', label: 'Level 8 (10% Procurement Recognition)' },
  { value: 'non_compliant', label: 'Non-Compliant (0% Procurement Recognition)' },
];

const COMPANY_TYPES = [
  { value: 'pty_ltd', label: 'Private Company (Pty) Ltd' },
  { value: 'cc', label: 'Close Corporation (CC)' },
  { value: 'npc', label: 'Non-Profit Company (NPC)' },
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' },
];

export default function OrganizationSettingsPage() {
  const { user, hasPermission } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load organization data
  useEffect(() => {
    const loadOrganization = () => {
      setIsLoading(true);
      try {
        const mockOrganizations = mockAuthProvider.getMockOrganizations();
        const org = mockOrganizations.find(o => o.id === user?.organizationId);
        setOrganization(org || null);
      } catch (error) {
        console.error('Failed to load organization:', error);
        setError('Failed to load organization settings');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.organizationId) {
      loadOrganization();
    }
  }, [user]);

  const handleInputChange =
    (field: keyof Organization) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!organization) return;

      setOrganization(prev => ({
        ...prev!,
        [field]: e.target.value,
        updatedAt: new Date(),
      }));
      setHasChanges(true);
    };

  const handleAddressChange =
    (field: keyof Organization['address']) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!organization) return;

      setOrganization(prev => ({
        ...prev!,
        address: {
          ...prev!.address,
          [field]: e.target.value,
        },
        updatedAt: new Date(),
      }));
      setHasChanges(true);
    };

  const handleSelectChange = (field: keyof Organization) => (value: string) => {
    if (!organization) return;

    setOrganization(prev => ({
      ...prev!,
      [field]: value,
      updatedAt: new Date(),
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!organization) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In real app, make API call to update organization
      setSuccess('Organization settings saved successfully');
      setHasChanges(false);
    } catch (err) {
      setError('Failed to save organization settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasPermission('organization.read')) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to view organization settings. Contact your
            administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Organization not found. Please contact support.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization&apos;s information and configuration
          </p>
        </div>

        <ProtectedComponent permission="organization.update">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </ProtectedComponent>
      </div>

      {/* Status Messages */}
      {success && (
        <Alert className="border-chart-2 bg-chart-2/10">
          <AlertDescription className="text-chart-2">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Core organization details and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={organization.name}
                onChange={handleInputChange('name')}
                placeholder="Company Name"
                disabled={!hasPermission('organization.update')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgCode">Organization Code</Label>
              <Input
                id="orgCode"
                value={organization.code}
                onChange={handleInputChange('code')}
                placeholder="ORG123"
                disabled={!hasPermission('organization.update')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={organization.website || ''}
              onChange={handleInputChange('website')}
              placeholder="https://company.co.za"
              disabled={!hasPermission('organization.update')}
            />
          </div>

          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="flex items-center">
              <Calendar className="mr-1 h-3 w-3" />
              Created: {new Date(organization.createdAt).toLocaleDateString('en-ZA')}
            </Badge>
            <Badge variant="outline">Status: {organization.status}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* South African Business Registration */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            South African Business Registration
          </CardTitle>
          <CardDescription>Legal entity information and compliance details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="regNumber">Company Registration Number</Label>
              <Input
                id="regNumber"
                value={organization.registrationNumber || organization.registration_number || ''}
                onChange={e => {
                  if (!organization) return;
                  setOrganization(prev => ({
                    ...prev!,
                    registrationNumber: e.target.value,
                    registration_number: e.target.value,
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                placeholder="CK2024/123456/07"
                disabled={!hasPermission('organization.update')}
              />
              <p className="text-xs text-gray-500">CIPC registration number (CK/CC/NPC)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Registration Number</Label>
              <Input
                id="vatNumber"
                value={organization.vatNumber || organization.vat_number || ''}
                onChange={e => {
                  if (!organization) return;
                  setOrganization(prev => ({
                    ...prev!,
                    vatNumber: e.target.value,
                    vat_number: e.target.value,
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                placeholder="4123456789"
                disabled={!hasPermission('organization.update')}
              />
              <p className="text-xs text-gray-500">SARS VAT number (10 digits)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="beeLevel">BEE Certification Level</Label>
              <Select
                value={organization.beeLevel || ''}
                onValueChange={value => {
                  setOrganization(prev => ({
                    ...prev!,
                    beeLevel: value,
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                disabled={!hasPermission('organization.update')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select BEE Level" />
                </SelectTrigger>
                <SelectContent>
                  {BEE_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Black Economic Empowerment certification</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={((organization.vatRate ?? SA_VAT_RATE ?? 0) * 100).toFixed(2)}
                onChange={e => {
                  const rate = parseFloat(e.target.value || '0') / 100;
                  setOrganization(prev => ({
                    ...prev!,
                    vatRate: rate,
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                disabled={!hasPermission('organization.update')}
              />
              <p className="text-xs text-gray-500">Standard SA rate: 15%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>Primary contact details for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Primary Email</Label>
              <Input
                id="email"
                type="email"
                value={organization.email || organization.contact_email || ''}
                onChange={e => {
                  if (!organization) return;
                  setOrganization(prev => ({
                    ...prev!,
                    email: e.target.value,
                    contact_email: e.target.value,
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                placeholder="info@company.co.za"
                disabled={!hasPermission('organization.update')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={organization.phoneNumber || organization.phone || ''}
                onChange={e => {
                  if (!organization) return;
                  setOrganization(prev => ({
                    ...prev!,
                    phoneNumber: e.target.value,
                    phone: e.target.value,
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                placeholder="+27 11 123 4567"
                disabled={!hasPermission('organization.update')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Physical Address
          </CardTitle>
          <CardDescription>Official business address in South Africa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street1">Street Address 1</Label>
            <Input
              id="street1"
              value={organization.address.street1 || organization.address.street || ''}
              onChange={handleAddressChange('street1')}
              placeholder="123 Business Park Drive"
              disabled={!hasPermission('organization.update')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street2">Street Address 2 (Optional)</Label>
            <Input
              id="street2"
              value={organization.address.street2 || ''}
              onChange={handleAddressChange('street2')}
              placeholder="Suite 456"
              disabled={!hasPermission('organization.update')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb</Label>
              <Input
                id="suburb"
                value={organization.address.suburb}
                onChange={handleAddressChange('suburb')}
                placeholder="Sandton"
                disabled={!hasPermission('organization.update')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={organization.address.city}
                onChange={handleAddressChange('city')}
                placeholder="Johannesburg"
                disabled={!hasPermission('organization.update')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={organization.address.postalCode || organization.address.postal_code || ''}
                onChange={e => {
                  if (!organization) return;
                  setOrganization(prev => ({
                    ...prev!,
                    address: {
                      ...prev!.address,
                      postalCode: e.target.value,
                      postal_code: e.target.value,
                    },
                    updatedAt: new Date(),
                  }));
                  setHasChanges(true);
                }}
                placeholder="2196"
                disabled={!hasPermission('organization.update')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Select
              value={organization.address.province}
              onValueChange={value => {
                setOrganization(prev => ({
                  ...prev!,
                  address: {
                    ...prev!.address,
                    province: value as unknown,
                  },
                  updatedAt: new Date(),
                }));
                setHasChanges(true);
              }}
              disabled={!hasPermission('organization.update')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Province" />
              </SelectTrigger>
              <SelectContent>
                {SA_PROVINCES.map(province => (
                  <SelectItem key={province.value} value={province.value}>
                    {province.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>Localization and system settings for South Africa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-50 text-green-800">
                  ZAR (South African Rand)
                </Badge>
              </div>
              <p className="text-xs text-gray-500">All amounts displayed in {formatZAR(1000)}</p>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{organization.timezone}</Badge>
              </div>
              <p className="text-xs text-gray-500">South African Standard Time (SAST)</p>
            </div>

            <div className="space-y-2">
              <Label>Locale</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">en-ZA (English - South Africa)</Badge>
              </div>
              <p className="text-xs text-gray-500">Date/number formatting</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Financial Configuration</Label>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-gray-600">VAT Rate:</span>
                <span className="font-medium">
                  {((organization.vatRate ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Year:</span>
                <span className="font-medium">1 Mar - 28 Feb</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Business Hours:</span>
                <span className="font-medium">08:00 - 17:00 SAST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Working Days:</span>
                <span className="font-medium">Monday - Friday</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
