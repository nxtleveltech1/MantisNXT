// @ts-nocheck
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Supplier,
  SupplierSearchFilters,
  SupplierSortOptions,
  DashboardMetrics,
  DashboardActivity,
  PurchaseOrder,
  SupplierContract,
  SupplierCommunication,
} from '@/types/supplier';

interface SupplierState {
  // Data
  suppliers: Supplier[];
  metrics: DashboardMetrics | null;
  activities: DashboardActivity[];
  purchaseOrders: PurchaseOrder[];
  contracts: SupplierContract[];
  communications: SupplierCommunication[];

  // UI State
  loading: boolean;
  error: string | null;
  selectedSuppliers: string[];
  filters: SupplierSearchFilters;
  sortOptions: SupplierSortOptions;

  // Actions
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;

  setMetrics: (metrics: DashboardMetrics) => void;
  setActivities: (activities: DashboardActivity[]) => void;
  addActivity: (activity: DashboardActivity) => void;

  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, order: Partial<PurchaseOrder>) => void;

  setContracts: (contracts: SupplierContract[]) => void;
  addContract: (contract: SupplierContract) => void;
  updateContract: (id: string, contract: Partial<SupplierContract>) => void;

  setCommunications: (communications: SupplierCommunication[]) => void;
  addCommunication: (communication: SupplierCommunication) => void;

  // Selection Management
  selectSupplier: (id: string) => void;
  deselectSupplier: (id: string) => void;
  selectAllSuppliers: () => void;
  clearSelection: () => void;

  // Filter & Sort
  setFilters: (filters: Partial<SupplierSearchFilters>) => void;
  clearFilters: () => void;
  setSortOptions: (sort: SupplierSortOptions) => void;

  // UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed values
  getFilteredSuppliers: () => Supplier[];
  getSupplierById: (id: string) => Supplier | undefined;
  getSupplierPurchaseOrders: (supplierId: string) => PurchaseOrder[];
  getSupplierContracts: (supplierId: string) => SupplierContract[];
  getSelectedSuppliers: () => Supplier[];
}

const initialFilters: SupplierSearchFilters = {
  query: '',
  status: [],
  tier: [],
  category: [],
  location: [],
  tags: [],
  hasActiveContracts: undefined,
};

const initialSort: SupplierSortOptions = {
  field: 'name',
  direction: 'asc',
};

