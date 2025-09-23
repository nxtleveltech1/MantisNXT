"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Globe,
  Clock,
  DollarSign,
  Calendar,
  Save,
  Undo2,
  CheckCircle,
  AlertTriangle,
  Languages,
  MapPin
} from "lucide-react"

interface LocalizationSettings {
  language: string
  country: string
  timezone: string
  dateFormat: string
  timeFormat: string
  currency: string
  numberFormat: string
  firstDayOfWeek: string
  rtlSupport: boolean
}

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
  { code: 'st', name: 'Sotho', native: 'Sesotho' },
  { code: 'tn', name: 'Tswana', native: 'Setswana' },
  { code: 'ss', name: 'Swati', native: 'siSwati' },
  { code: 've', name: 'Venda', native: 'Tshivenda' },
  { code: 'ts', name: 'Tsonga', native: 'Xitsonga' },
  { code: 'nr', name: 'Ndebele', native: 'isiNdebele' },
  { code: 'nso', name: 'Northern Sotho', native: 'Sepedi' }
]

const timezones = [
  'Africa/Johannesburg',
  'Africa/Cape_Town',
  'Africa/Blantyre',
  'Africa/Gaborone',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Windhoek'
]

const dateFormats = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2023)', example: '31/12/2023' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2023)', example: '12/31/2023' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2023-12-31)', example: '2023-12-31' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2023)', example: '31-12-2023' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2023)', example: '31.12.2023' }
]

const timeFormats = [
  { value: '24', label: '24-hour (23:59)', example: '14:30' },
  { value: '12', label: '12-hour (11:59 PM)', example: '2:30 PM' }
]

const numberFormats = [
  { value: 'en-ZA', label: 'South African (1,234.56)', example: '1,234.56' },
  { value: 'en-US', label: 'US (1,234.56)', example: '1,234.56' },
  { value: 'en-GB', label: 'UK (1,234.56)', example: '1,234.56' },
  { value: 'de-DE', label: 'German (1.234,56)', example: '1.234,56' },
  { value: 'fr-FR', label: 'French (1 234,56)', example: '1 234,56' }
]

export default function LocalizationPage() {
  const [settings, setSettings] = useState<LocalizationSettings>({
    language: 'en',
    country: 'ZA',
    timezone: 'Africa/Johannesburg',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24',
    currency: 'ZAR',
    numberFormat: 'en-ZA',
    firstDayOfWeek: 'monday',
    rtlSupport: false
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleInputChange = (field: keyof LocalizationSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }))
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

  const handleReset = () => {
    setSettings({
      language: 'en',
      country: 'ZA',
      timezone: 'Africa/Johannesburg',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24',
      currency: 'ZAR',
      numberFormat: 'en-ZA',
      firstDayOfWeek: 'monday',
      rtlSupport: false
    })
    setHasChanges(false)
  }

  const getCurrentTime = () => {
    const now = new Date()
    const timeZone = settings.timezone

    if (settings.timeFormat === '12') {
      return now.toLocaleTimeString('en-US', {
        timeZone,
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
      })
    }

    return now.toLocaleTimeString('en-GB', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCurrentDate = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()

    switch (settings.dateFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`
      default:
        return `${day}/${month}/${year}`
    }
  }

  const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat(settings.numberFormat, {
      style: 'currency',
      currency: settings.currency,
    })
    return formatter.format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Localization Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure language, timezone, and regional preferences
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
            Localization settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Language & Region */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Language & Region
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.name}</span>
                          <span className="text-sm text-gray-500">({lang.native})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace('Africa/', '').replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Current time: {getCurrentTime()}
                </p>
              </div>
            </div>

            <Separator />

            {/* Date & Time Formats */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date & Time Formats
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => handleInputChange('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Preview: {getCurrentDate()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select
                    value={settings.timeFormat}
                    onValueChange={(value) => handleInputChange('timeFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Preview: {getCurrentTime()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>First Day of Week</Label>
                <Select
                  value={settings.firstDayOfWeek}
                  onValueChange={(value) => handleInputChange('firstDayOfWeek', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Currency & Numbers */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Currency & Number Formats
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="BWP">BWP - Botswana Pula</SelectItem>
                      <SelectItem value="NAD">NAD - Namibian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Preview: {formatCurrency(1234.56)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Number Format</Label>
                  <Select
                    value={settings.numberFormat}
                    onValueChange={(value) => handleInputChange('numberFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numberFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {settings.timezone.replace('Africa/', '').replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{getCurrentTime()}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{getCurrentDate()}</span>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{formatCurrency(1234.56)}</span>
              </div>
            </div>

            <Separator />

            {/* Sample Data */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Sample Purchase Order</h4>
              <div className="text-sm space-y-1">
                <p><strong>Date:</strong> {getCurrentDate()}</p>
                <p><strong>Time:</strong> {getCurrentTime()}</p>
                <p><strong>Amount:</strong> {formatCurrency(15750.25)}</p>
                <p><strong>Quantity:</strong> {(1250).toLocaleString(settings.numberFormat)}</p>
              </div>
            </div>

            <Separator />

            {/* Language Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Language</h4>
              <div className="text-sm text-gray-600">
                {languages.find(l => l.code === settings.language)?.name}
                ({languages.find(l => l.code === settings.language)?.native})
              </div>
              <Badge variant="outline" className="text-xs">
                {settings.language.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}