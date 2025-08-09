import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, SignalUpdate, MarketUpdate, SystemStatus } from '@shared/schema';

interface UseWebSocketOptions {
  onSignalUpdate?: (signal: SignalUpdate['data']) => void;
  onMarketUpdate?: (market: MarketUpdate['data']) => void;
  onSystemStatus?: (status: SystemStatus['data']) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        options.onConnectionChange?.(true);
      };

      ws.current.onmessage = (event) => {
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

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        options.onConnectionChange?.(false);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Disable auto-reconnection to stop connection loops
        // if (reconnectAttempts.current < maxReconnectAttempts) {
        //   const delay = 5000; // Fixed 5 second delay
        //   reconnectAttempts.current++;
        //   
        //   reconnectTimeout.current = setTimeout(() => {
        //     console.log(`Reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
        //     connect();
        //   }, delay);
        // }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    options.onConnectionChange?.(false);
  }, [options]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    latency,
    connect,
    disconnect,
    sendMessage
  };
}
