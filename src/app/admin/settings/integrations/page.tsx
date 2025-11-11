"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Link,
  Key,
  Webhook as WebhookIcon,
  TestTube,
  Settings,
  Save,
  Undo2,
  CheckCircle,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Zap,
  Database,
  CreditCard,
  FileText
} from "lucide-react"

interface APIKey {
  id: string
  name: string
  key: string
  permissions: string[]
  lastUsed: string
  status: 'active' | 'inactive'
  createdAt: string
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  secret: string
  status: 'active' | 'inactive'
  lastTriggered: string
}

interface Integration {
  id: string
  name: string
  description: string
  type: 'accounting' | 'erp' | 'payment' | 'document' | 'communication'
  status: 'connected' | 'disconnected' | 'error'
  config: Record<string, unknown>
  icon: React.ReactNode
}

export default function IntegrationsPage() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Mobile App API',
      key: 'mk_live_abc123...',
      permissions: ['read:suppliers', 'write:orders'],
      lastUsed: '2 hours ago',
      status: 'active',
      createdAt: '2023-12-01'
    },
    {
      id: '2',
      name: 'Analytics Dashboard',
      key: 'mk_live_def456...',
      permissions: ['read:analytics', 'read:reports'],
      lastUsed: '1 day ago',
      status: 'active',
      createdAt: '2023-11-15'
    }
  ])

  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: '1',
      name: 'Order Status Updates',
      url: 'https://api.partner.com/webhooks/orders',
      events: ['order.created', 'order.updated', 'order.cancelled'],
      secret: 'whsec_abc123...',
      status: 'active',
      lastTriggered: '5 minutes ago'
    },
    {
      id: '2',
      name: 'Invoice Processing',
      url: 'https://accounting.company.com/webhooks',
      events: ['invoice.created', 'payment.received'],
      secret: 'whsec_def456...',
      status: 'active',
      lastTriggered: '1 hour ago'
    }
  ])

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'sage',
      name: 'Sage Business Cloud',
      description: 'Sync financial data and accounting records',
      type: 'accounting',
      status: 'connected',
      config: { serverUrl: 'https://sage.company.com', apiKey: '***' },
      icon: <Database className="h-5 w-5" />
    },
    {
      id: 'stripe',
      name: 'Stripe Payments',
      description: 'Process payments and manage transactions',
      type: 'payment',
      status: 'connected',
      config: { publishableKey: 'pk_live_***', webhookSecret: '***' },
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: 'docusign',
      name: 'DocuSign',
      description: 'Electronic signature and document management',
      type: 'document',
      status: 'disconnected',
      config: {},
      icon: <FileText className="h-5 w-5" />
    }
  ])

  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showAPIKey, setShowAPIKey] = useState<Record<string, boolean>>({})
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})

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

  const handleReset = () => {
    setHasChanges(false)
  }

  const generateAPIKey = () => {
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: 'New API Key',
      key: `mk_live_${Math.random().toString(36).substring(2, 15)}`,
      permissions: [],
      lastUsed: 'Never',
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    }
    setAPIKeys(prev => [...prev, newKey])
    setHasChanges(true)
  }

  const deleteAPIKey = (keyId: string) => {
    setAPIKeys(prev => prev.filter(key => key.id !== keyId))
    setHasChanges(true)
  }

  const toggleAPIKeyVisibility = (keyId: string) => {
    setShowAPIKey(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const testWebhook = async (webhookId: string) => {
    setTestStatus(prev => ({ ...prev, [webhookId]: 'testing' }))
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestStatus(prev => ({ ...prev, [webhookId]: 'success' }))
      setTimeout(() => setTestStatus(prev => ({ ...prev, [webhookId]: 'idle' })), 3000)
    } catch (error) {
      setTestStatus(prev => ({ ...prev, [webhookId]: 'error' }))
      setTimeout(() => setTestStatus(prev => ({ ...prev, [webhookId]: 'idle' })), 3000)
    }
  }

  const addWebhook = () => {
    const newWebhook: Webhook = {
      id: Date.now().toString(),
      name: 'New Webhook',
      url: '',
      events: [],
      secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
      status: 'inactive',
      lastTriggered: 'Never'
    }
    setWebhooks(prev => [...prev, newWebhook])
    setHasChanges(true)
  }

  const deleteWebhook = (webhookId: string) => {
    setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId))
    setHasChanges(true)
  }

  const connectIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { ...integration, status: 'connected' }
        : integration
    ))
    setHasChanges(true)
  }

  const disconnectIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { ...integration, status: 'disconnected' }
        : integration
    ))
    setHasChanges(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integrations & API</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys, webhooks, and third-party integrations
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
            Integration settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <WebhookIcon className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* Third-party Integrations */}
        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {integration.icon}
                      {integration.name}
                    </div>
                    <Badge
                      variant={
                        integration.status === 'connected'
                          ? 'default'
                          : integration.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {integration.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{integration.description}</p>

                  {integration.status === 'connected' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Configuration</Label>
                      <div className="p-2 bg-gray-50 rounded text-xs space-y-1">
                        {Object.entries(integration.config).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectIntegration(integration.id)}
                          className="flex-1"
                        >
                          Disconnect
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => connectIntegration(integration.id)}
                        className="flex-1"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Integration */}
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-full py-8">
                <Plus className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-4">Add New Integration</p>
                <Button variant="outline">Browse Integrations</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">API Keys</h3>
                <p className="text-sm text-gray-500">Manage API keys for external access</p>
              </div>
              <Button onClick={generateAPIKey}>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{apiKey.name}</h4>
                          <Badge
                            variant={apiKey.status === 'active' ? 'default' : 'secondary'}
                          >
                            {apiKey.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">API Key</Label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {showAPIKey[apiKey.id]
                                  ? apiKey.key
                                  : `${apiKey.key.substring(0, 12)}...`}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleAPIKeyVisibility(apiKey.id)}
                                className="h-6 w-6"
                              >
                                {showAPIKey[apiKey.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigator.clipboard.writeText(apiKey.key)}
                                className="h-6 w-6"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500">Last Used</Label>
                            <p>{apiKey.lastUsed}</p>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500">Created</Label>
                            <p>{apiKey.createdAt}</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Label className="text-xs text-gray-500">Permissions</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {apiKey.permissions.map((permission) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAPIKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* API Documentation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  API Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Authentication</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Include your API key in the Authorization header:
                    </p>
                    <code className="block bg-gray-100 p-3 rounded text-sm">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Base URL</h4>
                    <code className="block bg-gray-100 p-3 rounded text-sm">
                      https://api.mantisnxt.com/v1
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Rate Limits</h4>
                    <p className="text-sm text-gray-600">
                      API calls are limited to 1000 requests per hour per API key.
                    </p>
                  </div>

                  <Button variant="outline">
                    View Full Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Webhooks</h3>
                <p className="text-sm text-gray-500">Configure webhook endpoints for real-time notifications</p>
              </div>
              <Button onClick={addWebhook}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>

            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-medium">{webhook.name}</h4>
                          <Badge
                            variant={webhook.status === 'active' ? 'default' : 'secondary'}
                          >
                            {webhook.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">Endpoint URL</Label>
                            <code className="block text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                              {webhook.url}
                            </code>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500">Last Triggered</Label>
                            <p>{webhook.lastTriggered}</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Label className="text-xs text-gray-500">Events</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <Label className="text-xs text-gray-500">Webhook Secret</Label>
                          <code className="block text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                            {webhook.secret}
                          </code>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhook(webhook.id)}
                          disabled={testStatus[webhook.id] === 'testing'}
                        >
                          {testStatus[webhook.id] === 'testing' ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {testStatus[webhook.id] === 'success' && (
                      <Alert className="mt-3 bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Webhook test successful!
                        </AlertDescription>
                      </Alert>
                    )}

                    {testStatus[webhook.id] === 'error' && (
                      <Alert className="mt-3 bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          Webhook test failed. Check the endpoint URL.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Available Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Available Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    'supplier.created',
                    'supplier.updated',
                    'supplier.approved',
                    'order.created',
                    'order.updated',
                    'order.cancelled',
                    'invoice.created',
                    'invoice.paid',
                    'contract.signed',
                    'contract.expired',
                    'payment.received',
                    'payment.failed'
                  ].map((event) => (
                    <div key={event} className="p-3 border rounded-lg">
                      <code className="text-sm">{event}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
