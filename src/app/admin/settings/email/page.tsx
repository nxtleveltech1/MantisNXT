"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
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
  Bell
} from "lucide-react"

interface SMTPSettings {
  host: string
  port: number
  encryption: 'none' | 'tls' | 'ssl'
  username: string
  password: string
  fromEmail: string
  fromName: string
  replyToEmail: string
  testEmail: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  variables: string[]
  enabled: boolean
}

export default function EmailSettingsPage() {
  const [smtpSettings, setSMTPSettings] = useState<SMTPSettings>({
    host: 'smtp.gmail.com',
    port: 587,
    encryption: 'tls',
    username: 'noreply@mantisnxt.com',
    password: '',
    fromEmail: 'noreply@mantisnxt.com',
    fromName: 'MantisNXT System',
    replyToEmail: 'support@mantisnxt.com',
    testEmail: ''
  })

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}',
      content: 'Dear {{user_name}},\n\nWelcome to {{company_name}}! Your account has been created successfully.\n\nBest regards,\nThe {{company_name}} Team',
      variables: ['company_name', 'user_name'],
      enabled: true
    },
    {
      id: 'po_approval',
      name: 'Purchase Order Approval',
      subject: 'Purchase Order #{{po_number}} Requires Approval',
      content: 'A new purchase order requires your approval:\n\nPO Number: {{po_number}}\nSupplier: {{supplier_name}}\nAmount: {{amount}}\n\nPlease review and approve at: {{approval_link}}',
      variables: ['po_number', 'supplier_name', 'amount', 'approval_link'],
      enabled: true
    },
    {
      id: 'invoice_reminder',
      name: 'Invoice Payment Reminder',
      subject: 'Payment Reminder - Invoice #{{invoice_number}}',
      content: 'This is a reminder that Invoice #{{invoice_number}} is due for payment.\n\nDue Date: {{due_date}}\nAmount: {{amount}}\n\nPlease process payment at your earliest convenience.',
      variables: ['invoice_number', 'due_date', 'amount'],
      enabled: true
    }
  ])

  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  const handleSMTPChange = (field: keyof SMTPSettings, value: string | number) => {
    setSMTPSettings(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleTemplateChange = (templateId: string, field: keyof EmailTemplate, value: string | boolean) => {
    setEmailTemplates(prev => prev.map(template =>
      template.id === templateId
        ? { ...template, [field]: value }
        : template
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setHasChanges(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!smtpSettings.testEmail) return

    setTestStatus('testing')
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (error) {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
    }
  }

  const handleReset = () => {
    setSMTPSettings({
      host: 'smtp.gmail.com',
      port: 587,
      encryption: 'tls',
      username: 'noreply@mantisnxt.com',
      password: '',
      fromEmail: 'noreply@mantisnxt.com',
      fromName: 'MantisNXT System',
      replyToEmail: 'support@mantisnxt.com',
      testEmail: ''
    })
    setHasChanges(false)
  }

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure SMTP settings and email templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isLoading}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Email settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="smtp" className="space-y-6">
        <TabsList>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            SMTP Configuration
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

        {/* SMTP Configuration */}
        <TabsContent value="smtp">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SMTP Settings */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  SMTP Server Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={smtpSettings.host}
                      onChange={(e) => handleSMTPChange('host', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={smtpSettings.port}
                      onChange={(e) => handleSMTPChange('port', parseInt(e.target.value))}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Encryption</Label>
                  <Select
                    value={smtpSettings.encryption}
                    onValueChange={(value) => handleSMTPChange('encryption', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={smtpSettings.username}
                      onChange={(e) => handleSMTPChange('username', e.target.value)}
                      placeholder="your-email@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={smtpSettings.password}
                      onChange={(e) => handleSMTPChange('password', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <Separator />

                {/* Email Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input
                        id="fromEmail"
                        type="email"
                        value={smtpSettings.fromEmail}
                        onChange={(e) => handleSMTPChange('fromEmail', e.target.value)}
                        placeholder="noreply@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fromName">From Name</Label>
                      <Input
                        id="fromName"
                        value={smtpSettings.fromName}
                        onChange={(e) => handleSMTPChange('fromName', e.target.value)}
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replyToEmail">Reply-To Email</Label>
                    <Input
                      id="replyToEmail"
                      type="email"
                      value={smtpSettings.replyToEmail}
                      onChange={(e) => handleSMTPChange('replyToEmail', e.target.value)}
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
                    value={smtpSettings.testEmail}
                    onChange={(e) => handleSMTPChange('testEmail', e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>

                <Button
                  onClick={handleTestEmail}
                  disabled={!smtpSettings.testEmail || testStatus === 'testing'}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {testStatus === 'testing' ? 'Sending...' : 'Send Test Email'}
                </Button>

                {testStatus === 'success' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Test email sent successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {testStatus === 'error' && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Failed to send test email. Check your SMTP settings.
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Connection Status */}
                <div className="space-y-2">
                  <Label>Connection Status</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Last tested: Just now
                  </p>
                </div>

                {/* SMTP Info */}
                <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                  <p><strong>Host:</strong> {smtpSettings.host}</p>
                  <p><strong>Port:</strong> {smtpSettings.port}</p>
                  <p><strong>Encryption:</strong> {smtpSettings.encryption.toUpperCase()}</p>
                  <p><strong>From:</strong> {smtpSettings.fromName} &lt;{smtpSettings.fromEmail}&gt;</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Templates List */}
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <button
                      type="button"
                      key={template.id}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-200 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.enabled ? "default" : "secondary"}>
                            {template.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTemplate(template)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Template Editor */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTemplate ? `Edit: ${selectedTemplate.name}` : 'Select a Template'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enabled"
                          checked={selectedTemplate.enabled}
                          onCheckedChange={(checked) =>
                            handleTemplateChange(selectedTemplate.id, 'enabled', Boolean(checked))
                          }
                        />
                        <label htmlFor="enabled" className="text-sm font-medium">
                          Enable Template
                        </label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyTemplate(selectedTemplate.content)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={selectedTemplate.subject}
                        onChange={(e) =>
                          handleTemplateChange(selectedTemplate.id, 'subject', e.target.value)
                        }
                        placeholder="Email subject"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={selectedTemplate.content}
                        onChange={(e) =>
                          handleTemplateChange(selectedTemplate.id, 'content', e.target.value)
                        }
                        placeholder="Email content"
                        rows={8}
                      />
                    </div>

                    {/* Variables */}
                    <div className="space-y-2">
                      <Label>Available Variables</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Use these variables in your subject and content
                      </p>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-2">
                          Subject: {selectedTemplate.subject}
                        </p>
                        <div className="text-sm whitespace-pre-wrap">
                          {selectedTemplate.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Select a template to edit</p>
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
                      <Checkbox defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Password Reset</p>
                        <p className="text-sm text-gray-500">Send password reset emails</p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">System Alerts</p>
                        <p className="text-sm text-gray-500">Send system status alerts to admins</p>
                      </div>
                      <Checkbox defaultChecked />
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
                      <Checkbox defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Invoice Reminders</p>
                        <p className="text-sm text-gray-500">Send payment reminder emails</p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Contract Expirations</p>
                        <p className="text-sm text-gray-500">Alert before contracts expire</p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Supplier Updates</p>
                        <p className="text-sm text-gray-500">Notify of supplier status changes</p>
                      </div>
                      <Checkbox />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Delivery Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Send Time</Label>
                      <Select defaultValue="immediate">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly Digest</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Digest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Retry Attempts</Label>
                      <Select defaultValue="3">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 attempt</SelectItem>
                          <SelectItem value="3">3 attempts</SelectItem>
                          <SelectItem value="5">5 attempts</SelectItem>
                          <SelectItem value="10">10 attempts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
