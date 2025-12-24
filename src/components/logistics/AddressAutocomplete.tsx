'use client';

// UPDATE: [2024-12-19] Address autocomplete component with Google Places integration

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import type { Address } from '@/types/logistics';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onAddressChange: (address: Address) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
}

// Create loader instance outside component to avoid re-creation
let loaderInstance: Loader | null = null;

function getLoader() {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places'],
    });
  }
  return loaderInstance;
}

export function AddressAutocomplete({
  value,
  onAddressChange,
  label = 'Address',
  placeholder = 'Start typing an address...',
  required = false,
  className,
  id,
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let isMounted = true;

    const initAutocomplete = async () => {
      if (!inputRef.current || disabled) return;

      try {
        setIsLoading(true);
        const loader = getLoader();
        
        // Load Places library
        await loader.importLibrary('places');

        if (!isMounted || !inputRef.current) return;

        // Create Autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: [
            'formatted_address',
            'address_components',
            'geometry',
            'name',
            'place_id',
          ],
          types: ['address'], // Restrict to addresses only
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.geometry.location) {
            console.warn('No geometry data available for selected place');
            return;
          }

          // Parse address components
          const addressComponents = place.address_components || [];
          const address: Address = {
            formatted: place.formatted_address || value,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          // Extract address components
          addressComponents.forEach((component) => {
            const types = component.types;

            if (types.includes('street_number')) {
              address.street = component.long_name;
            } else if (types.includes('route')) {
              address.street = address.street
                ? `${address.street} ${component.long_name}`
                : component.long_name;
            } else if (types.includes('locality')) {
              address.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              address.province = component.long_name;
            } else if (types.includes('postal_code')) {
              address.postalCode = component.long_name;
            } else if (types.includes('country')) {
              address.country = component.long_name;
            }
          });

          // If street wasn't found, use formatted address
          if (!address.street && address.formatted) {
            address.street = address.formatted;
          }

          // Update parent component
          onAddressChange(address);
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAutocomplete();

    return () => {
      isMounted = false;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [disabled, value, onAddressChange]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id} className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isLoading && <MapPin className="h-4 w-4 text-muted-foreground" />}
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            // Allow manual typing - autocomplete will still work
            const manualAddress: Address = {
              formatted: e.target.value,
              street: e.target.value,
            };
            onAddressChange(manualAddress);
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled || isLoading}
          className={cn(
            'pr-10',
            isLoading && 'opacity-50 cursor-wait'
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {isInitialized && !isLoading && (
        <p className="text-xs text-muted-foreground">
          Start typing to search for addresses
        </p>
      )}
    </div>
  );
}

