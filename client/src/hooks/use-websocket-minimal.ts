import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, SignalUpdate, MarketUpdate, SystemStatus } from '@shared/schema';

interface UseWebSocketOptions {
  onSignalUpdate?: (signal: SignalUpdate['data']) => void;
  onMarketUpdate?: (market: MarketUpdate['data']) => void;
  onSystemStatus?: (status: SystemStatus['data']) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useWebSocketMinimal(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
    setIsConnected(false);
    isConnectingRef.current = false;
    options.onConnectionChange?.(false);
  }, [options]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnectingRef.current = true;
    
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        isConnectingRef.current = false;
        options.onConnectionChange?.(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

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
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        isConnectingRef.current = false;
        options.onConnectionChange?.(false);
        // No automatic reconnection to prevent loops
      };

      wsRef.current.onerror = () => {
        setIsConnected(false);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [options]);

  useEffect(() => {
    // Single connection attempt on mount
    connect();
    
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - no reconnection logic

  return {
    isConnected,
    connect,
    disconnect
  };
}