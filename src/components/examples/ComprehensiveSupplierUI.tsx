'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Upload, Search, Filter, Eye, Settings } from 'lucide-react';

// Import all our perfected components
import { ProductCatalogGrid } from '../products/ProductCatalogGrid';
import { EnhancedPricelistUploadWizard } from '../supplier/EnhancedPricelistUploadWizard';
import { EnhancedDataTable, ColumnDef } from '../ui/data-table/EnhancedDataTable';
import { LoadingStates } from '../ui/loading/LoadingStates';
import { AccessibilityProvider } from '../ui/accessibility/AccessibilityProvider';
import { UnifiedSearch, createProductSearchConfig, createSupplierSearchConfig } from '../ui/search/UnifiedSearchSystem';
import { DataFreshnessDashboard, DataFreshnessInfo } from '../ui/indicators/DataFreshnessIndicators';
import { designTokens } from '../ui/design-system';

// Mock data interfaces matching your existing types
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  lastUpdated: Date;
  status: 'active' | 'inactive' | 'pending';
  trends: {
    priceChange: number;
    demandChange: number;
    stockMovement: number;
  };
  imageUrl?: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  productsCount: number;
  lastOrderDate?: Date;
}

// Mock data generators
const generateMockProducts = (count: number): Product[] => {
  const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Hardware', 'Software'];
  const suppliers = [
    { id: '1', name: 'TechCorp Solutions', code: 'TECH001' },
    { id: '2', name: 'Global Supplies Ltd', code: 'GLOB002' },
    { id: '3', name: 'Premium Parts Co', code: 'PREM003' },
    { id: '4', name: 'Industrial Materials', code: 'INDL004' },
    { id: '5', name: 'Digital Systems Inc', code: 'DIGI005' }
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `product-${i + 1}`,
    sku: `SKU-${String(i + 1).padStart(4, '0')}`,
    name: `Product ${i + 1}`,
    description: `High-quality product from category ${categories[i % categories.length]}`,
    category: categories[i % categories.length],
    price: Math.round((Math.random() * 1000 + 50) * 100) / 100,
    stock: Math.floor(Math.random() * 500),
    supplier: suppliers[i % suppliers.length],
    lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 30), // Random within 30 days
    status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'inactive' : 'pending') as 'active' | 'inactive' | 'pending',
    trends: {
      priceChange: (Math.random() - 0.5) * 20,
      demandChange: (Math.random() - 0.5) * 50,
      stockMovement: Math.floor((Math.random() - 0.5) * 100)
    },
    imageUrl: `https://picsum.photos/400/300?random=${i + 1}`
  }));
};

const generateMockSuppliers = (count: number): Supplier[] => {
  const categories = ['Technology', 'Manufacturing', 'Services', 'Retail', 'Industrial'];
  const names = [
    'TechCorp Solutions', 'Global Supplies Ltd', 'Premium Parts Co', 'Industrial Materials',
    'Digital Systems Inc', 'Advanced Manufacturing', 'Quality Components', 'Smart Solutions'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `supplier-${i + 1}`,
    name: names[i % names.length],
    code: `SUP-${String(i + 1).padStart(3, '0')}`,
    contactPerson: `Contact Person ${i + 1}`,
    email: `contact${i + 1}@${names[i % names.length].toLowerCase().replace(/\s+/g, '')}.com`,
    phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    category: categories[i % categories.length],
    status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'inactive' : 'pending') as 'active' | 'inactive' | 'pending',
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 365), // Random within year
    productsCount: Math.floor(Math.random() * 100) + 1,
    lastOrderDate: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000 * 90) : undefined
  }));
};

