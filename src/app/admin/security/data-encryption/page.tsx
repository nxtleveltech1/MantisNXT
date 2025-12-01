/**
 * Data Encryption Settings - Manage encryption policies and status
 * Configure encryption for sensitive data in compliance with POPIA
 */
'use client';

import React, { useState } from 'react';
import {
  Lock,
  Key,
  Shield,
  Database,
  AlertTriangle,
  CheckCircle,
  Settings,
  RefreshCw,
} from 'lucide-react';

interface EncryptionStatus {
  category: string;
  description: string;
  isEncrypted: boolean;
  encryptionType: 'AES-256' | 'RSA-2048' | 'ChaCha20' | 'None';
  lastRotated?: Date;
  status: 'encrypted' | 'partial' | 'unencrypted';
  recordCount: number;
}

interface EncryptionKey {
  id: string;
  name: string;
  type: 'master' | 'data' | 'backup';
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'expired';
  usageCount: number;
}

export default function DataEncryptionPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState<string | null>(null);

  // Mock data - replace with actual encryption status from your system
  const encryptionStatus: EncryptionStatus[] = [
    {
      category: 'Personal Information',
      description: 'SA ID numbers, contact details, personal data',
      isEncrypted: true,
      encryptionType: 'AES-256',
      lastRotated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'encrypted',
      recordCount: 15420,
    },
    {
      category: 'Financial Data',
      description: 'Bank details, payment information, invoices',
      isEncrypted: true,
      encryptionType: 'AES-256',
      lastRotated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      status: 'encrypted',
      recordCount: 8756,
    },
    {
      category: 'Supplier Contracts',
      description: 'Contract documents, terms, pricing',
      isEncrypted: false,
      encryptionType: 'None',
      status: 'unencrypted',
      recordCount: 3421,
    },
    {
      category: 'User Authentication',
      description: 'Passwords, security tokens, session data',
      isEncrypted: true,
      encryptionType: 'ChaCha20',
      lastRotated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'encrypted',
      recordCount: 892,
    },
    {
      category: 'System Logs',
      description: 'Access logs, audit trails, system events',
      isEncrypted: true,
      encryptionType: 'AES-256',
      lastRotated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      status: 'partial',
      recordCount: 125000,
    },
  ];

  const encryptionKeys: EncryptionKey[] = [
    {
      id: 'key-001',
      name: 'Master Encryption Key',
      type: 'master',
      algorithm: 'AES-256-GCM',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      status: 'active',
      usageCount: 45821,
    },
    {
      id: 'key-002',
      name: 'Personal Data Key',
      type: 'data',
      algorithm: 'AES-256-CBC',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      status: 'active',
      usageCount: 15420,
    },
    {
      id: 'key-003',
      name: 'Financial Data Key',
      type: 'data',
      algorithm: 'AES-256-GCM',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000),
      status: 'active',
      usageCount: 8756,
    },
    {
      id: 'key-004',
      name: 'Backup Key Archive',
      type: 'backup',
      algorithm: 'RSA-2048',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      status: 'active',
      usageCount: 234,
    },
  ];

  const handleKeyRotation = async (keyId: string) => {
    setIsRotating(keyId);
    // Simulate key rotation process
    setTimeout(() => {
      setIsRotating(null);
      // In a real app, you would trigger the actual key rotation
      console.log(`Key rotation completed for ${keyId}`);
    }, 3000);
  };

  const getStatusIcon = (status: EncryptionStatus['status']) => {
    switch (status) {
      case 'encrypted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unencrypted':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: EncryptionStatus['status']) => {
    const classes = {
      encrypted: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      unencrypted: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getKeyTypeIcon = (type: EncryptionKey['type']) => {
    switch (type) {
      case 'master':
        return <Key className="h-5 w-5 text-yellow-500" />;
      case 'data':
        return <Database className="h-5 w-5 text-blue-500" />;
      case 'backup':
        return <Shield className="h-5 w-5 text-purple-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const encryptedCount = encryptionStatus.filter(s => s.status === 'encrypted').length;
  const partialCount = encryptionStatus.filter(s => s.status === 'partial').length;
  const unencryptedCount = encryptionStatus.filter(s => s.status === 'unencrypted').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock className="mr-3 h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Data Encryption</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage encryption settings and monitor data protection status
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </button>
                <button className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rotate Keys
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Encrypted</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{encryptedCount}</dd>
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
                    <dt className="truncate text-sm font-medium text-gray-500">Partial</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{partialCount}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Unencrypted</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{unencryptedCount}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Total Records</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {encryptionStatus.reduce((sum, s) => sum + s.recordCount, 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Encryption Status Table */}
        <div className="mb-8 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Data Category Encryption Status
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Encryption
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Last Rotated
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
                {encryptionStatus.map((category, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(category.status)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {category.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {category.description}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {category.recordCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {category.encryptionType}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {category.lastRotated ? formatDate(category.lastRotated) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(category.status)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      {category.status === 'unencrypted' ? (
                        <button className="text-blue-600 hover:text-blue-500">
                          Enable Encryption
                        </button>
                      ) : (
                        <button className="text-gray-600 hover:text-gray-500">Configure</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Encryption Keys Management */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Encryption Keys Management
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Key Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Algorithm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {encryptionKeys.map(key => {
                  const daysUntilExpiry = getDaysUntilExpiry(key.expiresAt);
                  const isExpiringSoon = daysUntilExpiry <= 30;

                  return (
                    <tr key={key.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getKeyTypeIcon(key.type)}
                          <span className="ml-2 text-sm font-medium text-gray-900">{key.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            key.type === 'master'
                              ? 'bg-yellow-100 text-yellow-800'
                              : key.type === 'data'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {key.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                        {key.algorithm}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        <div className={isExpiringSoon ? 'font-medium text-red-600' : ''}>
                          {formatDate(key.expiresAt)}
                          {isExpiringSoon && (
                            <span className="block text-xs">({daysUntilExpiry} days)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                        {key.usageCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => handleKeyRotation(key.id)}
                          disabled={isRotating === key.id}
                          className="text-blue-600 hover:text-blue-500 disabled:text-gray-400"
                        >
                          {isRotating === key.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Rotate'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
