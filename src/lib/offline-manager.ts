/**
 * Enhanced Offline Manager with Caching and Background Sync
 * Provides comprehensive offline support and intelligent caching strategies
 */

import { QueryClient } from '@tanstack/react-query';

export interface OfflineConfig {
  enableOfflineSupport: boolean;
  maxCacheAge: number; // in milliseconds
  maxCacheSize: number; // in MB
  syncInterval: number; // in milliseconds
  enableBackgroundSync: boolean;
  criticalEndpoints: string[];
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  size: number; // in bytes
}

export interface SyncOperation {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineManager {
  private config: OfflineConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncWorker: Worker | null = null;
  private queryClient: QueryClient | null = null;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      enableOfflineSupport: true,
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 50, // 50MB
      syncInterval: 30 * 1000, // 30 seconds
      enableBackgroundSync: true,
      criticalEndpoints: ['/api/alerts', '/api/dashboard', '/api/inventory'],
      ...config
    };

    this.initializeOfflineSupport();
  }

  private initializeOfflineSupport() {
    if (!this.config.enableOfflineSupport) return;

    // Listen to online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Load cached data from localStorage
    this.loadCacheFromStorage();

    // Initialize background sync if supported
    if (this.config.enableBackgroundSync && 'serviceWorker' in navigator) {
      this.initializeServiceWorker();
    }

    // Start periodic sync
    this.startPeriodicSync();
  }

  private handleOnline() {
    console.log('🌐 Connection restored - processing offline queue');
    this.isOnline = true;
    this.processSyncQueue();
    this.notifyConnectionChange(true);
  }

  private handleOffline() {
    console.log('📡 Connection lost - entering offline mode');
    this.isOnline = false;
    this.notifyConnectionChange(false);
  }

  private notifyConnectionChange(isOnline: boolean) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('connectionChange', {
      detail: { isOnline }
    }));

    // Invalidate queries if we're back online
    if (isOnline && this.queryClient) {
      this.queryClient.invalidateQueries();
    }
  }

  public setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Cache management
   */
  public async cacheData(
    key: string,
    data: any,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      ttl?: number; // time to live in milliseconds
    } = {}
  ): Promise<void> {
    const { priority = 'medium', ttl = this.config.maxCacheAge } = options;

    const entry: CacheEntry = {
      key,
      data: data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      priority,
      size: this.calculateSize(data)
    };

    // Check cache size limits
    await this.ensureCacheCapacity(entry.size);

    this.cache.set(key, entry);
    await this.saveCacheToStorage();

    console.log(`💾 Cached data for key: ${key} (${this.formatBytes(entry.size)})`);
  }

  public getCachedData(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.saveCacheToStorage();
      console.log(`⏰ Cache expired for key: ${key}`);
      return null;
    }

    console.log(`📂 Retrieved cached data for key: ${key}`);
    return entry.data;
  }

  public isCached(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() <= entry.expiry;
  }

  private async ensureCacheCapacity(newEntrySize: number) {
    const maxSizeBytes = this.config.maxCacheSize * 1024 * 1024; // Convert MB to bytes
    let currentSize = this.getCurrentCacheSize();

    // If adding new entry would exceed limit, remove entries
    while (currentSize + newEntrySize > maxSizeBytes && this.cache.size > 0) {
      // Remove least recently used entry with lowest priority
      const entryToRemove = this.findEntryToRemove();
      if (entryToRemove) {
        currentSize -= entryToRemove.size;
        this.cache.delete(entryToRemove.key);
        console.log(`🗑️ Removed cache entry: ${entryToRemove.key} (${this.formatBytes(entryToRemove.size)})`);
      } else {
        break;
      }
    }
  }

  private findEntryToRemove(): CacheEntry | null {
    const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
    let oldest: CacheEntry | null = null;
    let oldestScore = Infinity;

    for (const entry of this.cache.values()) {
      // Score based on age and priority (lower is worse)
      const score = priorities[entry.priority] / (Date.now() - entry.timestamp);

      if (score < oldestScore) {
        oldestScore = score;
        oldest = entry;
      }
    }

    return oldest;
  }

  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private calculateSize(data: any): number {
    // Rough estimation of data size in bytes
    const str = JSON.stringify(data);
    return new Blob([str]).size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Sync queue management
   */
  public addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const syncOp: SyncOperation = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...operation
    };

    this.syncQueue.push(syncOp);
    console.log(`📝 Added operation to sync queue: ${syncOp.endpoint}`);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    console.log(`🔄 Processing ${this.syncQueue.length} operations in sync queue`);

    const pendingOperations = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of pendingOperations) {
      try {
        await this.executeSyncOperation(operation);
        console.log(`✅ Sync operation completed: ${operation.endpoint}`);
      } catch (error) {
        console.error(`❌ Sync operation failed: ${operation.endpoint}`, error);

        // Retry logic
        if (operation.retryCount < operation.maxRetries) {
          operation.retryCount++;
          this.syncQueue.push(operation);
          console.log(`🔄 Retrying operation: ${operation.endpoint} (${operation.retryCount}/${operation.maxRetries})`);
        } else {
          console.error(`💀 Max retries exceeded for operation: ${operation.endpoint}`);
        }
      }
    }

    // Save updated sync queue
    this.saveSyncQueueToStorage();
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    const response = await fetch(operation.endpoint, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: operation.data ? JSON.stringify(operation.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Background sync with service worker
   */
  private async initializeServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🔧 Service Worker registered');

      // Request background sync permission
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        registration.sync.register('background-sync');
        console.log('🔄 Background sync registered');
      }
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', error);
    }
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, this.config.syncInterval);
  }

  /**
   * Storage management
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cacheData = localStorage.getItem('offline_cache');
      if (cacheData) {
        const entries: CacheEntry[] = JSON.parse(cacheData);
        for (const entry of entries) {
          // Only load non-expired entries
          if (Date.now() <= entry.expiry) {
            this.cache.set(entry.key, entry);
          }
        }
        console.log(`📂 Loaded ${this.cache.size} cache entries from storage`);
      }

      const syncData = localStorage.getItem('sync_queue');
      if (syncData) {
        this.syncQueue = JSON.parse(syncData);
        console.log(`📝 Loaded ${this.syncQueue.length} sync operations from storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load offline data from storage:', error);
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      localStorage.setItem('offline_cache', JSON.stringify(entries));
    } catch (error) {
      console.warn('⚠️ Failed to save cache to storage:', error);
    }
  }

  private async saveSyncQueueToStorage(): Promise<void> {
    try {
      localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('⚠️ Failed to save sync queue to storage:', error);
    }
  }

  /**
   * Public API
   */
  public getStatus() {
    return {
      isOnline: this.isOnline,
      cacheEntries: this.cache.size,
      cacheSize: this.formatBytes(this.getCurrentCacheSize()),
      syncQueueLength: this.syncQueue.length,
      lastSync: this.getLastSyncTime()
    };
  }

  private getLastSyncTime(): string | null {
    if (this.syncQueue.length === 0) return null;

    const lastOp = this.syncQueue.reduce((latest, op) =>
      op.timestamp > latest.timestamp ? op : latest
    );

    return new Date(lastOp.timestamp).toISOString();
  }

  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('offline_cache');
    console.log('🗑️ Cache cleared');
  }

  public clearSyncQueue(): void {
    this.syncQueue = [];
    localStorage.removeItem('sync_queue');
    console.log('🗑️ Sync queue cleared');
  }

  /**
   * Prefetch critical data
   */
  public async prefetchCriticalData(): Promise<void> {
    if (!this.isOnline) return;

    console.log('🔄 Prefetching critical data...');

    for (const endpoint of this.config.criticalEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          await this.cacheData(endpoint, data, { priority: 'critical' });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to prefetch ${endpoint}:`, error);
      }
    }

    console.log('✅ Critical data prefetch completed');
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Hook for using offline manager in React components
export const useOfflineManager = () => {
  const [status, setStatus] = React.useState(offlineManager.getStatus());

  React.useEffect(() => {
    const updateStatus = () => setStatus(offlineManager.getStatus());

    window.addEventListener('connectionChange', updateStatus);
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => {
      window.removeEventListener('connectionChange', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return {
    ...status,
    cacheData: offlineManager.cacheData.bind(offlineManager),
    getCachedData: offlineManager.getCachedData.bind(offlineManager),
    addToSyncQueue: offlineManager.addToSyncQueue.bind(offlineManager),
    clearCache: offlineManager.clearCache.bind(offlineManager),
    clearSyncQueue: offlineManager.clearSyncQueue.bind(offlineManager),
    prefetchCriticalData: offlineManager.prefetchCriticalData.bind(offlineManager)
  };
};

export default offlineManager;