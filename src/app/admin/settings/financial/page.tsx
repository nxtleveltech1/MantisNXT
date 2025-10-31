"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Calculator,
  Building2,
  Shield,
  FileText,
  TrendingUp,
  AlertTriangle,
  Users,
  Award,
  Target,
  Save,
  RotateCcw,
  CheckCircle,
  Settings,
  CreditCard,
  Receipt,
  Banknote,
  Calendar
} from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'

interface FinancialSettings {
  vat: {
    enabled: boolean;
    rate: number;
    registrationNumber: string;
    vendorNumber: string;
    threshold: number;
  };
  bee: {
    enabled: boolean;
    level: number;
    certificateNumber: string;
    expiryDate: string;
    scoreElements: {
      ownership: number;
      management: number;
      skillsDevelopment: number;
      enterpriseSupplierDevelopment: number;
      socioEconomicDevelopment: number;
    };
  };
  paymentTerms: {
    standard: number;
    earlyPaymentDiscount: {
      enabled: boolean;
      days: number;
      discountPercentage: number;
    };
    latePaymentPenalty: {
      enabled: boolean;
      days: number;
      penaltyPercentage: number;
    };
  };
  approvalLimits: {
    user: number;
    supervisor: number;
    manager: number;
    director: number;
    board: number;
  };
  budgetControls: {
    enforceApprovals: boolean;
    allowOverspend: boolean;
    overspendThreshold: number;
    requireJustification: boolean;
  };
  compliance: {
    popi: boolean;
    fica: boolean;
    beeCompliance: boolean;
    taxCompliance: boolean;
    auditTrail: boolean;
  };
  fiscalYear: {
    startMonth: number;
    endMonth: number;
    taxYear: string;
  };
}

// BEE Score calculation
const BEE_SCORECARD = {
  ownership: { weight: 25, threshold: [0, 5, 10, 15, 20, 25] },
  management: { weight: 15, threshold: [0, 3, 6, 9, 12, 15] },
  skillsDevelopment: { weight: 20, threshold: [0, 4, 8, 12, 16, 20] },
  enterpriseSupplierDevelopment: { weight: 25, threshold: [0, 5, 10, 15, 20, 25] },
  socioEconomicDevelopment: { weight: 15, threshold: [0, 3, 6, 9, 12, 15] }
};

// Default South African financial settings
const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  vat: {
    enabled: true,
    rate: 0.15, // 15% SA VAT
    registrationNumber: '',
    vendorNumber: '',
    threshold: 1000000 // R1M VAT registration threshold
  },
  bee: {
    enabled: false,
    level: 8,
    certificateNumber: '',
    expiryDate: '',
    scoreElements: {
      ownership: 0,
      management: 0,
      skillsDevelopment: 0,
      enterpriseSupplierDevelopment: 0,
      socioEconomicDevelopment: 0
    }
  },
  paymentTerms: {
    standard: 30, // 30 days
    earlyPaymentDiscount: {
      enabled: false,
      days: 10,
      discountPercentage: 2
    },
    latePaymentPenalty: {
      enabled: true,
      days: 30,
      penaltyPercentage: 2
    }
  },
  approvalLimits: {
    user: 10000,      // R10K
    supervisor: 50000, // R50K
    manager: 250000,   // R250K
    director: 1000000, // R1M
    board: 5000000     // R5M
  },
  budgetControls: {
    enforceApprovals: true,
    allowOverspend: false,
    overspendThreshold: 10, // 10%
    requireJustification: true
  },
  compliance: {
    popi: true,
    fica: true,
    beeCompliance: false,
    taxCompliance: true,
    auditTrail: true
  },
  fiscalYear: {
    startMonth: 3, // March (SA tax year)
    endMonth: 2,   // February
    taxYear: '2024/2025'
  }
};

