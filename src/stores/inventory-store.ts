"use client";

// @ts-nocheck

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  InventoryItem,
  InventorySearchFilters,
  InventorySortOptions,
  InventoryMetrics,
  StockMovement,
  InventoryAdjustment,
  CycleCount,
} from "@/types/inventory";

interface InventoryState {
  // Data
  items: InventoryItem[];
  metrics: InventoryMetrics | null;
  stockMovements: StockMovement[];
  adjustments: InventoryAdjustment[];
  cycleCounts: CycleCount[];

  // UI State
  loading: boolean;
  error: string | null;
  selectedItems: string[];
  filters: InventorySearchFilters;
  sortOptions: InventorySortOptions;

  // Actions
  setItems: (items: InventoryItem[]) => void;
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, item: Partial<InventoryItem>) => void;
  removeItem: (id: string) => void;

  setMetrics: (metrics: InventoryMetrics) => void;
  setStockMovements: (movements: StockMovement[]) => void;
  addStockMovement: (movement: StockMovement) => void;

  setAdjustments: (adjustments: InventoryAdjustment[]) => void;
  addAdjustment: (adjustment: InventoryAdjustment) => void;
  updateAdjustment: (
    id: string,
    adjustment: Partial<InventoryAdjustment>
  ) => void;

  setCycleCounts: (counts: CycleCount[]) => void;
  addCycleCount: (count: CycleCount) => void;
  updateCycleCount: (id: string, count: Partial<CycleCount>) => void;

  // Selection Management
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  selectAllItems: () => void;
  clearSelection: () => void;

  // Filter & Sort
  setFilters: (filters: Partial<InventorySearchFilters>) => void;
  clearFilters: () => void;
  setSortOptions: (sort: InventorySortOptions) => void;

  // UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed values
  getFilteredItems: () => InventoryItem[];
  getLowStockItems: () => InventoryItem[];
  getOutOfStockItems: () => InventoryItem[];
  getSelectedItems: () => InventoryItem[];
}

const initialFilters: InventorySearchFilters = {
  query: "",
  category: [],
  status: [],
  warehouse: [],
  supplier: [],
  lowStock: false,
  outOfStock: false,
  tags: [],
};

const initialSort: InventorySortOptions = {
  field: "name",
  direction: "asc",
};

export const useInventoryStore = create<InventoryState>()(
  devtools(
    (set, get) => ({
      // Initial State
      items: [],
      metrics: null,
      stockMovements: [],
      adjustments: [],
      cycleCounts: [],

      loading: false,
      error: null,
      selectedItems: [],
      filters: initialFilters,
      sortOptions: initialSort,

      // Data Actions
      setItems: (items) => set({ items }, false, "setItems"),

      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] }), false, "addItem"),

      updateItem: (id, updatedItem) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, ...updatedItem } : item
            ),
          }),
          false,
          "updateItem"
        ),

      removeItem: (id) =>
        set(
          (state) => ({
            items: state.items.filter((item) => item.id !== id),
            selectedItems: state.selectedItems.filter(
              (itemId) => itemId !== id
            ),
          }),
          false,
          "removeItem"
        ),

      setMetrics: (metrics) => set({ metrics }, false, "setMetrics"),

      setStockMovements: (movements) =>
        set({ stockMovements: movements }, false, "setStockMovements"),

      addStockMovement: (movement) =>
        set(
          (state) => ({
            stockMovements: [movement, ...state.stockMovements],
          }),
          false,
          "addStockMovement"
        ),

      setAdjustments: (adjustments) =>
        set({ adjustments }, false, "setAdjustments"),

      addAdjustment: (adjustment) =>
        set(
          (state) => ({
            adjustments: [adjustment, ...state.adjustments],
          }),
          false,
          "addAdjustment"
        ),

      updateAdjustment: (id, updatedAdjustment) =>
        set(
          (state) => ({
            adjustments: state.adjustments.map((adj) =>
              adj.id === id ? { ...adj, ...updatedAdjustment } : adj
            ),
          }),
          false,
          "updateAdjustment"
        ),

      setCycleCounts: (counts) =>
        set({ cycleCounts: counts }, false, "setCycleCounts"),

      addCycleCount: (count) =>
        set(
          (state) => ({
            cycleCounts: [count, ...state.cycleCounts],
          }),
          false,
          "addCycleCount"
        ),

      updateCycleCount: (id, updatedCount) =>
        set(
          (state) => ({
            cycleCounts: state.cycleCounts.map((count) =>
              count.id === id ? { ...count, ...updatedCount } : count
            ),
          }),
          false,
          "updateCycleCount"
        ),

      // Selection Actions
      selectItem: (id) =>
        set(
          (state) => ({
            selectedItems: state.selectedItems.includes(id)
              ? state.selectedItems
              : [...state.selectedItems, id],
          }),
          false,
          "selectItem"
        ),

      deselectItem: (id) =>
        set(
          (state) => ({
            selectedItems: state.selectedItems.filter(
              (itemId) => itemId !== id
            ),
          }),
          false,
          "deselectItem"
        ),

      selectAllItems: () =>
        set(
          (state) => ({
            selectedItems: state.items.map((item) => item.id),
          }),
          false,
          "selectAllItems"
        ),

      clearSelection: () => set({ selectedItems: [] }, false, "clearSelection"),

      // Filter & Sort Actions
      setFilters: (newFilters) =>
        set(
          (state) => ({
            filters: { ...state.filters, ...newFilters },
          }),
          false,
          "setFilters"
        ),

      clearFilters: () =>
        set({ filters: initialFilters }, false, "clearFilters"),

      setSortOptions: (sortOptions) =>
        set({ sortOptions }, false, "setSortOptions"),

      // UI State Actions
      setLoading: (loading) => set({ loading }, false, "setLoading"),
      setError: (error) => set({ error }, false, "setError"),

      // Computed Getters
      getFilteredItems: () => {
        const { items, filters, sortOptions } = get();
        let filtered = [...items];

        // Apply filters
        if (filters.query) {
          const query = filters.query.toLowerCase();
          filtered = filtered.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.sku.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query)
          );
        }

        if (filters.category && filters.category.length > 0) {
          filtered = filtered.filter((item) =>
            filters.category!.includes(item.category)
          );
        }

        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter((item) =>
            filters.status!.includes(item.status)
          );
        }

        if (filters.lowStock) {
          filtered = filtered.filter(
            (item) => item.currentStock <= item.reorderPoint
          );
        }

        if (filters.outOfStock) {
          filtered = filtered.filter((item) => item.currentStock === 0);
        }

        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter((item) =>
            filters.tags!.some((tag) => item.tags.includes(tag))
          );
        }

        // Apply sorting
        filtered.sort((a, b) => {
          const { field, direction } = sortOptions;
          let aValue: unknown = a[field as keyof InventoryItem];
          let bValue: unknown = b[field as keyof InventoryItem];

          if (typeof aValue === "string") {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          if (aValue < bValue) return direction === "asc" ? -1 : 1;
          if (aValue > bValue) return direction === "asc" ? 1 : -1;
          return 0;
        });

        return filtered;
      },

      getLowStockItems: () => {
        const { items } = get();
        return items.filter(
          (item) =>
            item.currentStock <= item.reorderPoint && item.currentStock > 0
        );
      },

      getOutOfStockItems: () => {
        const { items } = get();
        return items.filter((item) => item.currentStock === 0);
      },

      getSelectedItems: () => {
        const { items, selectedItems } = get();
        return items.filter((item) => selectedItems.includes(item.id));
      },
    }),
    {
      name: "inventory-store",
    }
  )
);