// Main comprehensive component
export const ComprehensiveSupplierUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers' | 'upload' | 'analytics'>('products');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Mock data
  const mockProducts = useMemo(() => generateMockProducts(150), []);
  const mockSuppliers = useMemo(() => generateMockSuppliers(25), []);

  // Data freshness info
  const dataFreshnessItems = useMemo(() => [
    {
      id: 'products',
      name: 'Product Catalog',
      freshnessInfo: {
        lastUpdated: new Date(Date.now() - 120000), // 2 minutes ago
        syncStatus: 'synced' as const,
        freshnessLevel: 'fresh' as const,
        changesSinceLastView: 3,
        confidence: 0.95,
        dataSource: 'Primary Database',
        recentChanges: [
          {
            id: '1',
            type: 'price_changed' as const,
            field: 'price',
            timestamp: new Date(Date.now() - 60000),
            severity: 'medium' as const
          },
          {
            id: '2',
            type: 'stock_changed' as const,
            field: 'stock',
            timestamp: new Date(Date.now() - 180000),
            severity: 'high' as const
          }
        ]
      }
    },
    {
      id: 'suppliers',
      name: 'Supplier Data',
      freshnessInfo: {
        lastUpdated: new Date(Date.now() - 300000), // 5 minutes ago
        syncStatus: 'synced' as const,
        freshnessLevel: 'fresh' as const,
        changesSinceLastView: 1,
        confidence: 0.98,
        dataSource: 'Supplier API',
        recentChanges: [
          {
            id: '3',
            type: 'updated' as const,
            field: 'contact_info',
            timestamp: new Date(Date.now() - 300000),
            severity: 'low' as const
          }
        ]
      }
    },
    {
      id: 'pricelists',
      name: 'Price Lists',
      freshnessInfo: {
        lastUpdated: new Date(Date.now() - 1800000), // 30 minutes ago
        syncStatus: 'synced' as const,
        freshnessLevel: 'stale' as const,
        changesSinceLastView: 0,
        confidence: 0.85,
        dataSource: 'File Uploads'
      }
    }
  ], []);

  // Column definitions for data table
  const productColumns: ColumnDef<Product>[] = [
    {
      id: 'sku',
      header: 'SKU',
      type: 'text',
      accessor: 'sku',
      sortable: true,
      filterable: true,
      width: 120
    },
    {
      id: 'name',
      header: 'Product Name',
      type: 'text',
      accessor: 'name',
      sortable: true,
      filterable: true,
      width: 200
    },
    {
      id: 'category',
      header: 'Category',
      type: 'badge',
      accessor: 'category',
      sortable: true,
      filterable: true,
      width: 120
    },
    {
      id: 'price',
      header: 'Price',
      type: 'currency',
      accessor: 'price',
      sortable: true,
      filterable: true,
      width: 100
    },
    {
      id: 'stock',
      header: 'Stock',
      type: 'number',
      accessor: 'stock',
      sortable: true,
      filterable: true,
      width: 80
    },
    {
      id: 'supplier',
      header: 'Supplier',
      type: 'text',
      accessor: 'supplier.name',
      sortable: true,
      filterable: true,
      width: 150
    },
    {
      id: 'status',
      header: 'Status',
      type: 'badge',
      accessor: 'status',
      sortable: true,
      filterable: true,
      width: 100
    },
    {
      id: 'actions',
      header: 'Actions',
      type: 'actions',
      width: 120,
      actions: [
        { label: 'View', icon: Eye, onClick: (item: Product) => console.log('View', item) },
        { label: 'Edit', icon: Settings, onClick: (item: Product) => console.log('Edit', item) }
      ]
    }
  ];

  const supplierColumns: ColumnDef<Supplier>[] = [
    {
      id: 'code',
      header: 'Code',
      type: 'text',
      accessor: 'code',
      sortable: true,
      filterable: true,
      width: 100
    },
    {
      id: 'name',
      header: 'Supplier Name',
      type: 'text',
      accessor: 'name',
      sortable: true,
      filterable: true,
      width: 200
    },
    {
      id: 'contactPerson',
      header: 'Contact',
      type: 'text',
      accessor: 'contactPerson',
      sortable: true,
      filterable: true,
      width: 150
    },
    {
      id: 'email',
      header: 'Email',
      type: 'text',
      accessor: 'email',
      sortable: true,
      filterable: true,
      width: 200
    },
    {
      id: 'category',
      header: 'Category',
      type: 'badge',
      accessor: 'category',
      sortable: true,
      filterable: true,
      width: 120
    },
    {
      id: 'productsCount',
      header: 'Products',
      type: 'number',
      accessor: 'productsCount',
      sortable: true,
      width: 100
    },
    {
      id: 'status',
      header: 'Status',
      type: 'badge',
      accessor: 'status',
      sortable: true,
      filterable: true,
      width: 100
    }
  ];

  // Search configurations
  const productSearchConfig = createProductSearchConfig();
  const supplierSearchConfig = createSupplierSearchConfig();

  // Handlers
  const handleProductSearch = useCallback((results: Product[]) => {
    setSearchResults(results);
  }, []);

  const handleSupplierSearch = useCallback((results: Supplier[]) => {
    setSearchResults(results);
  }, []);

  const handleUploadComplete = useCallback((result: any) => {
    console.log('Upload completed:', result);
    // Refresh data or show success message
  }, []);

  const handleRefreshAll = useCallback(() => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  const handleRefreshItem = useCallback((itemId: string) => {
    console.log('Refreshing item:', itemId);
    // Implement individual item refresh
  }, []);

  return (
    <AccessibilityProvider>
      <div className="comprehensive-supplier-ui">
        <style jsx>{`
          .comprehensive-supplier-ui {
            min-height: 100vh;
            background: ${designTokens.colors.background};
            color: ${designTokens.colors.foreground};
          }

          .header {
            background: ${designTokens.colors.card};
            border-bottom: 1px solid ${designTokens.colors.border};
            padding: ${designTokens.spacing.lg};
          }

          .nav-tabs {
            display: flex;
            gap: ${designTokens.spacing.sm};
            margin-top: ${designTokens.spacing.md};
          }

          .nav-tab {
            display: flex;
            align-items: center;
            gap: ${designTokens.spacing.sm};
            padding: ${designTokens.spacing.sm} ${designTokens.spacing.md};
            background: transparent;
            border: 1px solid ${designTokens.colors.border};
            border-radius: ${designTokens.borderRadius.md};
            color: ${designTokens.colors.muted.foreground};
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: ${designTokens.typography.sizes.sm};
            font-weight: 500;
          }

          .nav-tab:hover {
            background: ${designTokens.colors.muted.DEFAULT};
            color: ${designTokens.colors.foreground};
          }

          .nav-tab.active {
            background: ${designTokens.colors.primary.DEFAULT};
            color: ${designTokens.colors.primary.foreground};
            border-color: ${designTokens.colors.primary.DEFAULT};
          }

          .content {
            padding: ${designTokens.spacing.lg};
          }

          .search-section {
            margin-bottom: ${designTokens.spacing.lg};
          }

          .data-section {
            background: ${designTokens.colors.card};
            border: 1px solid ${designTokens.colors.border};
            border-radius: ${designTokens.borderRadius.lg};
            overflow: hidden;
          }
        `}</style>

        {/* Header with Data Freshness Dashboard */}
        <div className="header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Supplier & Product Management</h1>
              <p className="text-muted-foreground">
                Comprehensive interface with advanced search, real-time updates, and accessibility features
              </p>
            </div>

            <DataFreshnessDashboard
              items={dataFreshnessItems}
              onRefreshAll={handleRefreshAll}
              onRefreshItem={handleRefreshItem}
              className="w-96"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package className="w-4 h-4" />
              Product Catalog
            </button>
            <button
              className={`nav-tab ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <Search className="w-4 h-4" />
              Suppliers
            </button>
            <button
              className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload className="w-4 h-4" />
              Price List Upload
            </button>
            <button
              className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <Filter className="w-4 h-4" />
              Data Analytics
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="content">
          {isLoading && (
            <div className="mb-6">
              <LoadingStates
                variant="skeleton-table"
                rows={10}
                showProgress={true}
                message="Refreshing data..."
              />
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && !isLoading && (
            <div className="space-y-6">
              {/* Search Section */}
              <div className="search-section">
                <UnifiedSearch
                  config={productSearchConfig}
                  data={mockProducts}
                  onSearch={handleProductSearch}
                  placeholder="Search products by SKU, name, category, supplier..."
                  showFieldSelector={true}
                  showFilters={true}
                  showSavedSearches={true}
                  className="w-full"
                />
              </div>

              {/* Product Catalog Grid */}
              <div className="data-section">
                <ProductCatalogGrid
                  products={searchResults.length > 0 ? searchResults : mockProducts}
                  onProductSelect={(product) => console.log('Selected product:', product)}
                  onProductUpdate={(product) => console.log('Update product:', product)}
                  viewMode="grid"
                  enableVirtualization={true}
                  pageSize={20}
                  className="p-6"
                />
              </div>
            </div>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && !isLoading && (
            <div className="space-y-6">
              {/* Search Section */}
              <div className="search-section">
                <UnifiedSearch
                  config={supplierSearchConfig}
                  data={mockSuppliers}
                  onSearch={handleSupplierSearch}
                  placeholder="Search suppliers by name, code, contact, category..."
                  showFieldSelector={true}
                  showFilters={true}
                  className="w-full"
                />
              </div>

              {/* Suppliers Data Table */}
              <div className="data-section">
                <EnhancedDataTable
                  data={searchResults.length > 0 ? searchResults : mockSuppliers}
                  columns={supplierColumns}
                  enableSorting={true}
                  enableFiltering={true}
                  enableGrouping={true}
                  enableExport={true}
                  enableColumnResizing={true}
                  enableRowSelection={true}
                  enableVirtualization={true}
                  pageSize={25}
                  className="p-6"
                />
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && !isLoading && (
            <div className="space-y-6">
              <div className="data-section">
                <EnhancedPricelistUploadWizard
                  supplierId="supplier-1"
                  onUploadComplete={handleUploadComplete}
                  enableAIMapping={true}
                  enableValidation={true}
                  supportedFormats={['.xlsx', '.csv', '.json']}
                  maxFileSize={10}
                  className="p-6"
                />
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && !isLoading && (
            <div className="space-y-6">
              <div className="data-section">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Product Analytics</h3>
                  <EnhancedDataTable
                    data={mockProducts}
                    columns={productColumns}
                    enableSorting={true}
                    enableFiltering={true}
                    enableGrouping={true}
                    enableExport={true}
                    enableColumnResizing={true}
                    enableRowSelection={true}
                    enableVirtualization={true}
                    pageSize={50}
                    groupBy="category"
                    initialSort={{ column: 'price', direction: 'desc' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccessibilityProvider>
  );
};

export default ComprehensiveSupplierUI;