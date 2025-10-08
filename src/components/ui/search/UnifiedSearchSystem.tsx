'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SortAsc, SortDesc, X, Tag, Calendar, Hash, DollarSign, Package, User, Building2, Eye, EyeOff } from 'lucide-react';
import { designTokens } from '../design-system';

// Search Interfaces
export interface SearchableField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'enum' | 'tags';
  icon?: React.ComponentType<any>;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  options?: { value: string; label: string }[];
  format?: (value: any) => string;
  weight?: number; // For search relevance scoring
}

export interface SearchConfig {
  fields: SearchableField[];
  enableFuzzySearch?: boolean;
  enableSemanticSearch?: boolean;
  defaultSort?: string;
  defaultSortDirection?: 'asc' | 'desc';
  maxResults?: number;
  debounceMs?: number;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in' | 'not_in';
  value: any;
  values?: any[]; // For 'between', 'in', 'not_in' operators
  active: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilter[];
  sortField?: string;
  sortDirection: 'asc' | 'desc';
  activeFields: string[];
  savedSearches: SavedSearch[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  sortField?: string;
  sortDirection: 'asc' | 'desc';
  createdAt: Date;
  usageCount: number;
}

export interface SearchResult<T = any> {
  item: T;
  score: number;
  matches: {
    field: string;
    value: string;
    positions: number[];
  }[];
}

// Advanced Search Engine
class AdvancedSearchEngine<T = any> {
  private config: SearchConfig;
  private indexCache = new Map<string, any>();

  constructor(config: SearchConfig) {
    this.config = config;
  }

  search(data: T[], state: SearchState): SearchResult<T>[] {
    let results = data.map(item => ({ item, score: 0, matches: [] as any[] }));

    // Apply text search
    if (state.query.trim()) {
      results = this.performTextSearch(results, state.query, state.activeFields);
    }

    // Apply filters
    results = this.applyFilters(results, state.filters);

    // Sort results
    results = this.sortResults(results, state.sortField, state.sortDirection);

    // Limit results
    if (this.config.maxResults) {
      results = results.slice(0, this.config.maxResults);
    }

    return results;
  }

