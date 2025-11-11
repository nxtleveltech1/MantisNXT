/**
 * Feature Flag System for Gradual Rollout
 *
 * Purpose: Enable safe, gradual rollout of NXT-SPP changes with runtime control.
 *
 * Usage:
 * ```typescript
 * import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags';
 *
 * if (isFeatureEnabled(FeatureFlag.USE_NXT_SOH_VIEW)) {
 *   // Use new NXT SOH view
 * } else {
 *   // Fall back to legacy SOH query
 * }
 * ```
 */

/**
 * Feature flag definitions
 */
export enum FeatureFlag {
  // Phase 1: Database layer
  USE_MERGE_STORED_PROCEDURE = 'USE_MERGE_STORED_PROCEDURE',
  USE_NXT_SOH_VIEW = 'USE_NXT_SOH_VIEW',
  ENFORCE_SINGLE_ACTIVE_SELECTION = 'ENFORCE_SINGLE_ACTIVE_SELECTION',

  // Phase 2: Module-specific rollouts
  USE_SELECTED_CATALOG_INVENTORY = 'USE_SELECTED_CATALOG_INVENTORY',
  USE_SELECTED_CATALOG_ORDERS = 'USE_SELECTED_CATALOG_ORDERS',
  USE_SELECTED_CATALOG_INVOICES = 'USE_SELECTED_CATALOG_INVOICES',
  USE_SELECTED_CATALOG_REPORTS = 'USE_SELECTED_CATALOG_REPORTS',

  // Phase 3: Advanced features
  ENABLE_CACHE_INVALIDATION = 'ENABLE_CACHE_INVALIDATION',
  ENABLE_SELECTION_ANALYTICS = 'ENABLE_SELECTION_ANALYTICS',
}

/**
 * Feature flag metadata
 */
interface FlagMetadata {
  name: string;
  description: string;
  defaultValue: boolean;
  rolloutPlan?: string;
}

/**
 * Feature flag registry with metadata
 */
const FLAG_REGISTRY: Record<FeatureFlag, FlagMetadata> = {
  [FeatureFlag.USE_MERGE_STORED_PROCEDURE]: {
    name: 'Use Merge Stored Procedure',
    description: 'Use spp.merge_pricelist stored procedure instead of TypeScript merge logic',
    defaultValue: false,
    rolloutPlan: 'Week 1: Enable and monitor merge performance',
  },
  [FeatureFlag.USE_NXT_SOH_VIEW]: {
    name: 'Use NXT SOH View',
    description: 'Use serve.v_nxt_soh view for authoritative stock queries',
    defaultValue: false,
    rolloutPlan: 'Week 2: Enable after stored procedure is stable',
  },
  [FeatureFlag.ENFORCE_SINGLE_ACTIVE_SELECTION]: {
    name: 'Enforce Single Active Selection',
    description: 'Enforce business rule that only one selection can be active at a time',
    defaultValue: false,
    rolloutPlan: 'Week 3: Enable after NXT SOH view is validated',
  },
  [FeatureFlag.USE_SELECTED_CATALOG_INVENTORY]: {
    name: 'Use Selected Catalog in Inventory Module',
    description: 'Filter inventory queries to selected items only',
    defaultValue: false,
    rolloutPlan: 'Week 4: Enable per module after core changes are stable',
  },
  [FeatureFlag.USE_SELECTED_CATALOG_ORDERS]: {
    name: 'Use Selected Catalog in Orders Module',
    description: 'Filter purchase orders to selected items only',
    defaultValue: false,
    rolloutPlan: 'Week 4: Enable per module after core changes are stable',
  },
  [FeatureFlag.USE_SELECTED_CATALOG_INVOICES]: {
    name: 'Use Selected Catalog in Invoices Module',
    description: 'Filter invoices to selected items only',
    defaultValue: false,
    rolloutPlan: 'Week 4: Enable per module after core changes are stable',
  },
  [FeatureFlag.USE_SELECTED_CATALOG_REPORTS]: {
    name: 'Use Selected Catalog in Reports',
    description: 'Filter all reports to selected items only',
    defaultValue: false,
    rolloutPlan: 'Week 5: Enable after all modules are validated',
  },
  [FeatureFlag.ENABLE_CACHE_INVALIDATION]: {
    name: 'Enable Cache Invalidation',
    description: 'Automatically invalidate caches when selections are activated',
    defaultValue: false,
    rolloutPlan: 'Week 5: Enable after module rollouts complete',
  },
  [FeatureFlag.ENABLE_SELECTION_ANALYTICS]: {
    name: 'Enable Selection Analytics',
    description: 'Track and analyze selection performance metrics',
    defaultValue: false,
    rolloutPlan: 'Week 6: Enable for post-rollout monitoring',
  },
};

/**
 * Get feature flag value from environment variable
 *
 * Environment variables should be named: FEATURE_FLAG_{FLAG_NAME}=true
 * Example: FEATURE_FLAG_USE_NXT_SOH_VIEW=true
 */
