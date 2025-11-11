// @ts-nocheck

/**
 * Service Layer Exports
 *
 * Central export point for all service classes in the MantisNXT application.
 * This includes loyalty, rewards, pricing, inventory, suppliers, and integration services.
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

// ============================================================================
// LOYALTY & REWARDS SERVICES
// ============================================================================

export { LoyaltyProgramService } from './LoyaltyProgramService';
export { CustomerLoyaltyService } from './CustomerLoyaltyService';
export { LoyaltyTransactionService } from './LoyaltyTransactionService';
export { RewardCatalogService } from './RewardCatalogService';
export { RewardRedemptionService } from './RewardRedemptionService';
export { LoyaltyRuleService } from './LoyaltyRuleService';
export { LoyaltyAnalyticsService } from './LoyaltyAnalyticsService';

// ============================================================================
// PRICING SERVICES
// ============================================================================

export { PricingRuleService } from './PricingRuleService';
export { PricingOptimizationService } from './PricingOptimizationService';
export { PriceAnalyticsService } from './PriceAnalyticsService';
export { PriceListProcessor } from './PriceListProcessor';
export { PricelistService } from './PricelistService';

// ============================================================================
// INVENTORY SERVICES
// ============================================================================

export { StockService } from './StockService';
export { InventorySelectionService } from './InventorySelectionService';

// ============================================================================
// SUPPLIER SERVICES
// ============================================================================

export { SupplierProductService } from './SupplierProductService';

// ============================================================================
// CUSTOMER SERVICES
// ============================================================================

export { CustomerService } from './CustomerService';

// ============================================================================
// INTEGRATION SERVICES
// ============================================================================

export { IntegrationService } from './IntegrationService';
export { IntegrationSyncService } from './IntegrationSyncService';
export { IntegrationMappingService } from './IntegrationMappingService';
export { OdooService } from './OdooService';
export { WooCommerceService } from './WooCommerceService';

// ============================================================================
// UNIFIED DATA SERVICE
// ============================================================================

export { UnifiedDataService } from './UnifiedDataService';
