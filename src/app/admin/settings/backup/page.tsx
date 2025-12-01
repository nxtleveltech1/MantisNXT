'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Download,
  Upload,
  Clock,
  Shield,
  Save,
  Undo2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Calendar,
  FileArchive,
  Settings,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface BackupSettings {
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  time: string;
  retention: number;
  location: 'local' | 'cloud' | 'both';
  encryption: boolean;
  compression: boolean;
  includeFiles: boolean;
  includeLogs: boolean;
}

interface BackupRecord {
  id: string;
  type: 'manual' | 'scheduled';
  status: 'completed' | 'running' | 'failed';
  timestamp: string;
  size: string;
  location: string;
  duration: string;
  tables: number;
  records: number;
}

export default function BackupPage() {
  const [settings, setSettings] = useState<BackupSettings>({
    schedule: 'daily',
    time: '02:00',
    retention: 30,
    location: 'both',
    encryption: true,
    compression: true,
    includeFiles: true,
    includeLogs: false,
  });

  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([
    {
      id: '1',
      type: 'scheduled',
      status: 'completed',
      timestamp: '2023-12-15 02:00:00',
      size: '2.4 GB',
      location: 'Cloud Storage',
      duration: '12 minutes',
      tables: 45,
      records: 125847,
    },
    {
      id: '2',
      type: 'manual',
      status: 'completed',
      timestamp: '2023-12-14 14:30:00',
      size: '2.3 GB',
      location: 'Local Storage',
      duration: '8 minutes',
      tables: 45,
      records: 124891,
    },
    {
      id: '3',
      type: 'scheduled',
      status: 'failed',
      timestamp: '2023-12-14 02:00:00',
      size: '-',
      location: 'Cloud Storage',
      duration: '2 minutes',
      tables: 0,
      records: 0,
    },
  ]);

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSettingChange = (field: keyof BackupSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
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
    setSettings({
      schedule: 'daily',
      time: '02:00',
      retention: 30,
      location: 'both',
      encryption: true,
      compression: true,
      includeFiles: true,
      includeLogs: false,
    });
    setHasChanges(false);
  };

  const startBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);

          // Add new backup record
          const newBackup: BackupRecord = {
            id: Date.now().toString(),
            type: 'manual',
            status: 'completed',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            size: '2.5 GB',
            location: settings.location === 'local' ? 'Local Storage' : 'Cloud Storage',
            duration: '10 minutes',
            tables: 45,
            records: 126532,
          };
          setBackupHistory(prev => [newBackup, ...prev]);

          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  const startRestore = async (backupId: string) => {
    setIsRestoring(true);
    setRestoreProgress(0);

    // Simulate restore progress
    const interval = setInterval(() => {
      setRestoreProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRestoring(false);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 400);
  };

  const deleteBackup = (backupId: string) => {
    setBackupHistory(prev => prev.filter(backup => backup.id !== backupId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateStorageUsage = () => {
    const totalSize = backupHistory
      .filter(backup => backup.status === 'completed')
      .reduce((total, backup) => {
        const size = parseFloat(backup.size.replace(' GB', ''));
        return total + (isNaN(size) ? 0 : size);
      }, 0);
    return totalSize.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Backup & Restore</h1>
          <p className="mt-1 text-sm text-gray-500">Manage system backups and data recovery</p>
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
            Backup settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Restore
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Backup Status */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Backup Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-green-50 p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <p className="text-sm font-medium text-green-800">Last Backup</p>
                    <p className="text-xs text-green-600">2 hours ago</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {backupHistory.filter(b => b.status === 'completed').length}
                    </div>
                    <p className="text-sm font-medium text-blue-800">Total Backups</p>
                    <p className="text-xs text-blue-600">This month</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {calculateStorageUsage()} GB
                    </div>
                    <p className="text-sm font-medium text-purple-800">Storage Used</p>
                    <p className="text-xs text-purple-600">All backups</p>
                  </div>
                </div>

                <Separator />

                {/* Manual Backup */}
                <div className="space-y-4">
                  <h3 className="font-medium">Manual Backup</h3>

                  {isBackingUp ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Backup in progress...</span>
                        <span className="text-sm">{Math.round(backupProgress)}%</span>
                      </div>
                      <Progress value={backupProgress} className="h-2" />
                    </div>
                  ) : (
                    <Button onClick={startBackup} className="w-full">
                      <Database className="mr-2 h-4 w-4" />
                      Start Manual Backup
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Includes:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Database tables</li>
                        <li>• User configurations</li>
                        {settings.includeFiles && <li>• Uploaded files</li>}
                        {settings.includeLogs && <li>• System logs</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-500">Settings:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• {settings.encryption ? 'Encrypted' : 'Not encrypted'}</li>
                        <li>• {settings.compression ? 'Compressed' : 'Uncompressed'}</li>
                        <li>• Location: {settings.location}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Download Latest Backup
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Backup File
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Schedule
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Backup Settings
                </Button>

                <Separator />

                {/* Storage Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Local Storage</span>
                    <span>2.4 GB / 100 GB</span>
                  </div>
                  <Progress value={2.4} className="h-2" />

                  <div className="flex items-center justify-between text-sm">
                    <span>Cloud Storage</span>
                    <span>15.2 GB / 500 GB</span>
                  </div>
                  <Progress value={3.04} className="h-2" />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    All backups are encrypted with AES-256 encryption
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Backup Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Select
                    value={settings.schedule}
                    onValueChange={value => handleSettingChange('schedule', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.schedule !== 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="backupTime">Backup Time</Label>
                    <Input
                      id="backupTime"
                      type="time"
                      value={settings.time}
                      onChange={e => handleSettingChange('time', e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="retention">Retention Period (days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={settings.retention}
                    onChange={e => handleSettingChange('retention', parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-gray-500">
                    Backups older than this will be automatically deleted
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Storage Location</Label>
                  <Select
                    value={settings.location}
                    onValueChange={value => handleSettingChange('location', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Encryption</p>
                      <p className="text-sm text-gray-500">Encrypt backup files with AES-256</p>
                    </div>
                    <Checkbox
                      checked={settings.encryption}
                      onCheckedChange={checked =>
                        handleSettingChange('encryption', Boolean(checked))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Compression</p>
                      <p className="text-sm text-gray-500">Reduce backup file size</p>
                    </div>
                    <Checkbox
                      checked={settings.compression}
                      onCheckedChange={checked =>
                        handleSettingChange('compression', Boolean(checked))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include Files</p>
                      <p className="text-sm text-gray-500">Include uploaded files and documents</p>
                    </div>
                    <Checkbox
                      checked={settings.includeFiles}
                      onCheckedChange={checked =>
                        handleSettingChange('includeFiles', Boolean(checked))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include Logs</p>
                      <p className="text-sm text-gray-500">Include system and application logs</p>
                    </div>
                    <Checkbox
                      checked={settings.includeLogs}
                      onCheckedChange={checked =>
                        handleSettingChange('includeLogs', Boolean(checked))
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Next Scheduled Backup</h4>
                  {settings.schedule === 'manual' ? (
                    <p className="text-sm text-gray-500">No automatic backups scheduled</p>
                  ) : (
                    <div className="text-sm">
                      <p>Tomorrow at {settings.time}</p>
                      <p className="text-gray-500">
                        Frequency: {settings.schedule} at {settings.time}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backup History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-5 w-5" />
                  Backup History
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupHistory.map(backup => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <Badge className={getStatusColor(backup.status)} variant="secondary">
                          {backup.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {backup.type}
                        </Badge>
                        <span className="text-sm text-gray-500">{backup.timestamp}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div>
                          <p className="text-gray-500">Size</p>
                          <p className="font-medium">{backup.size}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium">{backup.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tables</p>
                          <p className="font-medium">{backup.tables}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Records</p>
                          <p className="font-medium">{backup.records.toLocaleString()}</p>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">Location: {backup.location}</p>
                    </div>

                    <div className="ml-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {backup.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startRestore(backup.id)}
                          disabled={isRestoring}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => deleteBackup(backup.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore */}
        <TabsContent value="restore">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Restore Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRestoring ? (
                  <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Restore in progress. Do not close this page or shut down the system.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Restoring data...</span>
                        <span className="text-sm">{Math.round(restoreProgress)}%</span>
                      </div>
                      <Progress value={restoreProgress} className="h-2" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Warning: Restoring a backup will overwrite all current data. This action
                        cannot be undone.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Select Backup to Restore</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose backup..." />
                        </SelectTrigger>
                        <SelectContent>
                          {backupHistory
                            .filter(backup => backup.status === 'completed')
                            .map(backup => (
                              <SelectItem key={backup.id} value={backup.id}>
                                {backup.timestamp} - {backup.size}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Restore Options</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="restoreData" defaultChecked />
                          <label htmlFor="restoreData" className="text-sm">
                            Restore database tables and data
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="restoreFiles" defaultChecked />
                          <label htmlFor="restoreFiles" className="text-sm">
                            Restore uploaded files and documents
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="restoreConfigs" />
                          <label htmlFor="restoreConfigs" className="text-sm">
                            Restore system configurations
                          </label>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" variant="destructive">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Start Restore Process
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Backup File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-600">
                    Drop backup file here or click to browse
                  </p>
                  <Button variant="outline" size="sm">
                    Choose File
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Supported Formats</Label>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>• .sql - Database backup files</p>
                    <p>• .zip - Compressed backup archives</p>
                    <p>• .tar.gz - Compressed archives with files</p>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Uploaded files are automatically scanned for security threats
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
