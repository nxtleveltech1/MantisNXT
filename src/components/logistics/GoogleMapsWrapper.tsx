'use client';

import type React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapsWrapperProps {
  children: (map: google.maps.Map | null, isLoaded: boolean) => React.ReactNode;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  onLoad?: (map: google.maps.Map) => void;
}

// Create loader instance outside component to avoid re-creation
let loaderInstance: Loader | null = null;

function getLoader() {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
    });
  }
  return loaderInstance;
}

export function GoogleMapsWrapper({
  children,
  center = { lat: -26.2041, lng: 28.0473 }, // Default to Johannesburg, SA
  zoom = 12,
  className = 'w-full h-96',
  onLoad,
}: GoogleMapsWrapperProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const onLoadRef = useRef(onLoad);
  
  // Keep onLoad ref up to date
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  const initMap = useCallback(async () => {
    try {
      const loader = getLoader();
      const { Map } = await loader.importLibrary('maps');

      if (mapRef.current) {
        const mapInstance = new Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMap(mapInstance);
        setIsLoaded(true);
        if (onLoadRef.current) {
          onLoadRef.current(mapInstance);
        }
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      setIsLoaded(false);
    }
  }, [center, zoom]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {children ? children(map, isLoaded) : null}
    </div>
  );
}






