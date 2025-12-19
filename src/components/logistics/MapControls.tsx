'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Maximize, RefreshCw, Download, Settings } from 'lucide-react';

interface MapControlsProps {
  onRefresh?: () => void;
  onFullscreen?: () => void;
  onExport?: () => void;
  onLayerChange?: (layer: string) => void;
  onViewChange?: (view: string) => void;
  isLive?: boolean;
  totalCouriers?: number;
  activeCouriers?: number;
}

export function MapControls({
  onRefresh,
  onFullscreen,
  onExport,
  onLayerChange,
  onViewChange,
  isLive = false,
  totalCouriers = 0,
  activeCouriers = 0,
}: MapControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border-b">
      {/* Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          ></div>
          <Badge variant={isLive ? 'default' : 'secondary'} className="text-xs">
            {isLive ? 'Live GPS' : 'Offline'}
          </Badge>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">{activeCouriers}</span> of {totalCouriers} couriers active
        </div>
      </div>

      {/* Map Controls */}
      <div className="flex items-center gap-2">
        <Select onValueChange={onLayerChange}>
          <SelectTrigger className="w-32">
            <Layers className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="roadmap">Roadmap</SelectItem>
            <SelectItem value="satellite">Satellite</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="terrain">Terrain</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onViewChange}>
          <SelectTrigger className="w-32">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Couriers</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="routes">With Routes</SelectItem>
            <SelectItem value="deliveries">Deliveries</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={onFullscreen}>
          <Maximize className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

