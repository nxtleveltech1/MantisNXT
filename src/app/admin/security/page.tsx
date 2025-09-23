/**
 * Security Dashboard - Main security administration interface
 * Provides overview of security status, threats, and compliance
 */

import React from 'react';
import Link from 'next/link';
import { Shield, Eye, Lock, AlertTriangle, CheckCircle, XCircle, Activity, Users, FileText, Settings } from 'lucide-react';

interface SecurityMetric {
  title: string;
  value: string | number;
  status: 'good' | 'warning' | 'critical';
  change?: string;
}

interface SecurityAlert {
  id: string;
  type: 'security' | 'compliance' | 'access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

export default function SecurityDashboard() {
  // Mock data - replace with actual data from your security monitoring system
  const securityMetrics: SecurityMetric[] = [
    {
      title: 'System Security Score',
      value: '87%',
      status: 'good',
      change: '+2%'
    },
    {
      title: 'Failed Login Attempts (24h)',
      value: 23,
      status: 'warning',
      change: '+15%'
    },
    {
      title: 'POPIA Compliance Score',
      value: '92%',
      status: 'good',
      change: '-1%'
    },
    {
      title: 'Data Breaches (30d)',
      value: 0,
      status: 'good',
      change: '0'
    },
    {
      title: 'Active Sessions',
      value: 156,
      status: 'good',
      change: '+8%'
    },
    {
      title: 'Encryption Coverage',
      value: '98%',
      status: 'good',
      change: '+1%'
    }
  ];

  const recentAlerts: SecurityAlert[] = [
    {
      id: '1',
      type: 'security',
      severity: 'high',
      title: 'Multiple Failed Login Attempts',
      description: 'User account john.doe@company.com has 5 failed login attempts in 10 minutes',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      resolved: false
    },
    {
      id: '2',
      type: 'compliance',
      severity: 'medium',
      title: 'Data Retention Policy Review Due',
      description: '15 data records are approaching retention expiry date',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolved: false
    },
    {
      id: '3',
      type: 'access',
      severity: 'low',
      title: 'New IP Address Access',
      description: 'User admin accessed system from new IP: 196.123.45.67',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      resolved: true
    }
  ];

  const getStatusIcon = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getSeverityBadge = (severity: SecurityAlert['severity']) => {
    const classes = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[severity]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Monitor security status, compliance, and access controls for MantisNXT
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Security Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {securityMetrics.map((metric, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {getStatusIcon(metric.status)}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {metric.title}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {metric.value}
                        </div>
                        {metric.change && (
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                            metric.change.startsWith('+') ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {metric.change}
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Security Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/security/access-logs"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Access Logs</h4>
                  <p className="text-sm text-gray-500">View user activity</p>
                </div>
              </Link>

              <Link
                href="/admin/security/ip-whitelist"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">IP Whitelist</h4>
                  <p className="text-sm text-gray-500">Manage access restrictions</p>
                </div>
              </Link>

              <Link
                href="/admin/security/data-encryption"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Lock className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Data Encryption</h4>
                  <p className="text-sm text-gray-500">Encryption settings</p>
                </div>
              </Link>

              <Link
                href="/admin/security/compliance"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">POPIA Compliance</h4>
                  <p className="text-sm text-gray-500">Data protection status</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Security Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Security Alerts
              </h3>
              <button className="text-sm text-blue-600 hover:text-blue-500">
                View all alerts
              </button>
            </div>

            <div className="flow-root">
              <ul className="-mb-8">
                {recentAlerts.map((alert, index) => (
                  <li key={alert.id}>
                    <div className="relative pb-8">
                      {index !== recentAlerts.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            alert.resolved ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {alert.resolved ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {alert.title}
                            </p>
                            {getSeverityBadge(alert.severity)}
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {alert.description}
                          </p>
                          <div className="mt-1 text-xs text-gray-400">
                            {formatTimeAgo(alert.timestamp)}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {!alert.resolved && (
                            <button className="text-sm text-blue-600 hover:text-blue-500">
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}