export default function FinancialSettingsPage() {
  const [settings, setSettings] = useState<FinancialSettings>(DEFAULT_FINANCIAL_SETTINGS)
  const [isModified, setIsModified] = useState(false)
  const [activeTab, setActiveTab] = useState('vat')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Update settings
  const updateSettings = (updates: Partial<FinancialSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    setIsModified(true)
  }

  // Update nested settings
  const updateNestedSettings = (section: keyof FinancialSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }))
    setIsModified(true)
  }

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true)
    try {
      // In a real application, this would save to database/API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsModified(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings(DEFAULT_FINANCIAL_SETTINGS)
    setIsModified(true)
  }

  // Calculate BEE level
  const calculateBEELevel = () => {
    const { scoreElements } = settings.bee
    const totalScore = Object.entries(scoreElements).reduce((sum, [key, value]) => {
      const element = BEE_SCORECARD[key as keyof typeof BEE_SCORECARD]
      return sum + value
    }, 0)

    if (totalScore >= 90) return 1
    if (totalScore >= 75) return 2
    if (totalScore >= 60) return 3
    if (totalScore >= 45) return 4
    if (totalScore >= 40) return 5
    if (totalScore >= 35) return 6
    if (totalScore >= 30) return 7
    return 8
  }

  const beeLevel = calculateBEELevel()
  const totalBEEScore = Object.entries(settings.bee.scoreElements).reduce((sum, [, value]) => sum + value, 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Financial Settings</h1>
            <p className="text-muted-foreground">
              Configure VAT, BEE compliance, payment terms, and financial controls
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
              onClick={saveSettings}
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="vat">VAT</TabsTrigger>
            <TabsTrigger value="bee">BEE</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* VAT Settings */}
          <TabsContent value="vat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    VAT Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>VAT Registered</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable VAT calculations and reporting
                      </p>
                    </div>
                    <Switch
                      checked={settings.vat.enabled}
                      onCheckedChange={(checked) => updateNestedSettings('vat', { enabled: checked })}
                    />
                  </div>

                  {settings.vat.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                        <Input
                          id="vat-rate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={settings.vat.rate * 100}
                          onChange={(e) => updateNestedSettings('vat', { rate: parseFloat(e.target.value) / 100 || 0 })}
                        />
                        <p className="text-sm text-muted-foreground">
                          South African standard VAT rate is 15%
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vat-reg">VAT Registration Number</Label>
                        <Input
                          id="vat-reg"
                          value={settings.vat.registrationNumber}
                          onChange={(e) => updateNestedSettings('vat', { registrationNumber: e.target.value })}
                          placeholder="4123456789"
                        />
                        <p className="text-sm text-muted-foreground">
                          10-digit VAT registration number starting with 4
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor-number">VAT Vendor Number</Label>
                        <Input
                          id="vendor-number"
                          value={settings.vat.vendorNumber}
                          onChange={(e) => updateNestedSettings('vat', { vendorNumber: e.target.value })}
                          placeholder="VAT vendor number"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    VAT Thresholds & Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vat-threshold">Registration Threshold (ZAR)</Label>
                    <Input
                      id="vat-threshold"
                      type="number"
                      value={settings.vat.threshold}
                      onChange={(e) => updateNestedSettings('vat', { threshold: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Current SA threshold: R1,000,000 per 12 months
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">VAT Information</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Current Rate: {(settings.vat.rate * 100).toFixed(2)}%</p>
                      <p>Status: {settings.vat.enabled ? 'VAT Registered' : 'Non-VAT'}</p>
                      <p>Threshold: R{settings.vat.threshold.toLocaleString()}</p>
                      {settings.vat.registrationNumber && (
                        <p>Reg Number: {settings.vat.registrationNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">VAT Calculation Example</h4>
                    <div className="space-y-1 text-sm text-green-800">
                      <div className="flex justify-between">
                        <span>Amount (exclusive):</span>
                        <span>R1,000.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT ({(settings.vat.rate * 100).toFixed(1)}%):</span>
                        <span>R{(1000 * settings.vat.rate).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total (inclusive):</span>
                        <span>R{(1000 * (1 + settings.vat.rate)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BEE Settings */}
          <TabsContent value="bee" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    BEE Status & Certificate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>BEE Compliant</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable BEE scorecard tracking
                      </p>
                    </div>
                    <Switch
                      checked={settings.bee.enabled}
                      onCheckedChange={(checked) => updateNestedSettings('bee', { enabled: checked })}
                    />
                  </div>

                  {settings.bee.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bee-cert">Certificate Number</Label>
                        <Input
                          id="bee-cert"
                          value={settings.bee.certificateNumber}
                          onChange={(e) => updateNestedSettings('bee', { certificateNumber: e.target.value })}
                          placeholder="BEE certificate number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bee-expiry">Certificate Expiry</Label>
                        <Input
                          id="bee-expiry"
                          type="date"
                          value={settings.bee.expiryDate}
                          onChange={(e) => updateNestedSettings('bee', { expiryDate: e.target.value })}
                        />
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-green-900">Current BEE Level</h4>
                          <Badge variant={beeLevel <= 4 ? "default" : "secondary"}>
                            Level {beeLevel}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-green-800">
                          <p>Total Score: {totalBEEScore}/100</p>
                          <Progress value={totalBEEScore} className="h-2" />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {settings.bee.enabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      BEE Scorecard Elements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(BEE_SCORECARD).map(([key, config]) => {
                      const currentScore = settings.bee.scoreElements[key as keyof typeof settings.bee.scoreElements]
                      const percentage = (currentScore / config.weight) * 100

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="capitalize text-sm">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </Label>
                            <span className="text-sm text-muted-foreground">
                              {currentScore}/{config.weight}
                            </span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={config.weight}
                            step="0.1"
                            value={currentScore}
                            onChange={(e) => {
                              const value = Math.min(config.weight, Math.max(0, parseFloat(e.target.value) || 0))
                              updateNestedSettings('bee', {
                                scoreElements: {
                                  ...settings.bee.scoreElements,
                                  [key]: value
                                }
                              })
                            }}
                          />
                          <Progress value={percentage} className="h-1" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Payment Terms */}
          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="standard-terms">Standard Payment Terms (Days)</Label>
                    <Input
                      id="standard-terms"
                      type="number"
                      min="0"
                      max="365"
                      value={settings.paymentTerms.standard}
                      onChange={(e) => updateNestedSettings('paymentTerms', { standard: parseInt(e.target.value) || 30 })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Default payment terms for new suppliers
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Early Payment Discount</Label>
                        <p className="text-sm text-muted-foreground">
                          Offer discount for early payment
                        </p>
                      </div>
                      <Switch
                        checked={settings.paymentTerms.earlyPaymentDiscount.enabled}
                        onCheckedChange={(checked) => updateNestedSettings('paymentTerms', {
                          earlyPaymentDiscount: { ...settings.paymentTerms.earlyPaymentDiscount, enabled: checked }
                        })}
                      />
                    </div>

                    {settings.paymentTerms.earlyPaymentDiscount.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="early-days">Payment Days</Label>
                          <Input
                            id="early-days"
                            type="number"
                            min="1"
                            max="30"
                            value={settings.paymentTerms.earlyPaymentDiscount.days}
                            onChange={(e) => updateNestedSettings('paymentTerms', {
                              earlyPaymentDiscount: {
                                ...settings.paymentTerms.earlyPaymentDiscount,
                                days: parseInt(e.target.value) || 10
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="early-discount">Discount (%)</Label>
                          <Input
                            id="early-discount"
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={settings.paymentTerms.earlyPaymentDiscount.discountPercentage}
                            onChange={(e) => updateNestedSettings('paymentTerms', {
                              earlyPaymentDiscount: {
                                ...settings.paymentTerms.earlyPaymentDiscount,
                                discountPercentage: parseFloat(e.target.value) || 2
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Late Payment Penalty</Label>
                        <p className="text-sm text-muted-foreground">
                          Charge penalty for late payments
                        </p>
                      </div>
                      <Switch
                        checked={settings.paymentTerms.latePaymentPenalty.enabled}
                        onCheckedChange={(checked) => updateNestedSettings('paymentTerms', {
                          latePaymentPenalty: { ...settings.paymentTerms.latePaymentPenalty, enabled: checked }
                        })}
                      />
                    </div>

                    {settings.paymentTerms.latePaymentPenalty.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="late-days">Grace Period (Days)</Label>
                          <Input
                            id="late-days"
                            type="number"
                            min="0"
                            max="90"
                            value={settings.paymentTerms.latePaymentPenalty.days}
                            onChange={(e) => updateNestedSettings('paymentTerms', {
                              latePaymentPenalty: {
                                ...settings.paymentTerms.latePaymentPenalty,
                                days: parseInt(e.target.value) || 30
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="late-penalty">Penalty (%)</Label>
                          <Input
                            id="late-penalty"
                            type="number"
                            min="0"
                            max="20"
                            step="0.1"
                            value={settings.paymentTerms.latePaymentPenalty.penaltyPercentage}
                            onChange={(e) => updateNestedSettings('paymentTerms', {
                              latePaymentPenalty: {
                                ...settings.paymentTerms.latePaymentPenalty,
                                penaltyPercentage: parseFloat(e.target.value) || 2
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment Terms Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Payment Schedule</h4>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex justify-between">
                        <span>Standard Terms:</span>
                        <span>{settings.paymentTerms.standard} days</span>
                      </div>

                      {settings.paymentTerms.earlyPaymentDiscount.enabled && (
                        <div className="flex justify-between">
                          <span>Early Payment:</span>
                          <span>
                            {settings.paymentTerms.earlyPaymentDiscount.days} days
                            ({settings.paymentTerms.earlyPaymentDiscount.discountPercentage}% discount)
                          </span>
                        </div>
                      )}

                      {settings.paymentTerms.latePaymentPenalty.enabled && (
                        <div className="flex justify-between">
                          <span>Late Payment:</span>
                          <span>
                            After {settings.paymentTerms.latePaymentPenalty.days} days
                            ({settings.paymentTerms.latePaymentPenalty.penaltyPercentage}% penalty)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">Example: R10,000 Invoice</h4>
                    <div className="space-y-2 text-sm text-green-800">
                      {settings.paymentTerms.earlyPaymentDiscount.enabled && (
                        <div className="flex justify-between">
                          <span>Early ({settings.paymentTerms.earlyPaymentDiscount.days} days):</span>
                          <span>R{(10000 * (1 - settings.paymentTerms.earlyPaymentDiscount.discountPercentage / 100)).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-medium">
                        <span>Standard ({settings.paymentTerms.standard} days):</span>
                        <span>R10,000.00</span>
                      </div>

                      {settings.paymentTerms.latePaymentPenalty.enabled && (
                        <div className="flex justify-between">
                          <span>Late (after {settings.paymentTerms.latePaymentPenalty.days} days):</span>
                          <span>R{(10000 * (1 + settings.paymentTerms.latePaymentPenalty.penaltyPercentage / 100)).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Approval Limits */}
          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Approval Hierarchy & Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Approval Limits (ZAR)</h4>

                    {Object.entries(settings.approvalLimits).map(([role, limit]) => (
                      <div key={role} className="space-y-2">
                        <Label htmlFor={role} className="capitalize">
                          {role.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <Input
                          id={role}
                          type="number"
                          value={limit}
                          onChange={(e) => updateNestedSettings('approvalLimits', {
                            [role]: parseFloat(e.target.value) || 0
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Current: R{limit.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Budget Controls</h4>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Enforce Approvals</Label>
                        <p className="text-sm text-muted-foreground">
                          Require approval workflow for purchases
                        </p>
                      </div>
                      <Switch
                        checked={settings.budgetControls.enforceApprovals}
                        onCheckedChange={(checked) => updateNestedSettings('budgetControls', { enforceApprovals: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Allow Overspend</Label>
                        <p className="text-sm text-muted-foreground">
                          Permit spending above budget limits
                        </p>
                      </div>
                      <Switch
                        checked={settings.budgetControls.allowOverspend}
                        onCheckedChange={(checked) => updateNestedSettings('budgetControls', { allowOverspend: checked })}
                      />
                    </div>

                    {settings.budgetControls.allowOverspend && (
                      <div className="space-y-2">
                        <Label htmlFor="overspend-threshold">Overspend Threshold (%)</Label>
                        <Input
                          id="overspend-threshold"
                          type="number"
                          min="0"
                          max="100"
                          value={settings.budgetControls.overspendThreshold}
                          onChange={(e) => updateNestedSettings('budgetControls', {
                            overspendThreshold: parseFloat(e.target.value) || 10
                          })}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Require Justification</Label>
                        <p className="text-sm text-muted-foreground">
                          Mandate reason for high-value purchases
                        </p>
                      </div>
                      <Switch
                        checked={settings.budgetControls.requireJustification}
                        onCheckedChange={(checked) => updateNestedSettings('budgetControls', { requireJustification: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Approval Flow Visualization</h4>
                  <div className="space-y-2">
                    {Object.entries(settings.approvalLimits)
                      .sort(([, a], [, b]) => a - b)
                      .map(([role, limit], index, arr) => (
                      <div key={role} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="capitalize font-medium">
                            {role.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">R{limit.toLocaleString()}</div>
                          {index < arr.length - 1 && (
                            <div className="text-xs text-muted-foreground">
                              Up to R{arr[index + 1][1].toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Regulatory Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.compliance).map(([key, enabled]) => {
                    const labels = {
                      popi: 'POPI Act Compliance',
                      fica: 'FICA Compliance',
                      beeCompliance: 'BEE Compliance Tracking',
                      taxCompliance: 'Tax Compliance Monitoring',
                      auditTrail: 'Full Audit Trail'
                    }

                    const descriptions = {
                      popi: 'Protection of Personal Information Act compliance',
                      fica: 'Financial Intelligence Centre Act requirements',
                      beeCompliance: 'Broad-Based Black Economic Empowerment tracking',
                      taxCompliance: 'VAT and tax compliance monitoring',
                      auditTrail: 'Comprehensive audit logging and trail'
                    }

                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>{labels[key as keyof typeof labels]}</Label>
                          <p className="text-sm text-muted-foreground">
                            {descriptions[key as keyof typeof descriptions]}
                          </p>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => updateNestedSettings('compliance', { [key]: checked })}
                        />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Fiscal Year Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-year">Tax Year</Label>
                    <Input
                      id="tax-year"
                      value={settings.fiscalYear.taxYear}
                      onChange={(e) => updateNestedSettings('fiscalYear', { taxYear: e.target.value })}
                      placeholder="2024/2025"
                    />
                    <p className="text-sm text-muted-foreground">
                      South African tax year format
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-month">Start Month</Label>
                      <Select
                        value={settings.fiscalYear.startMonth.toString()}
                        onValueChange={(value) => updateNestedSettings('fiscalYear', { startMonth: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2024, i).toLocaleDateString('en-ZA', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-month">End Month</Label>
                      <Select
                        value={settings.fiscalYear.endMonth.toString()}
                        onValueChange={(value) => updateNestedSettings('fiscalYear', { endMonth: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2024, i).toLocaleDateString('en-ZA', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">South African Tax Year</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Standard: 1 March - 28/29 February</p>
                      <p>Current: {settings.fiscalYear.taxYear}</p>
                      <p>
                        Your Year: {new Date(2024, settings.fiscalYear.startMonth - 1).toLocaleDateString('en-ZA', { month: 'long' })} - {new Date(2024, settings.fiscalYear.endMonth - 1).toLocaleDateString('en-ZA', { month: 'long' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(settings.compliance).map(([key, enabled]) => {
                    const labels = {
                      popi: 'POPI',
                      fica: 'FICA',
                      beeCompliance: 'BEE',
                      taxCompliance: 'Tax',
                      auditTrail: 'Audit'
                    }

                    return (
                      <div key={key} className="text-center">
                        <div className={`p-3 rounded-lg ${enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
                          <div className="text-sm font-medium">{labels[key as keyof typeof labels]}</div>
                          <div className={`text-xs ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}