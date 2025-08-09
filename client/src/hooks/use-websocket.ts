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
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Robust URL construction for Replit environment
    const isSecure = window.location.protocol === "https:";
    const protocol = isSecure ? "wss:" : "ws:";
    
    // Use the same host and port as the current page
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log(`Connecting to WebSocket: ${wsUrl} (Protocol: ${protocol}, Host: ${host})`);

    try {
      // Close any existing connection first
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log(`WebSocket connected successfully to ${wsUrl}`);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        options.onConnectionChange?.(true);
        
        // Start heartbeat with longer interval to reduce connection churn
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            const pingTime = Date.now();
            ws.current.send(JSON.stringify({ type: 'ping', timestamp: pingTime }));
          }
        }, 30000); // 30 seconds
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

      ws.current.onclose = (event) => {
        console.log(`WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
        setIsConnected(false);
        options.onConnectionChange?.(false);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Only reconnect if it wasn't a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000)); // Exponential backoff, max 10s
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached');
        }
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
