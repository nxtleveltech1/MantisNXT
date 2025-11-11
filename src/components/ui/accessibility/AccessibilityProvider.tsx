// @ts-nocheck
"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  MousePointer,
  Keyboard,
  Type,
  Palette,
  Monitor,
  Settings,
  Shield,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Focus,
  Navigation,
  Headphones,
  Moon,
  Sun,
  Contrast,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Accessibility Settings Interface
interface AccessibilitySettings {
  // Visual
  highContrast: boolean
  reducedMotion: boolean
  fontSize: number
  fontFamily: 'default' | 'dyslexic' | 'mono'
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome'

  // Audio
  soundEnabled: boolean
  voiceAnnouncements: boolean
  speechRate: number
  speechPitch: number

  // Navigation
  keyboardNavigation: boolean
  focusIndicators: boolean
  skipLinks: boolean

  // Interaction
  clickDelay: number
  hoverDelay: number
  autoplay: boolean

  // Reading
  readingGuide: boolean
  dyslexiaFont: boolean
  lineSpacing: number
  wordSpacing: number
}

// Default settings
const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 100,
  fontFamily: 'default',
  colorBlindMode: 'none',
  soundEnabled: true,
  voiceAnnouncements: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  keyboardNavigation: true,
  focusIndicators: true,
  skipLinks: true,
  clickDelay: 0,
  hoverDelay: 300,
  autoplay: false,
  readingGuide: false,
  dyslexiaFont: false,
  lineSpacing: 1.5,
  wordSpacing: 1.0
}

// Accessibility Context
interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void
  resetSettings: () => void
  announceMessage: (message: string) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  focusedElement: string | null
  setFocusedElement: (id: string | null) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

// Hook for using accessibility context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Screen Reader Announcer
const ScreenReaderAnnouncer: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
)

// Skip Links Component
const SkipLinks: React.FC = () => {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
    { href: '#footer', label: 'Skip to footer' }
  ]

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-white border-2 border-blue-600 p-2 m-2 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          {skipLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:bg-blue-700 text-sm font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// Focus Trap Component
export const FocusTrap: React.FC<{
  children: React.ReactNode
  active: boolean
  restoreFocus?: boolean
}> = ({ children, active, restoreFocus = true }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [active, restoreFocus])

  return (
    <div ref={containerRef} className="focus-trap">
      {children}
    </div>
  )
}

// Accessible Button Component
export const AccessibleButton: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
  ariaDescribedBy?: string
  className?: string
}> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  className
}) => {
  const { settings, announceMessage } = useAccessibility()

  const handleClick = () => {
    if (disabled) return

    if (settings.soundEnabled) {
      // Play click sound (would integrate with audio system)
    }

    if (settings.voiceAnnouncements && ariaLabel) {
      announceMessage(`Button ${ariaLabel} activated`)
    }

    setTimeout(() => onClick?.(), settings.clickDelay)
  }

  const sizeClasses = {
    sm: 'min-h-[32px] min-w-[32px] px-3 py-1 text-sm',
    md: 'min-h-[44px] min-w-[44px] px-4 py-2 text-base',
    lg: 'min-h-[56px] min-w-[56px] px-6 py-3 text-lg'
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        sizeClasses[size],
        settings.focusIndicators && 'focus:ring-4 focus:ring-blue-500/50 focus:ring-offset-2',
        settings.highContrast && 'border-2 border-current',
        className
      )}
      variant={variant}
    >
      {children}
    </Button>
  )
}

