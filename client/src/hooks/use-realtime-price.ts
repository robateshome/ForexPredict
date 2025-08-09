import { useState, useEffect, useRef, useCallback } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface UseRealtimePriceOptions {
  symbols: string[];
  updateInterval?: number;
  debounceMs?: number;
}

export function useRealtimePrice({ symbols, updateInterval = 5000, debounceMs = 100 }: UseRealtimePriceOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const fetchPrices = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/forex/rates', {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.rates) {
        // Clear debounce timer
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        
        // Debounce price updates
        debounceRef.current = setTimeout(() => {
          setPrices(prevPrices => {
            const newPrices = { ...prevPrices };
            
            symbols.forEach(symbol => {
              const [base, quote] = symbol.split('/');
              const rate = data.rates[quote] / data.rates[base];
              
              if (rate && !isNaN(rate)) {
                const prevPrice = newPrices[symbol]?.price || rate;
                const change = rate - prevPrice;
                const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
                
                newPrices[symbol] = {
                  symbol,
                  price: rate,
                  change,
                  changePercent,
                  timestamp: Date.now()
                };
              }
            });
            
            return newPrices;
          });
          
          setIsConnected(true);
          setError(null);
          setIsLoading(false);
        }, debounceMs);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Price fetch error:', err);
        setError(err.message);
        setIsConnected(false);
      }
    }
  }, [symbols, debounceMs]);

  const startPolling = useCallback(() => {
    fetchPrices(); // Initial fetch
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(fetchPrices, updateInterval);
  }, [fetchPrices, updateInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  useEffect(() => {
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  // Handle visibility change to pause/resume polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling]);

  return {
    prices,
    isLoading,
    error,
    isConnected,
    refetch: fetchPrices
  };
}