'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  MapPin,
  Clock,
  Calendar,
  Building2,
  FileText,
  Save,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
interface RegionalSettings {
  country: string;
  province: string;
  city: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
  locale: string;
  languageCode: string;
  businessHours: {
    start: string;
    end: string;
    workDays: number[];
  };
  publicHolidays: PublicHoliday[];
  addressFormat: string;
  phoneFormat: string;
  postalCodeFormat: string;
}

interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  type: 'fixed' | 'variable';
  description?: string;
}

// South African provinces
const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

// South African public holidays
const SA_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { id: '1', name: "New Year's Day", date: '2024-01-01', type: 'fixed' },
  { id: '2', name: 'Human Rights Day', date: '2024-03-21', type: 'fixed' },
  { id: '3', name: 'Good Friday', date: '2024-03-29', type: 'variable' },
  { id: '4', name: 'Family Day', date: '2024-04-01', type: 'variable' },
  { id: '5', name: 'Freedom Day', date: '2024-04-27', type: 'fixed' },
  { id: '6', name: 'Workers Day', date: '2024-05-01', type: 'fixed' },
  { id: '7', name: 'Youth Day', date: '2024-06-16', type: 'fixed' },
  { id: '8', name: 'National Womens Day', date: '2024-08-09', type: 'fixed' },
  { id: '9', name: 'Heritage Day', date: '2024-09-24', type: 'fixed' },
  { id: '10', name: 'Day of Reconciliation', date: '2024-12-16', type: 'fixed' },
  { id: '11', name: 'Christmas Day', date: '2024-12-25', type: 'fixed' },
  { id: '12', name: 'Day of Goodwill', date: '2024-12-26', type: 'fixed' },
];

// Time zones for South Africa
const SA_TIMEZONES = [{ value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST)' }];

// Date format options
const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'dd MMM yyyy', label: 'DD MMM YYYY (31 Dec 2024)' },
  { value: 'MMMM dd, yyyy', label: 'MMMM DD, YYYY (December 31, 2024)' },
];

// Time format options
const TIME_FORMATS = [
  { value: 'HH:mm', label: '24-hour (14:30)' },
  { value: 'hh:mm a', label: '12-hour (2:30 PM)' },
];

// Default South African settings
const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  country: 'South Africa',
  province: 'Gauteng',
  city: 'Johannesburg',
  timezone: 'Africa/Johannesburg',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  firstDayOfWeek: 1, // Monday
  locale: 'en-ZA',
  languageCode: 'en',
  businessHours: {
    start: '08:00',
    end: '17:00',
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
  },
  publicHolidays: SA_PUBLIC_HOLIDAYS,
  addressFormat: '{street}\n{city}\n{province}\n{postalCode}\n{country}',
  phoneFormat: '+27 {area} {number}',
  postalCodeFormat: '####',
};

