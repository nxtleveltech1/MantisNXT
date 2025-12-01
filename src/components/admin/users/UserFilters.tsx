'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { USER_ROLES } from '@/types/auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface UserFilterState {
  search: string;
  role: string;
  department: string;
  status: string;
  createdFrom: Date | undefined;
  createdTo: Date | undefined;
}

interface UserFiltersProps {
  departments: string[];
  filters: UserFilterState;
  onFiltersChange: (filters: UserFilterState) => void;
  onReset: () => void;
}

export function UserFilters({ departments, filters, onFiltersChange, onReset }: UserFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof UserFilterState>(key: K, value: UserFilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = [
    filters.role !== 'all',
    filters.department !== 'all',
    filters.status !== 'all',
    filters.createdFrom,
    filters.createdTo,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* Quick Search Bar */}
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search by name, email, or department..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Select value={filters.role} onValueChange={v => updateFilter('role', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {USER_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={v => updateFilter('status', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn('relative', activeFiltersCount > 0 && 'border-primary')}
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Advanced Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                disabled={activeFiltersCount === 0}
              >
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Department Filter */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={filters.department}
                  onValueChange={v => updateFilter('department', v)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Created From Date */}
              <div className="space-y-2">
                <Label>Created From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.createdFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdFrom ? (
                        format(filters.createdFrom, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdFrom}
                      onSelect={date => updateFilter('createdFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Created To Date */}
              <div className="space-y-2">
                <Label>Created To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.createdTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdTo ? (
                        format(filters.createdTo, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdTo}
                      onSelect={date => updateFilter('createdTo', date)}
                      disabled={date => (filters.createdFrom ? date < filters.createdFrom : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.role !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Role: {USER_ROLES.find(r => r.value === filters.role)?.label}
                    <button
                      onClick={() => updateFilter('role', 'all')}
                      className="hover:bg-secondary-foreground/20 ml-1 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.department !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Department: {filters.department}
                    <button
                      onClick={() => updateFilter('department', 'all')}
                      className="hover:bg-secondary-foreground/20 ml-1 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.status !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {filters.status}
                    <button
                      onClick={() => updateFilter('status', 'all')}
                      className="hover:bg-secondary-foreground/20 ml-1 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.createdFrom && (
                  <Badge variant="secondary" className="gap-1">
                    From: {format(filters.createdFrom, 'PP')}
                    <button
                      onClick={() => updateFilter('createdFrom', undefined)}
                      className="hover:bg-secondary-foreground/20 ml-1 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.createdTo && (
                  <Badge variant="secondary" className="gap-1">
                    To: {format(filters.createdTo, 'PP')}
                    <button
                      onClick={() => updateFilter('createdTo', undefined)}
                      className="hover:bg-secondary-foreground/20 ml-1 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
