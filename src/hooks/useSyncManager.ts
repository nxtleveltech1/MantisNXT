import { useState, useCallback } from 'react';

interface SyncState {
  isPreviewOpen: boolean;
  isProgressVisible: boolean;
  jobId: string | null;
  currentEntityType: string | null;
  syncType: 'woocommerce' | 'odoo';
}

interface UseSyncManagerReturn {
  state: SyncState;
  openPreview: (syncType: 'woocommerce' | 'odoo', entityType: string) => void;
  closePreview: () => void;
  startProgress: (jobId: string, syncType: 'woocommerce' | 'odoo', entityType: string) => void;
  hideProgress: () => void;
  resetSync: () => void;
}

export function useSyncManager(): UseSyncManagerReturn {
  const [state, setState] = useState<SyncState>({
    isPreviewOpen: false,
    isProgressVisible: false,
    jobId: null,
    currentEntityType: null,
    syncType: 'woocommerce',
  });

  const openPreview = useCallback((syncType: 'woocommerce' | 'odoo', entityType: string) => {
    setState((prev) => ({
      ...prev,
      isPreviewOpen: true,
      currentEntityType: entityType,
      syncType,
    }));
  }, []);

  const closePreview = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPreviewOpen: false,
    }));
  }, []);

  const startProgress = useCallback(
    (jobId: string, syncType: 'woocommerce' | 'odoo', entityType: string) => {
      setState((prev) => ({
        ...prev,
        isProgressVisible: true,
        jobId,
        syncType,
        currentEntityType: entityType,
      }));
    },
    []
  );

  const hideProgress = useCallback(() => {
    setState((prev) => ({
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
    });
  }, []);

  return {
    state,
    openPreview,
    closePreview,
    startProgress,
    hideProgress,
    resetSync,
  };
}
