/**
 * Access Logs - Monitor user activity and system access
 * Provides detailed logging for POPIA compliance and security monitoring
 */

import React from 'react';
import { Eye, Download, Filter, Search, User, Clock, MapPin, Shield } from 'lucide-react';

interface AccessLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  success: boolean;
  riskScore: number;
  sessionId: string;
}

interface LoginAttempt {
  id: string;
  timestamp: Date;
  email: string;
  ipAddress: string;
  success: boolean;
  failureReason?: string;
  userAgent: string;
  location?: string;
}

export default function AccessLogsPage() {
  // Mock data - replace with actual access logs from your system
  const accessLogs: AccessLog[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      userId: 'usr_123',
      userName: 'John Doe',
      action: 'VIEW_SUPPLIER_DATA',
      resource: '/suppliers/sup_456',
      ipAddress: '196.123.45.67',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'Cape Town, South Africa',
      success: true,
      riskScore: 15,
      sessionId: 'sess_789',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      userId: 'usr_456',
      userName: 'Jane Smith',
      action: 'EXPORT_FINANCIAL_DATA',
      resource: '/analytics/export',
      ipAddress: '41.86.178.123',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      location: 'Johannesburg, South Africa',
      success: true,
      riskScore: 75,
      sessionId: 'sess_012',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      userId: 'usr_789',
      userName: 'Mike Johnson',
      action: 'UPDATE_PAYMENT_INFO',
      resource: '/payments/pay_789',
      ipAddress: '105.234.112.45',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      location: 'Durban, South Africa',
      success: false,
      riskScore: 90,
      sessionId: 'sess_345',
    },
  ];

  const loginAttempts: LoginAttempt[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      email: 'john.doe@company.com',
      ipAddress: '196.123.45.67',
      success: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'Cape Town, South Africa',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      email: 'attacker@evil.com',
      ipAddress: '185.220.101.32',
      success: false,
      failureReason: 'Invalid credentials',
      userAgent: 'curl/7.68.0',
      location: 'Unknown',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      email: 'admin@company.com',
      ipAddress: '10.0.1.100',
      success: true,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      location: 'Internal Network',
    },
  ];

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 80) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          High Risk
        </span>
      );
    } else if (riskScore >= 50) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
          Medium Risk
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Low Risk
        </span>
      );
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('VIEW')) return <Eye className="h-4 w-4" />;
    if (action.includes('EXPORT')) return <Download className="h-4 w-4" />;
    if (action.includes('UPDATE')) return <Shield className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="mr-3 h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Access Logs</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Monitor user activity and system access for security and compliance
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </button>
                <button className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" />
                  Export Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="mb-6 rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by user, action, or IP address..."
                    className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select className="rounded-sm border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500">
                  <option value="">All Actions</option>
                  <option value="VIEW">View</option>
                  <option value="EXPORT">Export</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
                <select className="rounded-sm border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500">
                  <option value="">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Access Logs Table */}
        <div className="mb-8 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {accessLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-400" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                          <div className="text-sm text-gray-500">{log.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getActionIcon(log.action)}
                        <span className="ml-2 text-sm text-gray-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">{log.location}</div>
                          <div className="text-sm text-gray-500">{log.ipAddress}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRiskBadge(log.riskScore)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.success ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Login Attempts */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Login Attempts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loginAttempts.map(attempt => (
                  <tr key={attempt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {formatTimestamp(attempt.timestamp)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {attempt.email}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {attempt.ipAddress}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {attempt.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attempt.success ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {attempt.failureReason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