  private performTextSearch(results: SearchResult<T>[], query: string, activeFields: string[]): SearchResult<T>[] {
    const searchFields = this.config.fields.filter(f =>
      f.searchable !== false && (activeFields.length === 0 || activeFields.includes(f.key))
    );

    return results.map(result => {
      let totalScore = 0;
      const matches: any[] = [];

      searchFields.forEach(field => {
        const value = this.getFieldValue(result.item, field.key);
        if (value == null) return;

        const stringValue = String(value).toLowerCase();
        const queryLower = query.toLowerCase();

        let fieldScore = 0;
        const positions: number[] = [];

        // Exact match (highest score)
        if (stringValue === queryLower) {
          fieldScore = 100 * (field.weight || 1);
          positions.push(0);
        }
        // Starts with query
        else if (stringValue.startsWith(queryLower)) {
          fieldScore = 80 * (field.weight || 1);
          positions.push(0);
        }
        // Contains query
        else if (stringValue.includes(queryLower)) {
          fieldScore = 60 * (field.weight || 1);
          const index = stringValue.indexOf(queryLower);
          positions.push(index);
        }
        // Fuzzy search if enabled
        else if (this.config.enableFuzzySearch) {
          const fuzzyScore = this.calculateFuzzyScore(queryLower, stringValue);
          if (fuzzyScore > 0.3) {
            fieldScore = fuzzyScore * 40 * (field.weight || 1);
          }
        }

        if (fieldScore > 0) {
          totalScore += fieldScore;
          matches.push({
            field: field.key,
            value: stringValue,
            positions
          });
        }
      });

      return {
        ...result,
        score: totalScore,
        matches
      };
    }).filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private calculateFuzzyScore(query: string, text: string): number {
    if (query.length === 0) return 1;
    if (text.length === 0) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= text.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= query.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= text.length; i++) {
      for (let j = 1; j <= query.length; j++) {
        if (text[i - 1] === query[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    const distance = matrix[text.length][query.length];
    return 1 - distance / Math.max(query.length, text.length);
  }

  private applyFilters(results: SearchResult<T>[], filters: SearchFilter[]): SearchResult<T>[] {
    const activeFilters = filters.filter(f => f.active);
    if (activeFilters.length === 0) return results;

    return results.filter(result => {
      return activeFilters.every(filter => {
        const value = this.getFieldValue(result.item, filter.field);
        return this.evaluateFilter(value, filter);
      });
    });
  }

  private evaluateFilter(value: any, filter: SearchFilter): boolean {
    const { operator, value: filterValue, values } = filter;

    switch (operator) {
      case 'equals':
        return value === filterValue;
      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'gt':
        return Number(value) > Number(filterValue);
      case 'lt':
        return Number(value) < Number(filterValue);
      case 'gte':
        return Number(value) >= Number(filterValue);
      case 'lte':
        return Number(value) <= Number(filterValue);
      case 'between':
        if (!values || values.length !== 2) return false;
        return Number(value) >= Number(values[0]) && Number(value) <= Number(values[1]);
      case 'in':
        return values?.includes(value) || false;
      case 'not_in':
        return !values?.includes(value) || true;
      default:
        return true;
    }
  }

  private sortResults(results: SearchResult<T>[], sortField?: string, direction: 'asc' | 'desc' = 'asc'): SearchResult<T>[] {
    if (!sortField) {
      return results.sort((a, b) => b.score - a.score); // Sort by relevance score
    }

    return results.sort((a, b) => {
      const aValue = this.getFieldValue(a.item, sortField);
      const bValue = this.getFieldValue(b.item, sortField);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? 1 : -1;
      if (bValue == null) return direction === 'asc' ? -1 : 1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }

  private getFieldValue(item: any, fieldKey: string): any {
    const keys = fieldKey.split('.');
    let value = item;
    for (const key of keys) {
      if (value == null) return null;
      value = value[key];
    }
    return value;
  }
}

// Search Components
export interface UnifiedSearchProps {
  config: SearchConfig;
  onSearch: (results: any[], state: SearchState) => void;
  data: any[];
  initialState?: Partial<SearchState>;
  className?: string;
  placeholder?: string;
  showFieldSelector?: boolean;
  showFilters?: boolean;
  showSavedSearches?: boolean;
  enableVoiceSearch?: boolean;
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  config,
  onSearch,
  data,
  initialState = {},
  className = '',
  placeholder = 'Search...',
  showFieldSelector = true,
  showFilters = true,
  showSavedSearches = true,
  enableVoiceSearch = false
}) => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: [],
    sortDirection: 'asc',
    activeFields: [],
    savedSearches: [],
    ...initialState
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchEngine = useMemo(() => new AdvancedSearchEngine(config), [config]);
  const debounceRef = useRef<NodeJS.Timeout>();

  const debouncedSearch = useCallback((state: SearchState) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const results = searchEngine.search(data, state);
      onSearch(results.map(r => r.item), state);
    }, config.debounceMs || 300);
  }, [searchEngine, data, onSearch, config.debounceMs]);

  useEffect(() => {
    debouncedSearch(searchState);
  }, [searchState, debouncedSearch]);

  const updateSearchState = useCallback((updates: Partial<SearchState>) => {
    setSearchState(prev => ({ ...prev, ...updates }));
  }, []);

  const addFilter = useCallback((filter: Omit<SearchFilter, 'active'>) => {
    setSearchState(prev => ({
      ...prev,
      filters: [...prev.filters, { ...filter, active: true }]
    }));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setSearchState(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  }, []);

  const toggleFilter = useCallback((index: number) => {
    setSearchState(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) =>
        i === index ? { ...filter, active: !filter.active } : filter
      )
    }));
  }, []);

  return (
    <div className={`unified-search ${className}`}>
      <style jsx>{`
        .unified-search {
          background: ${designTokens.colors.background};
          border-radius: ${designTokens.borderRadius.lg};
          box-shadow: ${designTokens.shadows.sm};
          border: 1px solid ${designTokens.colors.border};
        }

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
          padding: ${designTokens.spacing.md};
          border-bottom: 1px solid ${designTokens.colors.border};
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: ${designTokens.typography.sizes.base};
          color: ${designTokens.colors.foreground};
          padding-left: ${designTokens.spacing.lg};
        }

        .search-input::placeholder {
          color: ${designTokens.colors.muted.foreground};
        }

        .search-actions {
          display: flex;
          align-items: center;
          gap: ${designTokens.spacing.sm};
        }

        .search-button {
          background: none;
          border: none;
          color: ${designTokens.colors.muted.foreground};
          cursor: pointer;
          padding: ${designTokens.spacing.xs};
          border-radius: ${designTokens.borderRadius.sm};
          transition: all 0.2s ease;
        }

        .search-button:hover {
          color: ${designTokens.colors.foreground};
          background: ${designTokens.colors.muted.DEFAULT};
        }

        .search-button.active {
          color: ${designTokens.colors.primary.DEFAULT};
          background: ${designTokens.colors.primary.DEFAULT}/10;
        }

        .advanced-panel {
          padding: ${designTokens.spacing.md};
          border-top: 1px solid ${designTokens.colors.border};
        }

        .field-selector {
          display: flex;
          flex-wrap: wrap;
          gap: ${designTokens.spacing.xs};
          margin-bottom: ${designTokens.spacing.md};
        }

        .field-chip {
          display: flex;
          align-items: center;
          gap: ${designTokens.spacing.xs};
          padding: ${designTokens.spacing.xs} ${designTokens.spacing.sm};
          background: ${designTokens.colors.muted.DEFAULT};
          border-radius: ${designTokens.borderRadius.full};
          font-size: ${designTokens.typography.sizes.sm};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .field-chip.active {
          background: ${designTokens.colors.primary.DEFAULT};
          color: ${designTokens.colors.primary.foreground};
        }

        .filters-section {
          margin-top: ${designTokens.spacing.md};
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: ${designTokens.spacing.sm};
          padding: ${designTokens.spacing.sm};
          background: ${designTokens.colors.muted.DEFAULT};
          border-radius: ${designTokens.borderRadius.md};
          margin-bottom: ${designTokens.spacing.xs};
        }

        .filter-item.inactive {
          opacity: 0.6;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: ${designTokens.spacing.sm};
          margin-top: ${designTokens.spacing.md};
        }

        .sort-select {
          flex: 1;
          padding: ${designTokens.spacing.sm};
          background: ${designTokens.colors.background};
          border: 1px solid ${designTokens.colors.border};
          border-radius: ${designTokens.borderRadius.md};
          color: ${designTokens.colors.foreground};
        }
      `}</style>

      {/* Main Search Input */}
      <div className="search-input-container">
        <Search className="w-5 h-5 text-muted-foreground absolute left-3" />
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchState.query}
          onChange={(e) => updateSearchState({ query: e.target.value })}
          onFocus={() => setIsExpanded(true)}
        />

        <div className="search-actions">
          {showFilters && (
            <button
              className={`search-button ${searchState.filters.some(f => f.active) ? 'active' : ''}`}
              onClick={() => setShowAdvanced(!showAdvanced)}
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4" />
              {searchState.filters.filter(f => f.active).length > 0 && (
                <span className="ml-1 text-xs">{searchState.filters.filter(f => f.active).length}</span>
              )}
            </button>
          )}

          <button
            className="search-button"
            onClick={() => updateSearchState({
              sortDirection: searchState.sortDirection === 'asc' ? 'desc' : 'asc'
            })}
            title={`Sort ${searchState.sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {searchState.sortDirection === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Advanced Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="advanced-panel"
          >
            {/* Field Selector */}
            {showFieldSelector && (
              <div className="field-selector">
                <span className="text-sm font-medium text-muted-foreground mb-2">Search in:</span>
                {config.fields
                  .filter(field => field.searchable !== false)
                  .map(field => {
                    const Icon = field.icon;
                    const isActive = searchState.activeFields.length === 0 || searchState.activeFields.includes(field.key);

                    return (
                      <button
                        key={field.key}
                        className={`field-chip ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          const newActiveFields = isActive
                            ? searchState.activeFields.filter(f => f !== field.key)
                            : [...searchState.activeFields, field.key];
                          updateSearchState({ activeFields: newActiveFields });
                        }}
                      >
                        {Icon && <Icon className="w-3 h-3" />}
                        {field.label}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Active Filters */}
            {searchState.filters.length > 0 && (
              <div className="filters-section">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => updateSearchState({ filters: [] })}
                  >
                    Clear All
                  </button>
                </div>

                {searchState.filters.map((filter, index) => (
                  <div key={index} className={`filter-item ${filter.active ? '' : 'inactive'}`}>
                    <button
                      className="text-xs"
                      onClick={() => toggleFilter(index)}
                    >
                      {filter.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    <span className="text-sm">
                      {config.fields.find(f => f.key === filter.field)?.label || filter.field} {filter.operator} {String(filter.value)}
                    </span>

                    <button
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => removeFilter(index)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Sort Controls */}
            <div className="sort-controls">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <select
                className="sort-select"
                value={searchState.sortField || ''}
                onChange={(e) => updateSearchState({ sortField: e.target.value || undefined })}
              >
                <option value="">Relevance</option>
                {config.fields
                  .filter(field => field.sortable !== false)
                  .map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Filter Builder Component
export interface FilterBuilderProps {
  fields: SearchableField[];
  onAddFilter: (filter: Omit<SearchFilter, 'active'>) => void;
  className?: string;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  onAddFilter,
  className = ''
}) => {
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<SearchFilter['operator']>('equals');
  const [filterValue, setFilterValue] = useState('');

  const handleAddFilter = useCallback(() => {
    if (!selectedField || !filterValue) return;

    onAddFilter({
      field: selectedField,
      operator: selectedOperator,
      value: filterValue
    });

    setFilterValue('');
  }, [selectedField, selectedOperator, filterValue, onAddFilter]);

  const getOperatorsForField = (field: SearchableField) => {
    const operators: { value: SearchFilter['operator']; label: string }[] = [
      { value: 'equals', label: 'Equals' },
      { value: 'contains', label: 'Contains' }
    ];

    if (field.type === 'text') {
      operators.push(
        { value: 'startsWith', label: 'Starts with' },
        { value: 'endsWith', label: 'Ends with' }
      );
    }

    if (field.type === 'number' || field.type === 'currency') {
      operators.push(
        { value: 'gt', label: 'Greater than' },
        { value: 'lt', label: 'Less than' },
        { value: 'gte', label: 'Greater or equal' },
        { value: 'lte', label: 'Less or equal' },
        { value: 'between', label: 'Between' }
      );
    }

    if (field.options) {
      operators.push(
        { value: 'in', label: 'In' },
        { value: 'not_in', label: 'Not in' }
      );
    }

    return operators;
  };

  const selectedFieldObj = fields.find(f => f.key === selectedField);
  const operators = selectedFieldObj ? getOperatorsForField(selectedFieldObj) : [];

  return (
    <div className={`filter-builder flex items-center gap-2 ${className}`}>
      <select
        value={selectedField}
        onChange={(e) => setSelectedField(e.target.value)}
        className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
      >
        <option value="">Select field...</option>
        {fields
          .filter(field => field.filterable !== false)
          .map(field => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
      </select>

      {selectedField && (
        <>
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value as SearchFilter['operator'])}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            {operators.map(op => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {selectedFieldObj?.options ? (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">Select value...</option>
              {selectedFieldObj.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={selectedFieldObj?.type === 'number' || selectedFieldObj?.type === 'currency' ? 'number' : 'text'}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Enter value..."
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          )}

          <button
            onClick={handleAddFilter}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            disabled={!filterValue}
          >
            Add Filter
          </button>
        </>
      )}
    </div>
  );
};

// Export additional utilities
export const createProductSearchConfig = (): SearchConfig => ({
  fields: [
    { key: 'sku', label: 'SKU', type: 'text', icon: Hash, weight: 2 },
    { key: 'name', label: 'Product Name', type: 'text', icon: Package, weight: 3 },
    { key: 'description', label: 'Description', type: 'text', weight: 1 },
    { key: 'category', label: 'Category', type: 'enum', icon: Tag },
    { key: 'supplier.name', label: 'Supplier', type: 'text', icon: Building2, weight: 1.5 },
    { key: 'price', label: 'Price', type: 'currency', icon: DollarSign, sortable: true },
    { key: 'stock', label: 'Stock', type: 'number', sortable: true },
    { key: 'lastUpdated', label: 'Last Updated', type: 'date', icon: Calendar, sortable: true }
  ],
  enableFuzzySearch: true,
  defaultSort: 'name',
  defaultSortDirection: 'asc',
  debounceMs: 250
});

export const createSupplierSearchConfig = (): SearchConfig => ({
  fields: [
    { key: 'name', label: 'Supplier Name', type: 'text', icon: Building2, weight: 3 },
    { key: 'code', label: 'Supplier Code', type: 'text', icon: Hash, weight: 2 },
    { key: 'contactPerson', label: 'Contact Person', type: 'text', icon: User },
    { key: 'email', label: 'Email', type: 'text', weight: 1.5 },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'category', label: 'Category', type: 'enum', icon: Tag },
    { key: 'status', label: 'Status', type: 'enum', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending' }
    ]},
    { key: 'createdAt', label: 'Created Date', type: 'date', icon: Calendar, sortable: true }
  ],
  enableFuzzySearch: true,
  defaultSort: 'name',
  defaultSortDirection: 'asc',
  debounceMs: 300
});