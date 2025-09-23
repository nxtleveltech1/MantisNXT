/**
 * Real-Time Data Hook for Live Database Integration
 * Connects React components to live database with WebSocket updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RealTimeConfig {
  table: string;
  organizationId?: string;
  userId?: string;
  filters?: Record<string, any>;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface RealTimeMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'heartbeat';
  data?: any;
  timestamp: string;
  clientId: string;
}

export interface RealTimeData<T = any> {
  data: T[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  lastUpdate: string | null;
}

export interface UseRealTimeDataReturn<T = any> extends RealTimeData<T> {
  subscribe: (config: RealTimeConfig) => void;
  unsubscribe: (table?: string) => void;
  refresh: () => Promise<void>;
  sendMessage: (message: any) => void;
}

/**
 * Hook for real-time database integration
 */
export function useRealTimeData<T = any>(
  initialConfig?: RealTimeConfig
): UseRealTimeDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<RealTimeConfig | null>(initialConfig || null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://${window.location.host}/ws`
        : `ws://localhost:3001`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔌 Connected to real-time server');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to initial config if provided
        if (configRef.current) {
          subscribe(configRef.current);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: RealTimeMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
          setError('Invalid message received');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 Disconnected from real-time server');
        setConnected(false);

        // Auto-reconnect if enabled and not a clean close
        if (configRef.current?.autoReconnect !== false && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('Connection error');
        setConnected(false);
      };

    } catch (err) {
      console.error('❌ Failed to connect to WebSocket:', err);
      setError('Failed to connect');
      scheduleReconnect();
    }
  }, []);

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;

    console.log(`🔄 Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((message: RealTimeMessage) => {
    switch (message.type) {
      case 'data':
        if (message.data?.operation) {
          handleDataUpdate(message.data);
        } else {
          console.log('📡 Server message:', message.data);
        }
        break;

      case 'error':
        console.error('❌ Server error:', message.data?.error);
        setError(message.data?.error || 'Unknown server error');
        break;

      case 'heartbeat':
        // Update last seen timestamp
        setLastUpdate(message.timestamp);
        break;

      default:
        console.log('📡 Unknown message type:', message.type);
    }
  }, []);

  /**
   * Handle real-time data updates
   */
  const handleDataUpdate = useCallback((updateData: any) => {
    const { operation, table, record } = updateData;

    if (!configRef.current || configRef.current.table !== table) {
      return;
    }

    setData((prevData) => {
      let newData = [...prevData];

      switch (operation) {
        case 'INSERT':
          // Add new record if not already present
          if (!newData.find((item: any) => item.id === record.id)) {
            newData.unshift(record);
          }
          break;

        case 'UPDATE':
          // Update existing record
          const updateIndex = newData.findIndex((item: any) => item.id === record.id);
          if (updateIndex !== -1) {
            newData[updateIndex] = record;
          }
          break;

        case 'DELETE':
          // Remove deleted record
          newData = newData.filter((item: any) => item.id !== record.id);
          break;

        default:
          console.warn('Unknown operation:', operation);
      }

      return newData;
    });

    setLastUpdate(updateData.timestamp);
  }, []);

  /**
   * Subscribe to table updates
   */
  const subscribe = useCallback((config: RealTimeConfig) => {
    configRef.current = config;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('🔄 WebSocket not ready, will subscribe when connected');
      return;
    }

    const message = {
      type: 'subscribe',
      table: config.table,
      data: {
        organizationId: config.organizationId,
        userId: config.userId,
        filters: config.filters || {}
      },
      timestamp: new Date().toISOString(),
      clientId: 'web-client'
    };

    wsRef.current.send(JSON.stringify(message));
    console.log(`📡 Subscribed to ${config.table}`);
  }, []);

  /**
   * Unsubscribe from table updates
   */
  const unsubscribe = useCallback((table?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'unsubscribe',
      table: table || configRef.current?.table,
      timestamp: new Date().toISOString(),
      clientId: 'web-client'
    };

    wsRef.current.send(JSON.stringify(message));
    console.log(`📡 Unsubscribed from ${table || 'all tables'}`);

    if (!table) {
      configRef.current = null;
    }
  }, []);

  /**
   * Refresh data from API
   */
  const refresh = useCallback(async () => {
    if (!configRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/${configRef.current.table}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data?.data || result.data || []);
        setLastUpdate(new Date().toISOString());
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }

    } catch (err) {
      console.error('❌ Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send custom message to server
   */
  const sendMessage = useCallback((messageData: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot send message');
      return;
    }

    const message = {
      ...messageData,
      timestamp: new Date().toISOString(),
      clientId: 'web-client'
    };

    wsRef.current.send(JSON.stringify(message));
  }, []);

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  /**
   * Fetch initial data if config provided
   */
  useEffect(() => {
    if (initialConfig) {
      refresh();
    }
  }, [initialConfig, refresh]);

  return {
    data,
    loading,
    error,
    connected,
    lastUpdate,
    subscribe,
    unsubscribe,
    refresh,
    sendMessage
  };
}

export default useRealTimeData;