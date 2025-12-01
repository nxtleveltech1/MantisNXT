'use client';

import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface FilterValue {
  segment?: string[];
  status?: string[];
  lifetimeValueMin?: number;
  lifetimeValueMax?: number;
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  lastInteractionFrom?: string;
  lastInteractionTo?: string;
}

interface FilterPanelProps {
  filters: FilterValue;
  onFiltersChange: (filters: FilterValue) => void;
  onClearFilters: () => void;
}

const SEGMENT_OPTIONS = [
  { value: 'individual', label: 'Individual', color: 'bg-gray-100 text-gray-800' },
  { value: 'startup', label: 'Startup', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'smb', label: 'SMB', color: 'bg-green-100 text-green-800' },
  { value: 'mid_market', label: 'Mid Market', color: 'bg-blue-100 text-blue-800' },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-purple-100 text-purple-800' },
];

const STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospect', color: 'bg-blue-100 text-blue-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'churned', label: 'Churned', color: 'bg-red-100 text-red-800' },
];

/**
 * FilterPanel Component
 *
 * Advanced filtering panel for customer data
 * Features:
 * - Multiple filter types (segment, status, value ranges, dates)
 * - Collapsible panel
 * - Active filter badges
 * - Clear all filters
 */
export function FilterPanel({ filters, onFiltersChange, onClearFilters }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterValue, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleSegment = (segment: string) => {
    const currentSegments = filters.segment || [];
    const newSegments = currentSegments.includes(segment)
      ? currentSegments.filter(s => s !== segment)
      : [...currentSegments, segment];
    updateFilter('segment', newSegments.length > 0 ? newSegments : undefined);
  };

  const toggleStatus = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    updateFilter('status', newStatuses.length > 0 ? newStatuses : undefined);
  };

  const activeFilterCount = Object.values(filters).filter(
    v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                onClearFilters();
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear all
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6 border-t border-gray-200 p-4 pt-0">
          {/* Segment Filter */}
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Segment</p>
            <div className="flex flex-wrap gap-2">
              {SEGMENT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleSegment(option.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    filters.segment?.includes(option.value)
                      ? option.color + ' ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleStatus(option.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    filters.status?.includes(option.value)
                      ? option.color + ' ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lifetime Value Range */}
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Lifetime Value</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="Min ($)"
                  value={filters.lifetimeValueMin || ''}
                  onChange={e =>
                    updateFilter(
                      'lifetimeValueMin',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max ($)"
                  value={filters.lifetimeValueMax || ''}
                  onChange={e =>
                    updateFilter(
                      'lifetimeValueMax',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Acquisition Date Range */}
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Acquisition Date</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={filters.acquisitionDateFrom || ''}
                  onChange={e => updateFilter('acquisitionDateFrom', e.target.value || undefined)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={filters.acquisitionDateTo || ''}
                  onChange={e => updateFilter('acquisitionDateTo', e.target.value || undefined)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Last Interaction Date Range */}
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Last Interaction</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={filters.lastInteractionFrom || ''}
                  onChange={e => updateFilter('lastInteractionFrom', e.target.value || undefined)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={filters.lastInteractionTo || ''}
                  onChange={e => updateFilter('lastInteractionTo', e.target.value || undefined)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
