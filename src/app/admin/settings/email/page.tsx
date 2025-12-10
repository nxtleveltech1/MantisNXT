'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import {
  Mail,
  Server,
  Send,
  Eye,
  TestTube,
  Save,
  Undo2,
  CheckCircle,
  AlertTriangle,
  Copy,
  FileText,
  Bell,
  RefreshCw,
  Loader2,
  Zap,
  Settings2,
} from 'lucide-react';

interface EmailSettings {
  provider: 'resend' | 'smtp' | 'auto';
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  enabled: boolean;
  welcomeEmailEnabled: boolean;
  passwordResetEnabled: boolean;
  invitationEmailEnabled: boolean;
  poApprovalEnabled: boolean;
  invoiceReminderEnabled: boolean;
  hasResendKey?: boolean;
  hasSmtpPassword?: boolean;
  isConfigured?: boolean;
  primaryProvider?: string | null;
  lastTestedAt?: string;
  lastTestResult?: 'success' | 'error';
  lastTestError?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  enabled: boolean;
}

const DEFAULT_SETTINGS: EmailSettings = {
  provider: 'auto',
  fromEmail: 'noreply@mantisnxt.com',
  fromName: 'MantisNXT',
  enabled: true,
  welcomeEmailEnabled: true,
  passwordResetEnabled: true,
  invitationEmailEnabled: true,
  poApprovalEnabled: true,
  invoiceReminderEnabled: true,
};

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [testEmail, setTestEmail] = useState('');

  const [emailTemplates] = useState<EmailTemplate[]>([
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to MantisNXT',
      content:
        'Hi {{user_name}},\n\nYour account has been created successfully. You now have access to our supply chain management platform.\n\nLogin at: {{login_url}}\n\nBest regards,\nThe MantisNXT Team',
      variables: ['user_name', 'login_url'],
      enabled: true,
    },
    {
      id: 'password_reset',
      name: 'Password Reset',
      subject: 'Reset Your Password - MantisNXT',
      content:
        'Hi {{user_name}},\n\nWe received a request to reset your password. Click the link below:\n\n{{reset_link}}\n\nThis link expires in {{expires_in}}.\n\nIf you did not request this reset, you can safely ignore this email.',
      variables: ['user_name', 'reset_link', 'expires_in'],
      enabled: true,
    },
    {
      id: 'user_invitation',
      name: 'User Invitation',
      subject: "You've been invited to MantisNXT",
      content:
        'Hi {{user_name}},\n\n{{inviter_name}} has invited you to join MantisNXT.\n\nRole: {{role}}\n\nSet up your account at: {{setup_link}}',
      variables: ['user_name', 'inviter_name', 'role', 'setup_link'],
      enabled: true,
    },
    {
      id: 'po_approval',
      name: 'Purchase Order Approval',
      subject: 'Purchase Order #{{po_number}} Requires Approval',
      content:
        'A new purchase order requires your approval:\n\nPO Number: {{po_number}}\nSupplier: {{supplier_name}}\nAmount: {{amount}}\n\nPlease review and approve at: {{approval_link}}',
      variables: ['po_number', 'supplier_name', 'amount', 'approval_link'],
      enabled: true,
    },
    {
      id: 'invoice_reminder',
      name: 'Invoice Payment Reminder',
      subject: 'Payment Reminder - Invoice #{{invoice_number}}',
      content:
        'This is a reminder that Invoice #{{invoice_number}} is due for payment.\n\nDue Date: {{due_date}}\nAmount: {{amount}}\n\nPlease process payment at your earliest convenience.',
      variables: ['invoice_number', 'due_date', 'amount'],
      enabled: true,
    },
  ]);

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Fetch email configuration on mount
  const fetchEmailConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const response = await fetch('/api/v1/admin/settings/email');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
          setOriginalSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailConfig();
  }, [fetchEmailConfig]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const handleSettingChange = <K extends keyof EmailSettings>(
    field: K,
    value: EmailSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/v1/admin/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalSettings(data.data || settings);
        setSettings(data.data || settings);
        setHasChanges(false);
        setSuccessMessage(data.message || 'Email settings saved successfully!');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setErrorMessage(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrorMessage('An error occurred while saving settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;

    setTestStatus('testing');
    setTestErrorMessage('');
    try {
      const response = await fetch('/api/v1/admin/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setTestStatus('success');
        // Refresh settings to get updated test results
        fetchEmailConfig();
        setTimeout(() => setTestStatus('idle'), 5000);
      } else {
        setTestStatus('error');
        setTestErrorMessage(data.message || 'Failed to send test email');
        setTimeout(() => setTestStatus('idle'), 5000);
      }
    } catch {
      setTestStatus('error');
      setTestErrorMessage('An error occurred while sending test email');
      setTimeout(() => setTestStatus('idle'), 5000);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
  };

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  if (isLoadingConfig) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure email providers and templates for system notifications
          </p>
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
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Enable/Disable Switch */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Email Service</h3>
                <p className="text-sm text-gray-500">
                  {settings.enabled
                    ? 'Email notifications are enabled'
                    : 'Email notifications are disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={checked => handleSettingChange('enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Provider Configuration
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Provider Configuration */}
        <TabsContent value="providers">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Provider Selection & Resend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Email Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>Active Provider</Label>
                  <Select
                    value={settings.provider}
                    onValueChange={value =>
                      handleSettingChange('provider', value as 'resend' | 'smtp' | 'auto')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Resend primary, SMTP fallback)</SelectItem>
                      <SelectItem value="resend">Resend Only</SelectItem>
                      <SelectItem value="smtp">SMTP Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Resend Configuration */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Zap className="h-4 w-4 text-purple-500" />
                    Resend Configuration
                    {settings.hasResendKey && (
                      <Badge variant="outline" className="ml-2 border-green-200 text-green-600">
                        Configured
                      </Badge>
                    )}
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="resendApiKey">API Key</Label>
                    <Input
                      id="resendApiKey"
                      type="password"
                      value={settings.resendApiKey || ''}
                      onChange={e => handleSettingChange('resendApiKey', e.target.value)}
                      placeholder={settings.hasResendKey ? '••••••••' : 're_xxxxxxxxxx'}
                    />
                    <p className="text-xs text-gray-500">
                      Get your API key from{' '}
                      <a
                        href="https://resend.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        resend.com
                      </a>
                    </p>
                  </div>
                </div>

                <Separator />

                {/* SMTP Configuration */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Server className="h-4 w-4 text-blue-500" />
                    SMTP Configuration
                    {settings.smtpHost && (
                      <Badge variant="outline" className="ml-2 border-green-200 text-green-600">
                        Configured
                      </Badge>
                    )}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        value={settings.smtpHost || ''}
                        onChange={e => handleSettingChange('smtpHost', e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={settings.smtpPort || 587}
                        onChange={e => handleSettingChange('smtpPort', parseInt(e.target.value))}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">Username</Label>
                      <Input
                        id="smtpUser"
                        value={settings.smtpUser || ''}
                        onChange={e => handleSettingChange('smtpUser', e.target.value)}
                        placeholder="your-email@domain.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">Password</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={settings.smtpPassword || ''}
                        onChange={e => handleSettingChange('smtpPassword', e.target.value)}
                        placeholder={settings.hasSmtpPassword ? '••••••••' : 'Enter password'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="smtpSecure"
                      checked={settings.smtpSecure || false}
                      onCheckedChange={checked => handleSettingChange('smtpSecure', !!checked)}
                    />
                    <label htmlFor="smtpSecure" className="text-sm">
                      Use SSL/TLS (port 465)
                    </label>
                  </div>
                </div>

                <Separator />

                {/* From Configuration */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4" />
                    From Address
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input
                        id="fromEmail"
                        type="email"
                        value={settings.fromEmail}
                        onChange={e => handleSettingChange('fromEmail', e.target.value)}
                        placeholder="noreply@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fromName">From Name</Label>
                      <Input
                        id="fromName"
                        value={settings.fromName}
                        onChange={e => handleSettingChange('fromName', e.target.value)}
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replyToEmail">Reply-To Email (optional)</Label>
                    <Input
                      id="replyToEmail"
                      type="email"
                      value={settings.replyToEmail || ''}
                      onChange={e => handleSettingChange('replyToEmail', e.target.value || undefined)}
                      placeholder="support@company.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Test Email Address</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>

                <Button
                  onClick={handleTestEmail}
                  disabled={!testEmail || testStatus === 'testing' || !settings.isConfigured}
                  className="w-full"
                >
                  {testStatus === 'testing' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {testStatus === 'testing' ? 'Sending...' : 'Send Test Email'}
                </Button>

                {testStatus === 'success' && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Test email sent successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {testStatus === 'error' && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {testErrorMessage || 'Failed to send test email'}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Configuration Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Configuration Status</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchEmailConfig}
                      disabled={isLoadingConfig}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingConfig ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${settings.isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    <span
                      className={`text-sm ${settings.isConfigured ? 'text-green-600' : 'text-yellow-600'}`}
                    >
                      {settings.isConfigured ? 'Email Service Ready' : 'Not Configured'}
                    </span>
                  </div>
                  {settings.primaryProvider && (
                    <p className="text-xs text-gray-500">
                      Active provider: {settings.primaryProvider === 'resend' ? 'Resend' : 'SMTP'}
                    </p>
                  )}
                </div>

                {/* Last Test Result */}
                {settings.lastTestedAt && (
                  <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs">
                    <p>
                      <strong>Last Tested:</strong>{' '}
                      {new Date(settings.lastTestedAt).toLocaleString()}
                    </p>
                    <p>
                      <strong>Result:</strong>{' '}
                      <span
                        className={
                          settings.lastTestResult === 'success' ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {settings.lastTestResult === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </p>
                    {settings.lastTestError && (
                      <p>
                        <strong>Error:</strong> {settings.lastTestError}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Templates List */}
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.map(template => (
                    <div
                      key={template.id}
                      role="button"
                      tabIndex={0}
                      className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-200 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedTemplate(template);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.enabled ? 'default' : 'secondary'}>
                            {template.enabled ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedTemplate(template);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Template Preview */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTemplate ? `Preview: ${selectedTemplate.name}` : 'Select a Template'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">System Template (Read-Only)</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyTemplate(selectedTemplate.content)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={selectedTemplate.subject} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea value={selectedTemplate.content} rows={8} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>Available Variables</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.variables.map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p>Select a template to preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">System Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Welcome Emails</p>
                        <p className="text-sm text-gray-500">Send welcome email to new users</p>
                      </div>
                      <Switch
                        checked={settings.welcomeEmailEnabled}
                        onCheckedChange={checked =>
                          handleSettingChange('welcomeEmailEnabled', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Password Reset</p>
                        <p className="text-sm text-gray-500">Send password reset emails</p>
                      </div>
                      <Switch
                        checked={settings.passwordResetEnabled}
                        onCheckedChange={checked =>
                          handleSettingChange('passwordResetEnabled', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">User Invitations</p>
                        <p className="text-sm text-gray-500">
                          Send invitation emails to new users
                        </p>
                      </div>
                      <Switch
                        checked={settings.invitationEmailEnabled}
                        onCheckedChange={checked =>
                          handleSettingChange('invitationEmailEnabled', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Business Process Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Purchase Order Approvals</p>
                        <p className="text-sm text-gray-500">Notify approvers of pending POs</p>
                      </div>
                      <Switch
                        checked={settings.poApprovalEnabled}
                        onCheckedChange={checked =>
                          handleSettingChange('poApprovalEnabled', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Invoice Reminders</p>
                        <p className="text-sm text-gray-500">Send payment reminder emails</p>
                      </div>
                      <Switch
                        checked={settings.invoiceReminderEnabled}
                        onCheckedChange={checked =>
                          handleSettingChange('invoiceReminderEnabled', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
