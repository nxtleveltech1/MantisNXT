'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    segment: 'individual',
    status: 'active',
    lifetime_value: '',
    acquisition_date: '',
    last_interaction_date: '',
    address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
    tags: [] as string[],
    metadata: {} as Record<string, unknown>,
    notes: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up address - only send if at least one field is filled
      const hasAddress = Object.values(formData.address).some(v => v !== '');
      const address = hasAddress ? formData.address : null;

      // Clean up metadata - only send if there are entries
      const metadata = Object.keys(formData.metadata).length > 0 ? formData.metadata : null;

      // Clean up tags - only send if there are entries
      const tags = formData.tags.length > 0 ? formData.tags : null;

      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        company: formData.company || null,
        segment: formData.segment,
        status: formData.status,
        lifetime_value: formData.lifetime_value ? parseFloat(formData.lifetime_value) : null,
        acquisition_date: formData.acquisition_date || null,
        last_interaction_date: formData.last_interaction_date || null,
        address,
        tags,
        metadata,
        notes: formData.notes || null,
      };

      const response = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/customers');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value,
      },
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleAddMetadata = () => {
    if (metadataKey.trim() && metadataValue.trim()) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataKey.trim()]: metadataValue.trim(),
        },
      }));
      setMetadataKey('');
      setMetadataValue('');
    }
  };

  const handleRemoveMetadata = (keyToRemove: string) => {
    setFormData(prev => {
      const newMetadata = { ...prev.metadata };
      delete newMetadata[keyToRemove];
      return {
        ...prev,
        metadata: newMetadata,
      };
    });
  };

  return (
    <AppLayout
      title="Add New Customer"
      breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer' }]}
    >
      <div>
        <p className="mb-6 text-gray-600">Create a new customer record with complete information</p>

        <div className="max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8 rounded-lg bg-white p-6 shadow">
            {/* Basic Information Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="mb-2 block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
            </div>

            {/* Classification Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">
                Classification
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="segment" className="mb-2 block text-sm font-medium text-gray-700">
                    Customer Segment
                  </label>
                  <select
                    id="segment"
                    name="segment"
                    value={formData.segment}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="startup">Startup</option>
                    <option value="smb">SMB (Small/Medium Business)</option>
                    <option value="mid_market">Mid Market</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="churned">Churned</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Financial & Timeline Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">
                Financial & Timeline
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="lifetime_value"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Lifetime Value ($)
                  </label>
                  <input
                    type="number"
                    id="lifetime_value"
                    name="lifetime_value"
                    value={formData.lifetime_value}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="acquisition_date"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Acquisition Date
                  </label>
                  <input
                    type="date"
                    id="acquisition_date"
                    name="acquisition_date"
                    value={formData.acquisition_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="last_interaction_date"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Last Interaction Date
                  </label>
                  <input
                    type="date"
                    id="last_interaction_date"
                    name="last_interaction_date"
                    value={formData.last_interaction_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">Address</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="street" className="mb-2 block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.address.street}
                    onChange={handleAddressChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="mb-2 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.address.city}
                    onChange={handleAddressChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="mb-2 block text-sm font-medium text-gray-700">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.address.state}
                    onChange={handleAddressChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label
                    htmlFor="postal_code"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    value={formData.address.postal_code}
                    onChange={handleAddressChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="10001"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="mb-2 block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.address.country}
                    onChange={handleAddressChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">Tags</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a tag (e.g., vip, high-value, referral)"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Tag
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">
                Custom Metadata
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={metadataKey}
                    onChange={e => setMetadataKey(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Key (e.g., referral_source)"
                  />
                  <input
                    type="text"
                    value={metadataValue}
                    onChange={e => setMetadataValue(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddMetadata())}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Value (e.g., google_ads)"
                  />
                  <button
                    type="button"
                    onClick={handleAddMetadata}
                    className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Metadata
                  </button>
                </div>
                {Object.keys(formData.metadata).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(formData.metadata).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-gray-700">{key}:</span>{' '}
                          <span className="text-gray-600">{String(value)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMetadata(key)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-900">
                Additional Notes
              </h3>
              <div>
                <label htmlFor="notes" className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional information about the customer..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-4 border-t pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Create Customer
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