export default function RegionalSettingsPage() {
  const [settings, setSettings] = useState<RegionalSettings>(DEFAULT_REGIONAL_SETTINGS);
  const [isModified, setIsModified] = useState(false);
  const [activeTab, setActiveTab] = useState('location');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update settings
  const updateSettings = (updates: Partial<RegionalSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setIsModified(true);
  };

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real application, this would save to database/API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsModified(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings(DEFAULT_REGIONAL_SETTINGS);
    setIsModified(true);
  };

  // Get formatted preview
  const getDatePreview = () => {
    const now = new Date();
    try {
      return now.toLocaleDateString(settings.locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return 'Invalid format';
    }
  };

  const getTimePreview = () => {
    const now = new Date();
    try {
      return now.toLocaleTimeString(settings.locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: settings.timeFormat.includes('a'),
      });
    } catch {
      return 'Invalid format';
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Regional Settings</h1>
            <p className="text-muted-foreground">
              Configure location, timezone, date formats, and local business settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <p className="text-muted-foreground text-sm">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button onClick={saveSettings} disabled={!isModified || isSaving}>
              <Save className="mr-2 h-4 w-4" />
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
                  You have unsaved changes. Click &ldquo;Save Changes&rdquo; to apply your
                  configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="datetime">Date & Time</TabsTrigger>
            <TabsTrigger value="business">Business Hours</TabsTrigger>
            <TabsTrigger value="formatting">Formatting</TabsTrigger>
          </TabsList>

          {/* Location Settings */}
          <TabsContent value="location" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={settings.country}
                      onChange={e => updateSettings({ country: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Select
                      value={settings.province}
                      onValueChange={value => updateSettings({ province: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SA_PROVINCES.map(province => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={settings.city}
                      onChange={e => updateSettings({ city: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Localization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={value => updateSettings({ timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SA_TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locale">Locale</Label>
                    <Input
                      id="locale"
                      value={settings.locale}
                      onChange={e => updateSettings({ locale: e.target.value })}
                      placeholder="en-ZA"
                    />
                    <p className="text-muted-foreground text-sm">
                      Used for number, currency, and date formatting
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language Code</Label>
                    <Input
                      id="language"
                      value={settings.languageCode}
                      onChange={e => updateSettings({ languageCode: e.target.value })}
                      placeholder="en"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Date & Time Settings */}
          <TabsContent value="datetime" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Date & Time Formats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select
                      value={settings.dateFormat}
                      onValueChange={value => updateSettings({ dateFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map(format => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm">Preview: {getDatePreview()}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time-format">Time Format</Label>
                    <Select
                      value={settings.timeFormat}
                      onValueChange={value => updateSettings({ timeFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_FORMATS.map(format => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm">Preview: {getTimePreview()}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="first-day">First Day of Week</Label>
                    <Select
                      value={settings.firstDayOfWeek.toString()}
                      onValueChange={value => updateSettings({ firstDayOfWeek: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Public Holidays
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>South African Public Holidays (2024)</Label>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {settings.publicHolidays.map(holiday => (
                        <div
                          key={holiday.id}
                          className="flex items-center justify-between rounded bg-gray-50 p-2"
                        >
                          <div>
                            <div className="text-sm font-medium">{holiday.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(holiday.date).toLocaleDateString(settings.locale)}
                            </div>
                          </div>
                          <Badge variant={holiday.type === 'fixed' ? 'default' : 'secondary'}>
                            {holiday.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Business Hours */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Business Hours Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={settings.businessHours.start}
                          onChange={e =>
                            updateSettings({
                              businessHours: {
                                ...settings.businessHours,
                                start: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={settings.businessHours.end}
                          onChange={e =>
                            updateSettings({
                              businessHours: {
                                ...settings.businessHours,
                                end: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Work Days</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                          const dayIndex = index === 6 ? 0 : index + 1; // Convert to our format
                          const isSelected = settings.businessHours.workDays.includes(dayIndex);

                          return (
                            <Button
                              key={day}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                const workDays = isSelected
                                  ? settings.businessHours.workDays.filter(d => d !== dayIndex)
                                  : [...settings.businessHours.workDays, dayIndex].sort();

                                updateSettings({
                                  businessHours: {
                                    ...settings.businessHours,
                                    workDays,
                                  },
                                });
                              }}
                            >
                              {day}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h4 className="mb-2 font-medium text-blue-900">Current Schedule</h4>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p>
                          Hours: {settings.businessHours.start} - {settings.businessHours.end}
                        </p>
                        <p>Work Days: {settings.businessHours.workDays.length} days per week</p>
                        <p>Timezone: {settings.timezone.split('/')[1]}</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-green-50 p-4">
                      <h4 className="mb-2 font-medium text-green-900">Business Week</h4>
                      <div className="space-y-1 text-sm text-green-800">
                        {[
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                          'Saturday',
                          'Sunday',
                        ].map((day, index) => {
                          const dayIndex = index === 6 ? 0 : index + 1;
                          const isWorkDay = settings.businessHours.workDays.includes(dayIndex);

                          return (
                            <div key={day} className="flex justify-between">
                              <span>{day}</span>
                              <span className={isWorkDay ? 'text-green-700' : 'text-gray-500'}>
                                {isWorkDay
                                  ? `${settings.businessHours.start} - ${settings.businessHours.end}`
                                  : 'Closed'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Formatting Settings */}
          <TabsContent value="formatting" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Address Formatting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address-format">Address Format Template</Label>
                    <textarea
                      id="address-format"
                      className="h-24 w-full resize-none rounded-md border p-2"
                      value={settings.addressFormat}
                      onChange={e => updateSettings({ addressFormat: e.target.value })}
                      placeholder="{street}&#10;{city}&#10;{province}&#10;{postalCode}&#10;{country}"
                    />
                    <p className="text-muted-foreground text-sm">
                      Use placeholders: {'{street}'}, {'{city}'}, {'{province}'}, {'{postalCode}'},{' '}
                      {'{country}'}
                    </p>
                  </div>

                  <div className="rounded border bg-gray-50 p-3">
                    <Label className="text-sm font-medium">Preview:</Label>
                    <div className="mt-1 text-sm whitespace-pre-line">
                      {settings.addressFormat
                        .replace('{street}', '123 Main Street')
                        .replace('{city}', settings.city)
                        .replace('{province}', settings.province)
                        .replace('{postalCode}', '2000')
                        .replace('{country}', settings.country)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Contact Formatting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone-format">Phone Number Format</Label>
                    <Input
                      id="phone-format"
                      value={settings.phoneFormat}
                      onChange={e => updateSettings({ phoneFormat: e.target.value })}
                      placeholder="+27 {area} {number}"
                    />
                    <p className="text-muted-foreground text-sm">
                      Use placeholders: {'{area}'}, {'{number}'}
                    </p>
                    <div className="text-muted-foreground text-sm">
                      Preview:{' '}
                      {settings.phoneFormat.replace('{area}', '11').replace('{number}', '123 4567')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal-format">Postal Code Format</Label>
                    <Input
                      id="postal-format"
                      value={settings.postalCodeFormat}
                      onChange={e => updateSettings({ postalCodeFormat: e.target.value })}
                      placeholder="####"
                    />
                    <p className="text-muted-foreground text-sm">Use # for digits, A for letters</p>
                    <div className="text-muted-foreground text-sm">
                      Example: {settings.postalCodeFormat.replace(/#/g, '2').replace(/A/g, 'A')}
                    </div>
                  </div>

                  <div className="rounded border bg-green-50 p-3">
                    <Label className="text-sm font-medium text-green-800">
                      South African Standards:
                    </Label>
                    <div className="mt-1 space-y-1 text-sm text-green-700">
                      <div>Phone: +27 11 123 4567</div>
                      <div>Postal Code: 4-digit (2000)</div>
                      <div>ID Number: 13-digit</div>
                      <div>Company Reg: YYYY/NNNNNN/NN</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}
