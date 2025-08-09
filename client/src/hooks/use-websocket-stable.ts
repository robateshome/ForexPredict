import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, SignalUpdate, MarketUpdate, SystemStatus } from '@shared/schema';

interface UseWebSocketOptions {
  onSignalUpdate?: (signal: SignalUpdate['data']) => void;
  onMarketUpdate?: (market: MarketUpdate['data']) => void;
  onSystemStatus?: (status: SystemStatus['data']) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useWebSocketStable(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 3;

  const cleanupConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED)) {
      return;
    }

    isConnectingRef.current = true;
    cleanupConnection();

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        options.onConnectionChange?.(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          if (message.type === 'pong') {
            const now = Date.now();
            const pingTime = message.data?.timestamp || now;
            setLatency(now - pingTime);
            return;
          }

          switch (message.type) {
            case 'signal_update':
              options.onSignalUpdate?.(message.data);
              break;
            case 'market_update':
              options.onMarketUpdate?.(message.data);
              break;
            case 'system_status':
              options.onSystemStatus?.(message.data);
              break;
            default:
              console.log('Received message:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
        setIsConnected(false);
        isConnectingRef.current = false;
        options.onConnectionChange?.(false);

        // Only reconnect on unexpected closures
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(5000 + (reconnectAttemptsRef.current * 2000), 15000);
          console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.log('Max reconnection attempts reached or normal closure');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [options, cleanupConnection]);

  const disconnect = useCallback(() => {
    cleanupConnection();
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnection
    options.onConnectionChange?.(false);
  }, [cleanupConnection, options]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const connectTimer = setTimeout(() => {
      connect();
    }, 1000); // Delay initial connection

    return () => {
      clearTimeout(connectTimer);
      cleanupConnection();
    };
  }, [connect, cleanupConnection]);

  return {
    isConnected,
    latency,
    connect,
    disconnect,
    sendMessage
  };
}