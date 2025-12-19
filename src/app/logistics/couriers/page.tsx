'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, Search, Plus, Settings, Key, Globe, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { CourierProvider } from '@/types/logistics';

export default function CourierProvidersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courierProviders, setCourierProviders] = useState<CourierProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CourierProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    api_endpoint: '',
    api_key: '',
    api_secret: '',
    api_username: '',
    api_password: '',
    is_default: false,
    supports_tracking: true,
    supports_quotes: true,
  });

  useEffect(() => {
    fetchCourierProviders();
  }, []);

  const fetchCourierProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/logistics/courier-providers');
      const result = await response.json();
      if (result.success) {
        setCourierProviders(result.data);
      } else {
        toast.error('Failed to fetch courier providers');
      }
    } catch (error) {
      console.error('Error fetching courier providers:', error);
      toast.error('Error loading courier providers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (provider?: CourierProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        code: provider.code,
        api_endpoint: provider.api_endpoint || '',
        api_key: '',
        api_secret: '',
        api_username: '',
        api_password: '',
        is_default: provider.is_default,
        supports_tracking: provider.supports_tracking,
        supports_quotes: provider.supports_quotes,
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: '',
        code: '',
        api_endpoint: '',
        api_key: '',
        api_secret: '',
        api_username: '',
        api_password: '',
        is_default: false,
        supports_tracking: true,
        supports_quotes: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const credentials: Record<string, string> = {};
      if (formData.api_key) credentials.api_key = formData.api_key;
      if (formData.api_secret) credentials.api_secret = formData.api_secret;
      if (formData.api_username) credentials.api_username = formData.api_username;
      if (formData.api_password) credentials.api_password = formData.api_password;

      const payload = {
        name: formData.name,
        code: formData.code,
        api_endpoint: formData.api_endpoint || undefined,
        api_credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
        is_default: formData.is_default,
        supports_tracking: formData.supports_tracking,
        supports_quotes: formData.supports_quotes,
      };

      const url = editingProvider
        ? `/api/v1/logistics/courier-providers/${editingProvider.id}`
        : '/api/v1/logistics/courier-providers';
      const method = editingProvider ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(editingProvider ? 'Courier provider updated' : 'Courier provider created');
        setIsDialogOpen(false);
        fetchCourierProviders();
      } else {
        toast.error(result.error || 'Failed to save courier provider');
      }
    } catch (error) {
      console.error('Error saving courier provider:', error);
      toast.error('Error saving courier provider');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="mr-1 h-3 w-3" />
            Inactive
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredProviders = courierProviders.filter(
    provider =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout
      title="Courier Providers"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Courier Providers' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Courier Providers</h1>
            <p className="text-muted-foreground">
              Manage courier service providers and their API credentials
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProvider ? 'Edit' : 'Add'} Courier Provider</DialogTitle>
                <DialogDescription>
                  Configure a courier service provider and their API credentials
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Provider Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., PostNet, FastWay"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Provider Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={e =>
                        setFormData({ ...formData, code: e.target.value.toLowerCase() })
                      }
                      required
                      placeholder="e.g., postnet, fastway"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="api_endpoint">API Endpoint</Label>
                  <Input
                    id="api_endpoint"
                    type="url"
                    value={formData.api_endpoint}
                    onChange={e => setFormData({ ...formData, api_endpoint: e.target.value })}
                    placeholder="https://api.provider.com"
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <Label className="text-base font-semibold">API Credentials</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="api_key">API Key</Label>
                      <Input
                        id="api_key"
                        type="password"
                        value={formData.api_key}
                        onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                        placeholder="Leave blank to keep existing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api_secret">API Secret</Label>
                      <Input
                        id="api_secret"
                        type="password"
                        value={formData.api_secret}
                        onChange={e => setFormData({ ...formData, api_secret: e.target.value })}
                        placeholder="Leave blank to keep existing"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="api_username">API Username</Label>
                      <Input
                        id="api_username"
                        value={formData.api_username}
                        onChange={e => setFormData({ ...formData, api_username: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api_password">API Password</Label>
                      <Input
                        id="api_password"
                        type="password"
                        value={formData.api_password}
                        onChange={e => setFormData({ ...formData, api_password: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="is_default" className="cursor-pointer">
                      Set as default provider
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="supports_tracking"
                      checked={formData.supports_tracking}
                      onChange={e =>
                        setFormData({ ...formData, supports_tracking: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="supports_tracking" className="cursor-pointer">
                      Supports tracking
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="supports_quotes"
                      checked={formData.supports_quotes}
                      onChange={e =>
                        setFormData({ ...formData, supports_quotes: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="supports_quotes" className="cursor-pointer">
                      Supports quotes
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingProvider ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search providers by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Providers Grid */}
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="py-8 text-center">Loading courier providers...</div>
            </CardContent>
          </Card>
        ) : filteredProviders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="py-8 text-center">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600">No courier providers found</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Provider
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map(provider => (
              <Card key={provider.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {provider.code}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(provider.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {provider.api_endpoint && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="truncate text-gray-600">{provider.api_endpoint}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {provider.api_credentials &&
                        Object.keys(provider.api_credentials).length > 0
                          ? 'Credentials configured'
                          : 'No credentials'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-2">
                    {provider.is_default && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {provider.supports_tracking && (
                      <Badge variant="outline" className="text-xs">
                        Tracking
                      </Badge>
                    )}
                    {provider.supports_quotes && (
                      <Badge variant="outline" className="text-xs">
                        Quotes
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenDialog(provider)}
                    >
                      <Settings className="mr-1 h-4 w-4" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
