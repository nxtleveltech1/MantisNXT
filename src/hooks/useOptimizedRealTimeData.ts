/**
 * Optimized Real-Time Data Hook
 * Enhanced version with better debouncing, error handling, and performance optimizations
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface OptimizedRealTimeDataOptions {
  table: string;
  autoReconnect?: boolean;
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  onError?: (error: Error) => void;
  onUpdate?: (data: unknown) => void;
}

interface RealTimeDataState<T = unknown> {
  data: T | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  retryCount: number;
}

export function useOptimizedRealTimeData<T = unknown>({
  table,
  autoReconnect = true,
  debounceMs = 1000,
  maxRetries = 3,
  retryDelayMs = 2000,
  onError,
  onUpdate,
}: OptimizedRealTimeDataOptions) {
  const [state, setState] = useState<RealTimeDataState<T>>({
    data: null,
    connected: false,
    loading: false,
    error: null,
    lastUpdate: null,
    retryCount: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});

  /**
   * Debounced update handler to prevent excessive re-renders
   */
  const debouncedUpdate = useCallback(
    (data: T) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (isUnmountedRef.current) return;

        setState(prev => ({
          ...prev,
          data,
          lastUpdate: new Date(),
          error: null,
        }));

        onUpdate?.(data);
      }, debounceMs);
    },
    [debounceMs, onUpdate]
  );

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current || !autoReconnect) return;

    setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));

    const delay = retryDelayMs * Math.pow(2, state.retryCount);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      console.log(
        `🔄 Attempting to reconnect to table: ${table} (attempt ${state.retryCount + 1})`
      );
      connectRef.current();
    }, delay);
  }, [autoReconnect, retryDelayMs, state.retryCount, table]);

  /**
   * Connect to WebSocket with error handling
   */
  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      // Create new WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/tables/${table}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        if (isUnmountedRef.current) return;

        setState(prev => ({
          ...prev,
          connected: true,
          loading: false,
          retryCount: 0,
          error: null,
        }));

        console.log(`✅ Connected to real-time data for table: ${table}`);
      };

      wsRef.current.onmessage = event => {
        if (isUnmountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          debouncedUpdate(data);
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
          setState(prev => ({
            ...prev,
            error: 'Failed to parse real-time data',
          }));
        }
      };

      wsRef.current.onclose = event => {
        if (isUnmountedRef.current) return;

        setState(prev => ({ ...prev, connected: false, loading: false }));

        if (event.wasClean) {
          console.log(`🔌 WebSocket connection closed cleanly for table: ${table}`);
        } else {
          console.warn(`⚠️ WebSocket connection lost for table: ${table}`);

          if (autoReconnect && state.retryCount < maxRetries) {
            scheduleReconnect();
          }
        }
      };

      wsRef.current.onerror = error => {
        if (isUnmountedRef.current) return;

        const errorMsg = `WebSocket error for table ${table}`;
        console.error('❌', errorMsg, error);

        setState(prev => ({
          ...prev,
          connected: false,
          loading: false,
          error: errorMsg,
        }));

        onError?.(new Error(errorMsg));
      };
    } catch (err) {
      const errorMsg = `Failed to connect to real-time data for table ${table}`;
      console.error('❌', errorMsg, err);

      setState(prev => ({
        ...prev,
        connected: false,
        loading: false,
        error: errorMsg,
      }));

      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [
    autoReconnect,
    debouncedUpdate,
    maxRetries,
    onError,
    scheduleReconnect,
    state.retryCount,
    table,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  /**
   * Manual reconnection
   */
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setState(prev => ({ ...prev, retryCount: 0 }));
    connect();
  }, [connect]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState(prev => ({ ...prev, connected: false }));
  }, []);

  /**
   * Initial connection
   */
  useEffect(() => {
    connect();

    return () => {
      isUnmountedRef.current = true;
      disconnect();

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [connect, disconnect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  return {
    ...state,
    reconnect,
    disconnect,
    isRetrying: state.retryCount > 0 && state.retryCount < maxRetries,
    canRetry: state.retryCount < maxRetries,
  };
}
