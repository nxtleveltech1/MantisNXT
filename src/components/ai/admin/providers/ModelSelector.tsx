"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Search, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PROVIDER_CONFIGS, getProviderModels, getDefaultModel } from '@/lib/ai/provider-configs';

interface ModelSelectorProps {
  providerId: string;
  value: string;
  onChange: (model: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ModelSelector({
  providerId,
  value,
  onChange,
  label = 'Model',
  required = false,
  placeholder = 'Select or type a model',
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Static models from config (fallback)
  const staticModels = useMemo(() => {
    return getProviderModels(providerId);
  }, [providerId]);

  // Fetch models dynamically for OpenRouter
  useEffect(() => {
    if (providerId !== 'openrouter') {
      setDynamicModels([]);
      setIsLoading(false);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    const fetchOpenRouterModels = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await fetch('/api/v1/ai/providers/openrouter/models');
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const result = await response.json();
        if (!cancelled) {
          if (result.data && Array.isArray(result.data)) {
            setDynamicModels(result.data);
          } else {
            setFetchError('Invalid response format');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to fetch models');
          console.error('Failed to fetch OpenRouter models:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchOpenRouterModels();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  // Use dynamic models for OpenRouter if available, else fallback to static
  const models = useMemo(() => {
    if (providerId === 'openrouter' && dynamicModels.length > 0) {
      return dynamicModels;
    }
    return staticModels;
  }, [providerId, dynamicModels, staticModels]);

  const defaultModel = useMemo(() => {
    return getDefaultModel(providerId);
  }, [providerId]);

  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    const query = searchQuery.toLowerCase();
    return models.filter(model => model.toLowerCase().includes(query));
  }, [models, searchQuery]);

  const providerConfig = PROVIDER_CONFIGS[providerId];
  const hasModels = models.length > 0;

  // If provider has no pre-defined models, show a text input
  if (!hasModels) {
    return (
      <div className="space-y-2">
        {label && (
          <Label>
            {label}
            {required && ' *'}
          </Label>
        )}
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && ' *'}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled || isLoading}
          >
            <span className="truncate">
              {isLoading ? 'Loading models...' : (value || defaultModel || placeholder)}
            </span>
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading {providerId === 'openrouter' ? '400+' : ''} models...</span>
                </div>
              ) : fetchError && providerId === 'openrouter' ? (
                <div className="py-4 text-center text-sm">
                  <p className="text-destructive mb-2">Failed to load dynamic models</p>
                  <p className="text-muted-foreground text-xs">Using cached model list ({staticModels.length} models)</p>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No models found.
                </div>
              ) : (
                filteredModels.map((model) => (
                  <div
                    key={model}
                    className={`flex items-center justify-between rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      value === model ? 'bg-accent' : ''
                    }`}
                    onClick={() => {
                      onChange(model);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <span className="truncate">{model}</span>
                    {value === model && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                    {model === defaultModel && value !== model && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (default)
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {/* Allow custom model input */}
          <div className="border-t p-2">
            <div className="text-xs text-muted-foreground mb-2">
              Or enter a custom model:
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Custom model name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onChange(searchQuery.trim());
                    setOpen(false);
                    setSearchQuery('');
                  }
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (searchQuery.trim()) {
                    onChange(searchQuery.trim());
                    setOpen(false);
                    setSearchQuery('');
                  }
                }}
                disabled={!searchQuery.trim()}
              >
                Use
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {providerConfig?.description && (
        <p className="text-xs text-muted-foreground">
          {providerConfig.description}
        </p>
      )}
      {providerId === 'openrouter' && !isLoading && !fetchError && dynamicModels.length > 0 && (
        <p className="text-xs text-emerald-600">
          ✓ {dynamicModels.length} models loaded from OpenRouter API
        </p>
      )}
    </div>
  );
}

export default ModelSelector;