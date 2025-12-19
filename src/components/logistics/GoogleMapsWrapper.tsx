'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

interface GoogleMapsWrapperProps {
  children: (map: google.maps.Map | null, isLoaded: boolean) => React.ReactNode;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  onLoad?: (map: google.maps.Map) => void;
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

  useEffect(() => {
    const initMap = async () => {
      setOptions({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'demo-key',
        version: 'weekly',
      });

      try {
        const { Map } = (await importLibrary('maps')) as google.maps.MapsLibrary;

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
          if (onLoad) {
            onLoad(mapInstance);
          }
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setIsLoaded(false);
      }
    };

    initMap();
  }, [center, zoom, onLoad]);

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {children ? children(map, isLoaded) : null}
    </div>
  );
}




