"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  CurrencyManager,
  CURRENCY_DEFINITIONS,
  VAT_RATES,
  DEFAULT_CURRENCY_CONFIG,
  currencyManager,
  type CurrencyConfig
} from '@/lib/config/currency-config'
import {
  Settings,
  DollarSign,
  Globe,
  RefreshCw,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calculator,
  Eye,
  Edit,
  Plus,
  Trash2,
  Download,
  Upload
} from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'

export default function CurrencySettingsPage() {
  const [config, setConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG)
  const [isModified, setIsModified] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [previewAmount, setPreviewAmount] = useState(1234.56)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load current configuration
  useEffect(() => {
    const currentConfig = currencyManager.getConfig()
    setConfig(currentConfig)
  }, [])

  // Update configuration
  const updateConfig = (updates: Partial<CurrencyConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    setIsModified(true)
    currencyManager.updateConfig(updates)
  }

  // Save configuration
  const saveConfiguration = async () => {
    setIsSaving(true)
    try {
      // In a real application, this would save to database/API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsModified(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setConfig(DEFAULT_CURRENCY_CONFIG)
    currencyManager.updateConfig(DEFAULT_CURRENCY_CONFIG)
    setIsModified(true)
  }

  // Get currency preview
  const getCurrencyPreview = () => {
    try {
      return currencyManager.formatCurrency(previewAmount, config.primary, {
        includeVAT: true,
        showVATBreakdown: config.showVATBreakdown
      })
    } catch {
      return 'Invalid configuration'
    }
  }

  // Get VAT calculation preview
  const getVATPreview = () => {
    try {
      return currencyManager.calculateVAT(previewAmount, config.primary)
    } catch {
      return { exclusive: 0, vat: 0, inclusive: 0, rate: 0 }
    }
  }

  const vatPreview = getVATPreview()

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Currency Settings</h1>
            <p className="text-muted-foreground">
              Configure currency display, VAT rates, and exchange rate management
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <p className="text-sm text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={saveConfiguration}
              disabled={!isModified || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Configuration Status */}
        {isModified && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  You have unsaved changes. Click &quot;Save Changes&quot; to apply your configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="formatting">Formatting</TabsTrigger>
            <TabsTrigger value="vat">VAT & Tax</TabsTrigger>
            <TabsTrigger value="exchange">Exchange Rates</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Currency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Primary Currency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-currency">Base Currency</Label>
                    <Select
                      value={config.primary}
                      onValueChange={(value) => updateConfig({ primary: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CURRENCY_DEFINITIONS).map(([code, def]) => (
                          <SelectItem key={code} value={code}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{def.symbol}</span>
                              <span>{def.name}</span>
                              <span className="text-muted-foreground">({code})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      The primary currency used throughout the application
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locale">Locale</Label>
                    <Input
                      id="locale"
                      value={config.locale}
                      onChange={(e) => updateConfig({ locale: e.target.value })}
                      placeholder="en-ZA"
                    />
                    <p className="text-sm text-muted-foreground">
                      Locale for number and date formatting
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="preview-amount">Test Amount</Label>
                    <Input
                      id="preview-amount"
                      type="number"
                      step="0.01"
                      value={previewAmount}
                      onChange={(e) => setPreviewAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-center">
                      {getCurrencyPreview()}
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Exclusive:</span>
                        <span className="font-mono">
                          {currencyManager.formatCurrency(vatPreview.exclusive, config.primary)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT ({(vatPreview.rate * 100).toFixed(1)}%):</span>
                        <span className="font-mono">
                          {currencyManager.formatCurrency(vatPreview.vat, config.primary)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Inclusive:</span>
                        <span className="font-mono">
                          {currencyManager.formatCurrency(vatPreview.inclusive, config.primary)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Multi-Currency Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Multi-Currency Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Multi-Currency</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow transactions and reporting in multiple currencies
                    </p>
                  </div>
                  <Switch
                    checked={config.enableMultiCurrency}
                    onCheckedChange={(checked) => updateConfig({ enableMultiCurrency: checked })}
                  />
                </div>

                {config.enableMultiCurrency && (
                  <div className="space-y-2">
                    <Label>Supported Currencies</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CURRENCY_DEFINITIONS).map(([code, def]) => (
                        <Badge
                          key={code}
                          variant={config.supportedCurrencies.includes(code) ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => {
                            const isIncluded = config.supportedCurrencies.includes(code)
                            const newCurrencies = isIncluded
                              ? config.supportedCurrencies.filter(c => c !== code)
                              : [...config.supportedCurrencies, code]
                            updateConfig({ supportedCurrencies: newCurrencies })
                          }}
                        >
                          {def.symbol} {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Formatting Settings */}
          <TabsContent value="formatting" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Number Formatting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="decimal-places">Decimal Places</Label>
                      <Input
                        id="decimal-places"
                        type="number"
                        min="0"
                        max="4"
                        value={config.decimalPlaces}
                        onChange={(e) => updateConfig({ decimalPlaces: parseInt(e.target.value) || 2 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="symbol-position">Symbol Position</Label>
                      <Select
                        value={config.position}
                        onValueChange={(value: 'before' | 'after') => updateConfig({ position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before">Before (R 1,000.00)</SelectItem>
                          <SelectItem value="after">After (1,000.00 R)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="thousands-separator">Thousands Separator</Label>
                      <Input
                        id="thousands-separator"
                        value={config.thousandsSeparator}
                        onChange={(e) => updateConfig({ thousandsSeparator: e.target.value })}
                        maxLength={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decimal-separator">Decimal Separator</Label>
                      <Input
                        id="decimal-separator"
                        value={config.decimalSeparator}
                        onChange={(e) => updateConfig({ decimalSeparator: e.target.value })}
                        maxLength={1}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Display Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Show VAT Breakdown</Label>
                      <p className="text-sm text-muted-foreground">
                        Display VAT amounts in invoices and quotes
                      </p>
                    </div>
                    <Switch
                      checked={config.showVATBreakdown}
                      onCheckedChange={(checked) => updateConfig({ showVATBreakdown: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency-symbol">Currency Symbol</Label>
                    <Input
                      id="currency-symbol"
                      value={config.symbol}
                      onChange={(e) => updateConfig({ symbol: e.target.value })}
                      maxLength={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      Symbol displayed with currency amounts
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* VAT Settings */}
          <TabsContent value="vat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  VAT Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                      <Input
                        id="vat-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={config.vatRate * 100}
                        onChange={(e) => updateConfig({ vatRate: parseFloat(e.target.value) / 100 || 0 })}
                      />
                      <p className="text-sm text-muted-foreground">
                        South African standard VAT rate is 15%
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">VAT Information</h4>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p>Current Rate: {(config.vatRate * 100).toFixed(2)}%</p>
                        <p>On R1,000: R{(1000 * config.vatRate).toFixed(2)} VAT</p>
                        <p>Total: R{(1000 * (1 + config.vatRate)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Standard VAT Rates by Region</h4>
                    <div className="space-y-2">
                      {Object.entries(VAT_RATES).map(([currency, info]) => (
                        <div key={currency} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {CURRENCY_DEFINITIONS[currency as keyof typeof CURRENCY_DEFINITIONS]?.symbol}
                            </span>
                            <span className="text-sm">{currency}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{(info.rate * 100).toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">{info.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exchange Rates */}
          <TabsContent value="exchange" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Exchange Rate Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Update Exchange Rates</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically fetch current exchange rates from external services
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label>Current Exchange Rates (to ZAR)</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Currency</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(CURRENCY_DEFINITIONS)
                        .filter(([code]) => code !== 'ZAR')
                        .map(([code, def]) => (
                        <TableRow key={code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{def.symbol}</span>
                              <span>{code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {code === 'USD' && '18.50'}
                            {code === 'EUR' && '20.20'}
                            {code === 'GBP' && '23.10'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            2 hours ago
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">External API</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Rates
                  </Button>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Rate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}