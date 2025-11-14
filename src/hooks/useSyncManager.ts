import { useState, useCallback } from 'react';

interface SyncState {
  isPreviewOpen: boolean;
  isProgressVisible: boolean;
  jobId: string | null;
  currentEntityType: string | null;
  syncType: 'woocommerce' | 'odoo';
  direction: 'inbound' | 'outbound';
}

interface UseSyncManagerReturn {
  state: SyncState;
  openPreview: (
    syncType: 'woocommerce' | 'odoo',
    entityType: string,
    direction?: 'inbound' | 'outbound'
  ) => void;
  closePreview: () => void;
  startProgress: (
    jobId: string,
    syncType: 'woocommerce' | 'odoo',
    entityType: string,
    direction?: 'inbound' | 'outbound'
  ) => void;
  hideProgress: () => void;
  resetSync: () => void;
  setDirection: (direction: 'inbound' | 'outbound') => void;
}

export function useSyncManager(): UseSyncManagerReturn {
  const [state, setState] = useState<SyncState>({
    isPreviewOpen: false,
    isProgressVisible: false,
    jobId: null,
    currentEntityType: null,
    syncType: 'woocommerce',
    direction: 'inbound',
  });

  const openPreview = useCallback(
    (
      syncType: 'woocommerce' | 'odoo',
      entityType: string,
      direction: 'inbound' | 'outbound' = 'inbound'
    ) => {
      setState(prev => ({
        ...prev,
        isPreviewOpen: true,
        currentEntityType: entityType,
        syncType,
        direction,
      }));
    },
    []
  );

  const closePreview = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPreviewOpen: false,
    }));
  }, []);

  const startProgress = useCallback(
    (
      jobId: string,
      syncType: 'woocommerce' | 'odoo',
      entityType: string,
      direction: 'inbound' | 'outbound' = 'inbound'
    ) => {
      setState(prev => ({
        ...prev,
        isProgressVisible: true,
        jobId,
        syncType,
        currentEntityType: entityType,
        direction,
      }));
    },
    []
  );

  const hideProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      isProgressVisible: false,
    }));
  }, []);

  const resetSync = useCallback(() => {
    setState({
      isPreviewOpen: false,
      isProgressVisible: false,
      jobId: null,
      currentEntityType: null,
      syncType: 'woocommerce',
      direction: 'inbound',
    });
  }, []);

  const setDirection = useCallback((nextDirection: 'inbound' | 'outbound') => {
    setState(prev => ({
      ...prev,
      direction: nextDirection,
    }));
  }, []);

  return {
    state,
    openPreview,
    closePreview,
    startProgress,
    hideProgress,
    resetSync,
    setDirection,
  };
}
