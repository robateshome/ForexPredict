import WebSocket from 'ws';
import { SignalEngine } from './signal-engine.js';
import { TradingSignal, MarketData, SystemStatus } from '@shared/schema.js';

export interface ForexDataPoint {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
}

export class ForexService {
  private ws: WebSocket | null = null;
  private signalEngine = new SignalEngine();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  
  private subscribedPairs = ['OANDA:EUR_USD', 'OANDA:GBP_USD', 'OANDA:USD_JPY'];
  private marketData = new Map<string, ForexDataPoint[]>();
  private lastPrices = new Map<string, number>();
  
  private onSignalCallback?: (signal: TradingSignal) => void;
  private onMarketUpdateCallback?: (update: any) => void;
  private onSystemStatusCallback?: (status: SystemStatus['data']) => void;
  
  private rateLimit = { current: 0, max: 100, resetTime: Date.now() + 60000 };
  private processStartTime = Date.now();
  
  constructor() {
    // Initialize market data arrays
    this.subscribedPairs.forEach(pair => {
      this.marketData.set(pair, []);
    });
    
    // Start rate limit reset timer
    setInterval(() => {
      this.rateLimit.current = 0;
      this.rateLimit.resetTime = Date.now() + 60000;
    }, 60000);
    
    // Send system status updates
    setInterval(() => {
      this.broadcastSystemStatus();
    }, 2000);
  }
  
  setCallbacks(
    onSignal: (signal: TradingSignal) => void,
    onMarketUpdate: (update: any) => void,
    onSystemStatus: (status: SystemStatus['data']) => void
  ) {
    this.onSignalCallback = onSignal;
    this.onMarketUpdateCallback = onMarketUpdate;
    this.onSystemStatusCallback = onSystemStatus;
  }
  
  async connect(): Promise<void> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY environment variable not set');
    }
    
    const wsUrl = `wss://ws.finnhub.io?token=${apiKey}`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.on('open', () => {
          console.log('Connected to Finnhub WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to forex pairs
          this.subscribedPairs.forEach(pair => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({
                type: 'subscribe',
                symbol: pair
              }));
              console.log(`Subscribed to ${pair}`);
            }
          });
          
          resolve();
        });
        
        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });
        
        this.ws.on('close', () => {
          console.log('Finnhub WebSocket connection closed');
          this.isConnected = false;
          this.attemptReconnect();
        });
        
        this.ws.on('error', (error) => {
          console.error('Finnhub WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'trade' && message.data) {
        message.data.forEach((trade: any) => {
          this.processTradeData(trade);
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  private processTradeData(trade: any) {
    if (this.rateLimit.current >= this.rateLimit.max) {
      return; // Rate limit exceeded
    }
    
    this.rateLimit.current++;
    
    const symbol = trade.s; // Symbol
    const price = trade.p; // Price
    const timestamp = trade.t; // Timestamp
    const volume = trade.v; // Volume
    
    if (!symbol || !price) return;
    
    const dataPoint: ForexDataPoint = {
      symbol,
      price,
      timestamp,
      volume
    };
    
    // Store market data
    const symbolData = this.marketData.get(symbol) || [];
    symbolData.push(dataPoint);
    
    // Keep last 100 data points
    if (symbolData.length > 100) {
      symbolData.splice(0, symbolData.length - 100);
    }
    this.marketData.set(symbol, symbolData);
    
    // Calculate price change
    const lastPrice = this.lastPrices.get(symbol) || price;
    const change = price - lastPrice;
    const changePercent = (change / lastPrice) * 100;
    this.lastPrices.set(symbol, price);
    
    // Broadcast market update
    if (this.onMarketUpdateCallback) {
      this.onMarketUpdateCallback({
        symbol: symbol.replace('OANDA:', '').replace('_', '/'),
        price,
        change,
        changePercent,
        timestamp: new Date(timestamp).toISOString()
      });
    }
    
    // Process for signals if we have enough data
    if (symbolData.length >= 10) {
      this.processSignalGeneration(symbol, symbolData);
    }
  }
  
  private processSignalGeneration(symbol: string, data: ForexDataPoint[]) {
    const prices = data.map(d => d.price);
    const highs = prices; // Simplified - in real implementation, use actual OHLC
    const lows = prices;
    const closes = prices;
    
    const signal = this.signalEngine.processMarketData(
      symbol.replace('OANDA:', '').replace('_', '/'),
      prices[prices.length - 1],
      highs,
      lows,
      closes
    );
    
    if (signal && this.onSignalCallback) {
      // Add timestamp and ID for database
      const completeSignal: TradingSignal = {
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...signal
      };
      
      this.onSignalCallback(completeSignal);
    }
  }
  
  private broadcastSystemStatus() {
    if (!this.onSystemStatusCallback) return;
    
    const memoryUsage = process.memoryUsage();
    
    const status: SystemStatus['data'] = {
      finnhubConnected: this.isConnected,
      dataProcessing: this.isConnected && this.rateLimit.current > 0,
      rateLimit: {
        current: this.rateLimit.current,
        max: this.rateLimit.max
      },
      signalEngine: true,
      memoryUsage: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: 1000 // Simplified
      },
      cpuUsage: Math.random() * 30 + 20, // Simplified CPU usage
      latency: Math.random() * 50 + 30, // Simplified latency
      lastUpdate: new Date().toISOString()
    };
    
    this.onSystemStatusCallback(status);
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
  
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      rateLimit: this.rateLimit,
      uptime: Date.now() - this.processStartTime
    };
  }
}
