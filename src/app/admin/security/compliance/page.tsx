/**
 * POPIA Compliance Dashboard - Monitor data protection compliance
 * Manage consent, data subject rights, and privacy compliance
 */
"use client";

import React, { useState } from 'react';
import { FileText, Users, Shield, AlertTriangle, Clock, Download, Eye, Trash2 } from 'lucide-react';

interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  dataSubjectName: string;
  purpose: string;
  dataTypes: string[];
  consentDate: Date;
  status: 'active' | 'withdrawn' | 'expired';
  consentMethod: 'explicit' | 'implied' | 'opt_in';
  expiryDate?: Date;
}

interface DataSubjectRequest {
  id: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  dataSubjectName: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  dueDate: Date;
  description: string;
}

interface RetentionRecord {
  id: string;
  dataType: string;
  recordCount: number;
  oldestRecord: Date;
  retentionPeriod: number; // days
  expiringCount: number;
  overdueCount: number;
}

export default function POPIACompliancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'consent' | 'requests' | 'retention'>('overview');

  // Mock data - replace with actual data from your compliance system
  const consentRecords: ConsentRecord[] = [
    {
      id: '1',
      dataSubjectId: 'ds_001',
      dataSubjectName: 'John Doe',
      purpose: 'Supplier management and communication',
      dataTypes: ['contact', 'identity', 'financial'],
      consentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      status: 'active',
      consentMethod: 'explicit',
      expiryDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      dataSubjectId: 'ds_002',
      dataSubjectName: 'Jane Smith',
      purpose: 'Employment and payroll processing',
      dataTypes: ['identity', 'employment', 'financial'],
      consentDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      status: 'withdrawn',
      consentMethod: 'explicit'
    },
    {
      id: '3',
      dataSubjectId: 'ds_003',
      dataSubjectName: 'Mike Johnson',
      purpose: 'Customer service and support',
      dataTypes: ['contact', 'identity'],
      consentDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      status: 'active',
      consentMethod: 'opt_in',
      expiryDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000)
    }
  ];

  const dataSubjectRequests: DataSubjectRequest[] = [
    {
      id: '1',
      requestType: 'access',
      dataSubjectName: 'Sarah Wilson',
      email: 'sarah.wilson@email.com',
      requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'in_progress',
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      description: 'Request for all personal data held by the company'
    },
    {
      id: '2',
      requestType: 'erasure',
      dataSubjectName: 'David Brown',
      email: 'david.brown@email.com',
      requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'pending',
      dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      description: 'Request to delete all personal information after contract termination'
    },
    {
      id: '3',
      requestType: 'rectification',
      dataSubjectName: 'Lisa Garcia',
      email: 'lisa.garcia@email.com',
      requestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'completed',
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      description: 'Correction of incorrect contact information'
    }
  ];

  const retentionRecords: RetentionRecord[] = [
    {
      id: '1',
      dataType: 'Employee Records',
      recordCount: 1250,
      oldestRecord: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000),
      retentionPeriod: 2555, // 7 years
      expiringCount: 15,
      overdueCount: 3
    },
    {
      id: '2',
      dataType: 'Supplier Contracts',
      recordCount: 850,
      oldestRecord: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
      retentionPeriod: 1825, // 5 years
      expiringCount: 8,
      overdueCount: 0
    },
    {
      id: '3',
      dataType: 'Customer Data',
      recordCount: 3200,
      oldestRecord: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000),
      retentionPeriod: 1095, // 3 years
      expiringCount: 45,
      overdueCount: 12
    }
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      withdrawn: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'access':
        return <Eye className="h-4 w-4" />;
      case 'erasure':
        return <Trash2 className="h-4 w-4" />;
      case 'rectification':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate compliance metrics
  const totalConsents = consentRecords.length;
  const activeConsents = consentRecords.filter(c => c.status === 'active').length;
  const pendingRequests = dataSubjectRequests.filter(r => r.status === 'pending').length;
  const overdueRequests = dataSubjectRequests.filter(r => getDaysUntilDue(r.dueDate) < 0).length;
  const totalOverdueRecords = retentionRecords.reduce((sum, r) => sum + r.overdueCount, 0);

  const complianceScore = Math.round(
    ((activeConsents / totalConsents) * 0.3 +
     ((dataSubjectRequests.length - pendingRequests - overdueRequests) / dataSubjectRequests.length) * 0.4 +
     ((retentionRecords.reduce((sum, r) => sum + r.recordCount, 0) - totalOverdueRecords) /
      retentionRecords.reduce((sum, r) => sum + r.recordCount, 0)) * 0.3) * 100
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">POPIA Compliance</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Monitor data protection compliance and manage privacy requirements
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Shield },
              { key: 'consent', label: 'Consent Management', icon: Users },
              { key: 'requests', label: 'Data Subject Requests', icon: FileText },
              { key: 'retention', label: 'Data Retention', icon: Clock }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as unknown)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Compliance Score */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">POPIA Compliance Score</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Overall compliance based on consent, requests, and retention management
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{complianceScore}%</div>
                  <div className={`text-sm font-medium ${
                    complianceScore >= 90 ? 'text-green-600' :
                    complianceScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {complianceScore >= 90 ? 'Excellent' :
                     complianceScore >= 70 ? 'Good' : 'Needs Attention'}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active Consents
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {activeConsents}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending Requests
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {pendingRequests}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Overdue Records
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {totalOverdueRecords}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-purple-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Data Categories
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {retentionRecords.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consent' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Consent Records
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Types
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consent Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consentRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.dataSubjectName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.purpose}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.dataTypes.join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.consentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.consentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.expiryDate ? formatDate(record.expiryDate) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Data Subject Requests
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataSubjectRequests.map((request) => {
                    const daysUntilDue = getDaysUntilDue(request.dueDate);
                    const isOverdue = daysUntilDue < 0;

                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRequestTypeIcon(request.requestType)}
                            <span className="ml-2 text-sm text-gray-900">
                              {request.requestType}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.dataSubjectName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {request.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.requestDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(request.dueDate)}
                            {isOverdue && (
                              <span className="block text-xs">
                                (Overdue)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-500">
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'retention' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Data Retention Management
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retention Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oldest Record
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiring Soon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overdue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {retentionRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.dataType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.recordCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.round(record.retentionPeriod / 365)} years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.oldestRecord)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.expiringCount > 0 ? (
                          <span className="text-yellow-600 font-medium">
                            {record.expiringCount}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.overdueCount > 0 ? (
                          <span className="text-red-600 font-medium">
                            {record.overdueCount}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {record.overdueCount > 0 ? (
                          <button className="text-red-600 hover:text-red-500">
                            Delete Overdue
                          </button>
                        ) : (
                          <button className="text-blue-600 hover:text-blue-500">
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}