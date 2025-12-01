/**
 * IP Whitelist Management - Control access by IP address
 * Manage allowed IP addresses and ranges for enhanced security
 */

'use client';

import React, { useState } from 'react';
import { Shield, Plus, Edit, Trash2, Globe, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

interface IPWhitelistEntry {
  id: string;
  ipAddress: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  status: 'active' | 'disabled';
  type: 'single' | 'range' | 'cidr';
  location?: string;
}

interface AddIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entry: Omit<IPWhitelistEntry, 'id' | 'createdAt' | 'lastUsed'>) => void;
}

const AddIPModal: React.FC<AddIPModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    ipAddress: '',
    description: '',
    type: 'single' as 'single' | 'range' | 'cidr',
    status: 'active' as 'active' | 'disabled',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      createdBy: 'current-user', // Replace with actual user
      location: 'Unknown', // You could add geolocation lookup here
    });
    setFormData({
      ipAddress: '',
      description: '',
      type: 'single',
      status: 'active',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
      <div className="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
        <div className="mt-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Add IP Address</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="add-ip-address" className="block text-sm font-medium text-gray-700">
                IP Address/Range
              </label>
              <input
                id="add-ip-address"
                type="text"
                value={formData.ipAddress}
                onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="192.168.1.1 or 192.168.1.0/24"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="add-ip-type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="add-ip-type"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as unknown })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="single">Single IP</option>
                <option value="range">IP Range</option>
                <option value="cidr">CIDR Block</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="add-ip-description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <input
                id="add-ip-description"
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Office network, VPN, etc."
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="add-ip-status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="add-ip-status"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as unknown })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Add IP Address
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function IPWhitelistPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ipEntries, setIpEntries] = useState<IPWhitelistEntry[]>([
    {
      id: '1',
      ipAddress: '41.86.178.0/24',
      description: 'Head Office Network - Johannesburg',
      createdBy: 'admin@company.com',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'active',
      type: 'cidr',
      location: 'Johannesburg, South Africa',
    },
    {
      id: '2',
      ipAddress: '196.123.45.67',
      description: 'CEO Home Office',
      createdBy: 'admin@company.com',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 30 * 60 * 1000),
      status: 'active',
      type: 'single',
      location: 'Cape Town, South Africa',
    },
    {
      id: '3',
      ipAddress: '105.234.112.0/24',
      description: 'Branch Office - Durban',
      createdBy: 'security@company.com',
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'active',
      type: 'cidr',
      location: 'Durban, South Africa',
    },
    {
      id: '4',
      ipAddress: '169.0.121.45',
      description: 'Former Employee Access',
      createdBy: 'hr@company.com',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      status: 'disabled',
      type: 'single',
      location: 'Pretoria, South Africa',
    },
  ]);

  const handleAddIP = (newEntry: Omit<IPWhitelistEntry, 'id' | 'createdAt' | 'lastUsed'>) => {
    const entry: IPWhitelistEntry = {
      ...newEntry,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setIpEntries([...ipEntries, entry]);
  };

  const handleDeleteIP = (id: string) => {
    setIpEntries(ipEntries.filter(entry => entry.id !== id));
  };

  const toggleStatus = (id: string) => {
    setIpEntries(
      ipEntries.map(entry =>
        entry.id === id
          ? { ...entry, status: entry.status === 'active' ? 'disabled' : 'active' }
          : entry
      )
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'single':
        return <Globe className="h-4 w-4" />;
      case 'range':
        return <Shield className="h-4 w-4" />;
      case 'cidr':
        return <Lock className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const activeEntries = ipEntries.filter(entry => entry.status === 'active');
  const disabledEntries = ipEntries.filter(entry => entry.status === 'disabled');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="mr-3 h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">IP Whitelist</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage allowed IP addresses and ranges for system access
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add IP Address
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Active IPs</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{activeEntries.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Disabled IPs</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {disabledEntries.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Globe className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Total Entries</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{ipEntries.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IP Whitelist Table */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Whitelisted IP Addresses
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {ipEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(entry.type)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {entry.ipAddress}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          entry.type === 'single'
                            ? 'bg-blue-100 text-blue-800'
                            : entry.type === 'range'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {entry.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {entry.location}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {entry.lastUsed ? formatDate(entry.lastUsed) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(entry.id)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          entry.status === 'active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {entry.status === 'active' ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-500">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIP(entry.id)}
                          className="text-red-600 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add IP Modal */}
      <AddIPModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddIP}
      />
    </div>
  );
}
