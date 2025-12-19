'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  deliveryId?: string;
  timestamp?: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  deliveryId?: string; // Optional delivery ID for filtering
}

/**
 * useWebSocket hook using Server-Sent Events (SSE)
 * Next.js doesn't natively support WebSocket servers, so we use SSE instead
 */
export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const clientIdRef = useRef(Math.random().toString(36).substring(2, 11));

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    deliveryId,
  } = options;

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setConnectionStatus('connecting');

    try {
      // Build SSE URL
      const sseUrl = new URL(url, window.location.origin);
      if (deliveryId) {
        sseUrl.searchParams.set('deliveryId', deliveryId);
      }
      sseUrl.searchParams.set('clientId', clientIdRef.current);

      // Create EventSource for SSE
      const eventSource = new EventSource(sseUrl.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('error');
        onError?.(error as Event);

        // Close and attempt reconnection
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setIsConnected(false);
          setConnectionStatus('disconnected');
          onDisconnect?.();
        }
      };
    } catch (error) {
      setConnectionStatus('error');
      onError?.(error as Event);

      // Attempt reconnection
      if (reconnectAttemptsRef.current < reconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [url, deliveryId, onConnect, onError, onDisconnect, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    onDisconnect?.();
  }, [onDisconnect]);

  const sendMessage = useCallback(
    async (message: WebSocketMessage) => {
      if (!isConnected) {
        console.warn('Connection not established');
        return false;
      }

      try {
        // Send message via POST to the API
        const apiUrl = url.replace('/api/v1/logistics/websocket', '/api/v1/logistics/websocket');
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...message,
            clientId: clientIdRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.type) {
          setLastMessage(result);
          onMessage?.(result);
        }

        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    },
    [isConnected, url, onMessage]
  );

  // Legacy simulateMessage for backward compatibility
  const simulateMessage = useCallback(
    (message: WebSocketMessage) => {
      setLastMessage(message);
      onMessage?.(message);
    },
    [onMessage]
  );

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    simulateMessage, // Kept for backward compatibility
    clientId: clientIdRef.current,
  };
}

