"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const categories: { label: string; value: string }[] = [
  { label: "All Equipment", value: "All" },
  { label: "Microphones", value: "Microphones" },
  { label: "Cameras", value: "Cameras" },
  { label: "Audio Interfaces", value: "Audio Interfaces" },
  { label: "Headphones & Monitors", value: "Headphones & Monitors" },
  { label: "Lighting", value: "Lighting" },
  { label: "Video Accessories", value: "Video Accessories" },
  { label: "Recording Equipment", value: "Recording Equipment" },
  { label: "Streaming Gear", value: "Streaming Gear" },
  { label: "Cables & Adapters", value: "Cables & Adapters" },
  { label: "Other", value: "Other" },
];

const conditions = ["New", "Like New", "Good", "Fair", "Poor"];

const brands = [
  "Shure",
  "Audio-Technica",
  "Sony",
  "Canon",
  "Focusrite",
  "Universal Audio",
  "Elgato",
  "Logitech",
  "Blue",
  "Neewer",
  "Zoom",
  "DJI",
];

export type FilterState = {
  category: string;
  priceRange: [number, number];
  conditions: string[];
  brands: string[];
};

type MarketplaceSidebarProps = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalResults: number;
};

function SidebarContent({
  filters,
  onFiltersChange,
  totalResults,
}: MarketplaceSidebarProps & { onClose?: () => void }) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    condition: true,
    brands: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilter = (key: keyof FilterState, value: FilterState[typeof key]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCondition = (condition: string) => {
    const newConditions = filters.conditions.includes(condition)
      ? filters.conditions.filter((c) => c !== condition)
      : [...filters.conditions, condition];
    updateFilter("conditions", newConditions);
  };

  const toggleBrand = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand];
    updateFilter("brands", newBrands);
  };

  const hasActiveFilters =
    filters.category !== "All" ||
    filters.priceRange[0] !== 0 ||
    filters.priceRange[1] !== 100000 ||
    filters.conditions.length > 0 ||
    filters.brands.length > 0;

  const clearFilters = () => {
    onFiltersChange({
      category: "All",
      priceRange: [0, 100000],
      conditions: [],
      brands: [],
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-sidebar">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sidebar-foreground">Filters</h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              Clear all
            </Button>
          )}
        </div>
        <p className="text-xs text-sidebar-foreground/60">{totalResults} results</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Categories */}
          <div>
            <button
              onClick={() => toggleSection("categories")}
              className="flex items-center justify-between w-full mb-3 text-sm font-medium text-sidebar-foreground hover:text-sidebar-primary transition-colors"
            >
              <span>Categories</span>
              {expandedSections.categories ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
            {expandedSections.categories && (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => updateFilter("category", cat.value)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      filters.category === cat.value
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Price Range */}
          <div>
            <button
              onClick={() => toggleSection("price")}
              className="flex items-center justify-between w-full mb-3 text-sm font-medium text-sidebar-foreground hover:text-sidebar-primary transition-colors"
            >
              <span>Price Range</span>
              {expandedSections.price ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
            {expandedSections.price && (
              <div className="space-y-4">
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                  min={0}
                  max={100000}
                  step={100}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
                  <span>R{filters.priceRange[0].toLocaleString()}</span>
                  <span>R{filters.priceRange[1] === 5000 ? "5,000+" : filters.priceRange[1].toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Condition */}
          <div>
            <button
              onClick={() => toggleSection("condition")}
              className="flex items-center justify-between w-full mb-3 text-sm font-medium text-sidebar-foreground hover:text-sidebar-primary transition-colors"
            >
              <span>Condition</span>
              {expandedSections.condition ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
            {expandedSections.condition && (
              <div className="space-y-3">
                {conditions.map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={`condition-${condition}`}
                      checked={filters.conditions.includes(condition)}
                      onCheckedChange={() => toggleCondition(condition)}
                    />
                    <Label
                      htmlFor={`condition-${condition}`}
                      className="text-sm text-sidebar-foreground/80 cursor-pointer font-normal"
                    >
                      {condition}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Brands */}
          <div>
            <button
              onClick={() => toggleSection("brands")}
              className="flex items-center justify-between w-full mb-3 text-sm font-medium text-sidebar-foreground hover:text-sidebar-primary transition-colors"
            >
              <span>Brands</span>
              {expandedSections.brands ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
            {expandedSections.brands && (
              <div className="space-y-3">
                {brands.map((brand) => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${brand}`}
                      checked={filters.brands.includes(brand)}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <Label
                      htmlFor={`brand-${brand}`}
                      className="text-sm text-sidebar-foreground/80 cursor-pointer font-normal"
                    >
                      {brand}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function MarketplaceSidebar({ filters, onFiltersChange, totalResults }: MarketplaceSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              <SlidersHorizontal className="size-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 bg-sidebar">
            <SidebarContent
              filters={filters}
              onFiltersChange={onFiltersChange}
              totalResults={totalResults}
              onClose={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 border-r bg-sidebar">
        <div className="sticky top-16 h-[calc(100vh-4rem)] w-full overflow-y-auto">
          <SidebarContent filters={filters} onFiltersChange={onFiltersChange} totalResults={totalResults} />
        </div>
      </aside>
    </>
  );
}

