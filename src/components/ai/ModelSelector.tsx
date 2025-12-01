'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ModelSelectorProps {
  models: string[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  value,
  onValueChange,
  placeholder = 'Select model...',
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    return models.filter(model => model.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [models, searchQuery]);

  const selectedModel = models.find(model => model === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <span className="truncate">{selectedModel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search models..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup>
              {filteredModels.map(model => (
                <CommandItem
                  key={model}
                  value={model}
                  onSelect={() => {
                    onValueChange(model);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === model ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{model}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ModelSelector;
