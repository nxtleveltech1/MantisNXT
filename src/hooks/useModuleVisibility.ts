'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import type { ModuleVisibilitySettings } from '@/lib/services/ModuleVisibilityService';

const DEFAULT_SETTINGS: ModuleVisibilitySettings = {
  dashboard: true,
  analytics: true,
  systemHealth: true,
  projectManagement: true,
  suppliers: true,
  productManagement: true,
  customers: true,
  salesServices: true,
  salesChannels: true,
  courierLogistics: true,
  rentals: true,
  repairsWorkshop: true,
  docustore: true,
  aiServices: true,
  financial: true,
  systemIntegration: true,
  administration: true,
  support: true,
  loyalty: true,
  communication: true,
};

export function useModuleVisibility() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ModuleVisibilitySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.orgId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/admin/settings/module-visibility');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSettings(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load module visibility settings:', error);
        // Use default settings on error
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.orgId]);

  return { settings, isLoading };
}