export const useSupplierStore = create<SupplierState>()(
  devtools(
    (set, get) => ({
      // Initial State
      suppliers: [],
      metrics: null,
      activities: [],
      purchaseOrders: [],
      contracts: [],
      communications: [],

      loading: false,
      error: null,
      selectedSuppliers: [],
      filters: initialFilters,
      sortOptions: initialSort,

      // Data Actions
      setSuppliers: suppliers => set({ suppliers }, false, 'setSuppliers'),

      addSupplier: supplier =>
        set(state => ({ suppliers: [...state.suppliers, supplier] }), false, 'addSupplier'),

      updateSupplier: (id, updatedSupplier) =>
        set(
          state => ({
            suppliers: state.suppliers.map(supplier =>
              supplier.id === id ? { ...supplier, ...updatedSupplier } : supplier
            ),
          }),
          false,
          'updateSupplier'
        ),

      removeSupplier: id =>
        set(
          state => ({
            suppliers: state.suppliers.filter(supplier => supplier.id !== id),
            selectedSuppliers: state.selectedSuppliers.filter(supplierId => supplierId !== id),
          }),
          false,
          'removeSupplier'
        ),

      setMetrics: metrics => set({ metrics }, false, 'setMetrics'),

      setActivities: activities => set({ activities }, false, 'setActivities'),

      addActivity: activity =>
        set(
          state => ({
            activities: [activity, ...state.activities.slice(0, 49)], // Keep latest 50
          }),
          false,
          'addActivity'
        ),

      setPurchaseOrders: orders => set({ purchaseOrders: orders }, false, 'setPurchaseOrders'),

      addPurchaseOrder: order =>
        set(
          state => ({
            purchaseOrders: [order, ...state.purchaseOrders],
          }),
          false,
          'addPurchaseOrder'
        ),

      updatePurchaseOrder: (id, updatedOrder) =>
        set(
          state => ({
            purchaseOrders: state.purchaseOrders.map(order =>
              order.id === id ? { ...order, ...updatedOrder } : order
            ),
          }),
          false,
          'updatePurchaseOrder'
        ),

      setContracts: contracts => set({ contracts }, false, 'setContracts'),

      addContract: contract =>
        set(
          state => ({
            contracts: [contract, ...state.contracts],
          }),
          false,
          'addContract'
        ),

      updateContract: (id, updatedContract) =>
        set(
          state => ({
            contracts: state.contracts.map(contract =>
              contract.id === id ? { ...contract, ...updatedContract } : contract
            ),
          }),
          false,
          'updateContract'
        ),

      setCommunications: communications => set({ communications }, false, 'setCommunications'),

      addCommunication: communication =>
        set(
          state => ({
            communications: [communication, ...state.communications],
          }),
          false,
          'addCommunication'
        ),

      // Selection Actions
      selectSupplier: id =>
        set(
          state => ({
            selectedSuppliers: state.selectedSuppliers.includes(id)
              ? state.selectedSuppliers
              : [...state.selectedSuppliers, id],
          }),
          false,
          'selectSupplier'
        ),

      deselectSupplier: id =>
        set(
          state => ({
            selectedSuppliers: state.selectedSuppliers.filter(supplierId => supplierId !== id),
          }),
          false,
          'deselectSupplier'
        ),

      selectAllSuppliers: () =>
        set(
          state => ({
            selectedSuppliers: state.suppliers.map(supplier => supplier.id),
          }),
          false,
          'selectAllSuppliers'
        ),

      clearSelection: () => set({ selectedSuppliers: [] }, false, 'clearSelection'),

      // Filter & Sort Actions
      setFilters: newFilters =>
        set(
          state => ({
            filters: { ...state.filters, ...newFilters },
          }),
          false,
          'setFilters'
        ),

      clearFilters: () => set({ filters: initialFilters }, false, 'clearFilters'),

      setSortOptions: sortOptions => set({ sortOptions }, false, 'setSortOptions'),

      // UI State Actions
      setLoading: loading => set({ loading }, false, 'setLoading'),
      setError: error => set({ error }, false, 'setError'),

      // Computed Getters
      getFilteredSuppliers: () => {
        const { suppliers, filters, sortOptions } = get();
        let filtered = [...suppliers];

        // Apply filters
        if (filters.query) {
          const query = filters.query.toLowerCase();
          filtered = filtered.filter(
            supplier =>
              supplier.name.toLowerCase().includes(query) ||
              supplier.code.toLowerCase().includes(query) ||
              supplier.businessInfo.legalName.toLowerCase().includes(query)
          );
        }

        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter(supplier => filters.status!.includes(supplier.status));
        }

        if (filters.tier && filters.tier.length > 0) {
          filtered = filtered.filter(supplier => filters.tier!.includes(supplier.tier));
        }

        if (filters.category && filters.category.length > 0) {
          filtered = filtered.filter(supplier =>
            supplier.category.some(category => filters.category!.includes(category))
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter(supplier =>
            filters.tags!.some(tag => supplier.tags.includes(tag))
          );
        }

        if (filters.hasActiveContracts !== undefined) {
          const { contracts } = get();
          const activeContractSupplierIds = new Set(
            contracts
              .filter(contract => contract.status === 'active')
              .map(contract => contract.supplierId)
          );

          filtered = filtered.filter(supplier =>
            filters.hasActiveContracts
              ? activeContractSupplierIds.has(supplier.id)
              : !activeContractSupplierIds.has(supplier.id)
          );
        }

        // Apply sorting
        filtered.sort((a, b) => {
          const { field, direction } = sortOptions;
          let aValue: unknown = a[field as keyof Supplier];
          let bValue: unknown = b[field as keyof Supplier];

          // Handle nested fields
          if (field === 'performanceRating') {
            aValue = a.performance.overallRating;
            bValue = b.performance.overallRating;
          }

          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          if (aValue < bValue) return direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return direction === 'asc' ? 1 : -1;
          return 0;
        });

        return filtered;
      },

      getSupplierById: id => {
        const { suppliers } = get();
        return suppliers.find(supplier => supplier.id === id);
      },

      getSupplierPurchaseOrders: supplierId => {
        const { purchaseOrders } = get();
        return purchaseOrders.filter(order => order.supplierId === supplierId);
      },

      getSupplierContracts: supplierId => {
        const { contracts } = get();
        return contracts.filter(contract => contract.supplierId === supplierId);
      },

      getSelectedSuppliers: () => {
        const { suppliers, selectedSuppliers } = get();
        return suppliers.filter(supplier => selectedSuppliers.includes(supplier.id));
      },
    }),
    {
      name: 'supplier-store',
    }
  )
);