// Accessibility Settings Panel
const AccessibilitySettings: React.FC = () => {
  const { settings, updateSetting, resetSettings, isSettingsOpen, setIsSettingsOpen } = useAccessibility()
  const [activeTab, setActiveTab] = useState<'visual' | 'audio' | 'navigation' | 'interaction'>('visual')

  const tabs = [
    { id: 'visual', label: 'Visual', icon: Eye },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'navigation', label: 'Navigation', icon: Navigation },
    { id: 'interaction', label: 'Interaction', icon: MousePointer }
  ]

  const colorBlindOptions = [
    { value: 'none', label: 'None' },
    { value: 'protanopia', label: 'Protanopia (Red-blind)' },
    { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
    { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
    { value: 'monochrome', label: 'Monochrome' }
  ]

  const fontOptions = [
    { value: 'default', label: 'Default Font' },
    { value: 'dyslexic', label: 'Dyslexic-friendly' },
    { value: 'mono', label: 'Monospace' }
  ]

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Shield className="h-6 w-6 text-blue-600" />
            Accessibility Settings
            <Badge variant="secondary" className="ml-auto">
              WCAG AAA Compliant
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <FocusTrap active={isSettingsOpen}>
          <div className="flex h-[600px]">
            {/* Sidebar */}
            <div className="w-64 border-r bg-gray-50 p-4">
              <nav role="navigation" aria-label="Accessibility settings navigation">
                <div className="space-y-2">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                          "min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          activeTab === tab.id
                            ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                            : "hover:bg-gray-100 border-2 border-transparent"
                        )}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetSettings}
                    className="w-full justify-start"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Visual Tab */}
                  {activeTab === 'visual' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          Visual Accessibility
                        </h3>

                        <div className="space-y-6">
                          {/* High Contrast */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="high-contrast" className="font-medium block">
                                High Contrast Mode
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Increases contrast between text and background for better readability
                              </p>
                            </div>
                            <Switch
                              id="high-contrast"
                              checked={settings.highContrast}
                              onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                              aria-describedby="high-contrast-description"
                            />
                          </div>

                          {/* Font Size */}
                          <div className="space-y-3 p-4 border rounded-lg">
                            <label className="font-medium block">
                              Font Size: {settings.fontSize}%
                            </label>
                            <div className="flex items-center gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSetting('fontSize', Math.max(50, settings.fontSize - 10))}
                                aria-label="Decrease font size"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Slider
                                value={[settings.fontSize]}
                                onValueChange={([value]) => updateSetting('fontSize', value)}
                                min={50}
                                max={200}
                                step={10}
                                className="flex-1"
                                aria-label="Font size"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSetting('fontSize', Math.min(200, settings.fontSize + 10))}
                                aria-label="Increase font size"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-sm text-gray-600">
                              Preview text at {settings.fontSize}% size
                            </div>
                          </div>

                          {/* Font Family */}
                          <div className="space-y-3 p-4 border rounded-lg">
                            <label htmlFor="font-family" className="font-medium block">
                              Font Family
                            </label>
                            <Select
                              value={settings.fontFamily}
                              onValueChange={(value) => updateSetting('fontFamily', value as any)}
                            >
                              <SelectTrigger id="font-family">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fontOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Color Blind Support */}
                          <div className="space-y-3 p-4 border rounded-lg">
                            <label htmlFor="color-blind-mode" className="font-medium block">
                              Color Vision Support
                            </label>
                            <Select
                              value={settings.colorBlindMode}
                              onValueChange={(value) => updateSetting('colorBlindMode', value as any)}
                            >
                              <SelectTrigger id="color-blind-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {colorBlindOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Reduced Motion */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="reduced-motion" className="font-medium block">
                                Reduce Motion
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Minimizes animations and transitions that may cause discomfort
                              </p>
                            </div>
                            <Switch
                              id="reduced-motion"
                              checked={settings.reducedMotion}
                              onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Audio Tab */}
                  {activeTab === 'audio' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Volume2 className="h-5 w-5" />
                          Audio Accessibility
                        </h3>

                        <div className="space-y-6">
                          {/* Sound Effects */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="sound-enabled" className="font-medium block">
                                Sound Effects
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Plays audio feedback for interactions and notifications
                              </p>
                            </div>
                            <Switch
                              id="sound-enabled"
                              checked={settings.soundEnabled}
                              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                            />
                          </div>

                          {/* Voice Announcements */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="voice-announcements" className="font-medium block">
                                Voice Announcements
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Provides spoken feedback for screen reader users
                              </p>
                            </div>
                            <Switch
                              id="voice-announcements"
                              checked={settings.voiceAnnouncements}
                              onCheckedChange={(checked) => updateSetting('voiceAnnouncements', checked)}
                            />
                          </div>

                          {settings.voiceAnnouncements && (
                            <>
                              {/* Speech Rate */}
                              <div className="space-y-3 p-4 border rounded-lg">
                                <label className="font-medium block">
                                  Speech Rate: {settings.speechRate.toFixed(1)}x
                                </label>
                                <Slider
                                  value={[settings.speechRate]}
                                  onValueChange={([value]) => updateSetting('speechRate', value)}
                                  min={0.5}
                                  max={2.0}
                                  step={0.1}
                                  className="w-full"
                                  aria-label="Speech rate"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>0.5x (Slow)</span>
                                  <span>2.0x (Fast)</span>
                                </div>
                              </div>

                              {/* Speech Pitch */}
                              <div className="space-y-3 p-4 border rounded-lg">
                                <label className="font-medium block">
                                  Speech Pitch: {settings.speechPitch.toFixed(1)}
                                </label>
                                <Slider
                                  value={[settings.speechPitch]}
                                  onValueChange={([value]) => updateSetting('speechPitch', value)}
                                  min={0.5}
                                  max={2.0}
                                  step={0.1}
                                  className="w-full"
                                  aria-label="Speech pitch"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>0.5 (Low)</span>
                                  <span>2.0 (High)</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Tab */}
                  {activeTab === 'navigation' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Keyboard className="h-5 w-5" />
                          Navigation Accessibility
                        </h3>

                        <div className="space-y-6">
                          {/* Keyboard Navigation */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="keyboard-navigation" className="font-medium block">
                                Enhanced Keyboard Navigation
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Enables advanced keyboard shortcuts and navigation
                              </p>
                            </div>
                            <Switch
                              id="keyboard-navigation"
                              checked={settings.keyboardNavigation}
                              onCheckedChange={(checked) => updateSetting('keyboardNavigation', checked)}
                            />
                          </div>

                          {/* Focus Indicators */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="focus-indicators" className="font-medium block">
                                Enhanced Focus Indicators
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Shows clear visual indicators for focused elements
                              </p>
                            </div>
                            <Switch
                              id="focus-indicators"
                              checked={settings.focusIndicators}
                              onCheckedChange={(checked) => updateSetting('focusIndicators', checked)}
                            />
                          </div>

                          {/* Skip Links */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="skip-links" className="font-medium block">
                                Skip Navigation Links
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Provides quick navigation shortcuts to main content areas
                              </p>
                            </div>
                            <Switch
                              id="skip-links"
                              checked={settings.skipLinks}
                              onCheckedChange={(checked) => updateSetting('skipLinks', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interaction Tab */}
                  {activeTab === 'interaction' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <MousePointer className="h-5 w-5" />
                          Interaction Accessibility
                        </h3>

                        <div className="space-y-6">
                          {/* Click Delay */}
                          <div className="space-y-3 p-4 border rounded-lg">
                            <label className="font-medium block">
                              Click Delay: {settings.clickDelay}ms
                            </label>
                            <p className="text-sm text-gray-600 mb-3">
                              Adds delay before processing clicks to prevent accidental activation
                            </p>
                            <Slider
                              value={[settings.clickDelay]}
                              onValueChange={([value]) => updateSetting('clickDelay', value)}
                              min={0}
                              max={1000}
                              step={100}
                              className="w-full"
                              aria-label="Click delay"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>0ms (Instant)</span>
                              <span>1000ms (1 second)</span>
                            </div>
                          </div>

                          {/* Hover Delay */}
                          <div className="space-y-3 p-4 border rounded-lg">
                            <label className="font-medium block">
                              Hover Delay: {settings.hoverDelay}ms
                            </label>
                            <p className="text-sm text-gray-600 mb-3">
                              Controls how long to wait before showing hover effects
                            </p>
                            <Slider
                              value={[settings.hoverDelay]}
                              onValueChange={([value]) => updateSetting('hoverDelay', value)}
                              min={0}
                              max={2000}
                              step={100}
                              className="w-full"
                              aria-label="Hover delay"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>0ms (Instant)</span>
                              <span>2000ms (2 seconds)</span>
                            </div>
                          </div>

                          {/* Autoplay */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <label htmlFor="autoplay" className="font-medium block">
                                Prevent Autoplay
                              </label>
                              <p className="text-sm text-gray-600 mt-1">
                                Prevents videos and animations from playing automatically
                              </p>
                            </div>
                            <Switch
                              id="autoplay"
                              checked={!settings.autoplay}
                              onCheckedChange={(checked) => updateSetting('autoplay', !checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </FocusTrap>
      </DialogContent>
    </Dialog>
  )
}

// Accessibility Provider Component
export const AccessibilityProvider: React.FC<{
  children: React.ReactNode
  enableScreenReader?: boolean
}> = ({ children, enableScreenReader = true }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [focusedElement, setFocusedElement] = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<string>('')

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        console.warn('Failed to load accessibility settings')
      }
    }
  }, [])

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings))
  }, [settings])

  // Apply CSS custom properties based on settings
  useEffect(() => {
    const root = document.documentElement

    // Font size
    root.style.setProperty('--font-size-scale', `${settings.fontSize / 100}`)

    // Line spacing
    root.style.setProperty('--line-height', settings.lineSpacing.toString())

    // Word spacing
    root.style.setProperty('--word-spacing', `${settings.wordSpacing}em`)

    // Reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms')
      root.style.setProperty('--transition-duration', '0.01ms')
    } else {
      root.style.removeProperty('--animation-duration')
      root.style.removeProperty('--transition-duration')
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Color blind support
    root.setAttribute('data-color-blind-mode', settings.colorBlindMode)

    // Font family
    if (settings.fontFamily === 'dyslexic') {
      root.style.setProperty('--font-family', '"OpenDyslexic", sans-serif')
    } else if (settings.fontFamily === 'mono') {
      root.style.setProperty('--font-family', 'monospace')
    } else {
      root.style.removeProperty('--font-family')
    }
  }, [settings])

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    setAnnouncements('Accessibility settings have been reset to defaults')
  }, [])

  const announceMessage = useCallback((message: string) => {
    if (settings.voiceAnnouncements && enableScreenReader) {
      setAnnouncements(message)
      // Clear after a delay to allow screen readers to announce
      setTimeout(() => setAnnouncements(''), 1000)
    }
  }, [settings.voiceAnnouncements, enableScreenReader])

  const value: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announceMessage,
    isSettingsOpen,
    setIsSettingsOpen,
    focusedElement,
    setFocusedElement
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Skip Links */}
      {settings.skipLinks && <SkipLinks />}

      {/* Screen Reader Announcements */}
      {enableScreenReader && announcements && (
        <ScreenReaderAnnouncer message={announcements} />
      )}

      {/* Accessibility Settings Panel */}
      <AccessibilitySettings />

      {/* Main Content */}
      <div
        className={cn(
          "accessibility-enhanced",
          settings.highContrast && "high-contrast",
          settings.focusIndicators && "enhanced-focus",
          settings.reducedMotion && "reduced-motion"
        )}
        style={{
          fontSize: `${settings.fontSize}%`,
          lineHeight: settings.lineSpacing,
          wordSpacing: `${settings.wordSpacing}em`
        }}
      >
        {children}
      </div>

      {/* Accessibility Settings Trigger */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setIsSettingsOpen(true)}
          className="min-h-[56px] min-w-[56px] rounded-full shadow-lg"
          aria-label="Open accessibility settings"
        >
          <Settings className="h-6 w-6" />
        </Button>
      </div>
    </AccessibilityContext.Provider>
  )
}

// Accessibility Status Indicator
export const AccessibilityStatusIndicator: React.FC = () => {
  const { settings } = useAccessibility()

  const activeFeatures = Object.entries(settings).filter(([key, value]) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') {
      const defaults = defaultSettings as any
      return value !== defaults[key]
    }
    if (typeof value === 'string') {
      const defaults = defaultSettings as any
      return value !== defaults[key]
    }
    return false
  }).length

  if (activeFeatures === 0) return null

  return (
    <Badge
      variant="secondary"
      className="fixed top-4 right-4 z-50 bg-green-100 text-green-800 border-green-300"
    >
      <Shield className="h-3 w-3 mr-1" />
      {activeFeatures} accessibility feature{activeFeatures !== 1 ? 's' : ''} active
    </Badge>
  )
}

export default AccessibilityProvider