function getEnvFlagValue(flag: FeatureFlag): boolean | undefined {
  const envKey = `FEATURE_FLAG_${flag}`;
  const envValue = process.env[envKey];

  if (envValue === undefined) {
    return undefined;
  }

  // Support various truthy values
  const truthyValues = ['true', '1', 'yes', 'on', 'enabled'];
  return truthyValues.includes(envValue.toLowerCase());
}

/**
 * Check if a feature flag is enabled
 *
 * Priority:
 * 1. Environment variable (FEATURE_FLAG_{NAME})
 * 2. Default value from registry
 *
 * @param flag - Feature flag to check
 * @returns true if enabled, false otherwise
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Check environment variable first
  const envValue = getEnvFlagValue(flag);
  if (envValue !== undefined) {
    return envValue;
  }

  // Fall back to default value
  const metadata = FLAG_REGISTRY[flag];
  return metadata?.defaultValue ?? false;
}

/**
 * Get metadata for a feature flag
 */
export function getFlagMetadata(flag: FeatureFlag): FlagMetadata | undefined {
  return FLAG_REGISTRY[flag];
}

/**
 * Get all feature flags with their current state
 *
 * Useful for debugging and admin dashboards
 */
export function getAllFlags(): Array<{
  flag: FeatureFlag;
  enabled: boolean;
  metadata: FlagMetadata;
  source: 'env' | 'default';
}> {
  return Object.values(FeatureFlag).map((flag) => {
    const envValue = getEnvFlagValue(flag);
    const enabled = isFeatureEnabled(flag);
    const metadata = FLAG_REGISTRY[flag];

    return {
      flag,
      enabled,
      metadata,
      source: envValue !== undefined ? 'env' : 'default',
    };
  });
}

/**
 * Validate feature flag dependencies
 *
 * Some flags should only be enabled if their dependencies are also enabled.
 * This function checks those dependencies and returns warnings.
 */
export function validateFlagDependencies(): Array<{
  flag: FeatureFlag;
  warning: string;
}> {
  const warnings: Array<{ flag: FeatureFlag; warning: string }> = [];

  // NXT SOH view requires merge stored procedure for data consistency
  if (
    isFeatureEnabled(FeatureFlag.USE_NXT_SOH_VIEW) &&
    !isFeatureEnabled(FeatureFlag.USE_MERGE_STORED_PROCEDURE)
  ) {
    warnings.push({
      flag: FeatureFlag.USE_NXT_SOH_VIEW,
      warning: 'USE_NXT_SOH_VIEW requires USE_MERGE_STORED_PROCEDURE to be enabled first',
    });
  }

  // Single active selection enforcement requires NXT SOH view
  if (
    isFeatureEnabled(FeatureFlag.ENFORCE_SINGLE_ACTIVE_SELECTION) &&
    !isFeatureEnabled(FeatureFlag.USE_NXT_SOH_VIEW)
  ) {
    warnings.push({
      flag: FeatureFlag.ENFORCE_SINGLE_ACTIVE_SELECTION,
      warning: 'ENFORCE_SINGLE_ACTIVE_SELECTION requires USE_NXT_SOH_VIEW to be enabled first',
    });
  }

  // Module flags require core flags
  const moduleFlags = [
    FeatureFlag.USE_SELECTED_CATALOG_INVENTORY,
    FeatureFlag.USE_SELECTED_CATALOG_ORDERS,
    FeatureFlag.USE_SELECTED_CATALOG_INVOICES,
    FeatureFlag.USE_SELECTED_CATALOG_REPORTS,
  ];

  for (const moduleFlag of moduleFlags) {
    if (
      isFeatureEnabled(moduleFlag) &&
      !isFeatureEnabled(FeatureFlag.ENFORCE_SINGLE_ACTIVE_SELECTION)
    ) {
      warnings.push({
        flag: moduleFlag,
        warning: `${moduleFlag} requires ENFORCE_SINGLE_ACTIVE_SELECTION to be enabled first`,
      });
    }
  }

  return warnings;
}

/**
 * Log feature flag usage
 *
 * Tracks when flags are checked for monitoring and rollout analysis
 */
export function logFlagCheck(flag: FeatureFlag, context?: Record<string, unknown>): void {
  // Only log in non-production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.LOG_FEATURE_FLAGS) {
    return;
  }

  const enabled = isFeatureEnabled(flag);
  console.log('[FeatureFlag]', flag, enabled ? 'ENABLED' : 'DISABLED', context || '');
}

/**
 * Rollout plan summary
 *
 * Returns a human-readable rollout plan for all flags
 */
export function getRolloutPlan(): string {
  const lines: string[] = [
    '=== Feature Flag Rollout Plan ===',
    '',
    'Priority: Safety First - Enable in order, monitor metrics, rollback if issues',
    '',
  ];

  Object.entries(FLAG_REGISTRY).forEach(([flag, metadata]) => {
    lines.push(`${metadata.name}:`);
    lines.push(`  - ${metadata.description}`);
    lines.push(`  - Default: ${metadata.defaultValue ? 'ENABLED' : 'DISABLED'}`);
    if (metadata.rolloutPlan) {
      lines.push(`  - Plan: ${metadata.rolloutPlan}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}
