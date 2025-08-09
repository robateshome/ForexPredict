import { TradingSignal } from '@shared/schema';

export interface ForexRate {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  change24h?: number;
}

export interface ExchangeRateResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  time_eol_unix: number;
  base_code: string;
  rates: Record<string, number>;
}

// Real-time forex service using ExchangeRate-API for live data
export class ForexService {
  private baseUrl = 'https://open.er-api.com/v6';
  private onSignalCallback?: (signal: TradingSignal) => void;
  private onMarketUpdateCallback?: (update: any) => void;
  private onSystemStatusCallback?: (status: any) => void;
  
  private isRunning = false;
  private updateInterval?: NodeJS.Timeout;
  private currentRates = new Map<string, ForexRate>();
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly rateLimitDelay = 3600000; // 1 hour between requests (free tier limit)

  // Major forex pairs to monitor
  private readonly subscribedPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 
    'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'
  ];

  constructor() {
    console.log('ExchangeRate-API Forex service initialized');
  }

  setCallbacks(
    onSignal: (signal: TradingSignal) => void,
    onMarketUpdate: (update: any) => void,
    onSystemStatus: (status: any) => void
  ) {
    this.onSignalCallback = onSignal;
    this.onMarketUpdateCallback = onMarketUpdate;
    this.onSystemStatusCallback = onSystemStatus;
  }

  async connect(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      this.isRunning = true;
      console.log('Connecting to ExchangeRate-API...');
      
      // Test connection with initial data fetch
      await this.fetchLatestRates();
      
      // Set up periodic updates (every hour to respect free tier limits)
      this.updateInterval = setInterval(async () => {
        try {
          await this.fetchLatestRates();
        } catch (error) {
          console.error('Error during periodic update:', error);
        }
      }, this.rateLimitDelay);
      
      this.onSystemStatusCallback?.({
        connected: true,
        mode: 'live',
        provider: 'ExchangeRate-API',
        rateLimit: {
          current: this.requestCount,
          max: 24, // Free tier: once per day per base currency
          resetTime: '24 hours'
        },
        uptime: Date.now()
      });
      
      console.log('Connected to ExchangeRate-API successfully');
    } catch (error) {
      console.error('Failed to connect to ExchangeRate-API:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    console.log('Disconnected from ExchangeRate-API');
  }

  private async fetchLatestRates(): Promise<void> {
    try {
      // Respect rate limiting
      const now = Date.now();
      if (now - this.lastRequestTime < this.rateLimitDelay) {
        console.log('Rate limited, skipping request');
        return;
      }

      // Fetch USD-based rates first
      const usdResponse = await fetch(`${this.baseUrl}/latest/USD`);
      this.lastRequestTime = Date.now();
      this.requestCount++;

      if (!usdResponse.ok) {
        throw new Error(`HTTP ${usdResponse.status}: ${usdResponse.statusText}`);
      }

      const usdData: ExchangeRateResponse = await usdResponse.json();
      
      if (usdData.result !== 'success') {
        throw new Error(`API Error: ${usdData.result}`);
      }

      // Process the rate data
      this.processRateData(usdData);

      // Broadcast market update
      this.onMarketUpdateCallback?.({
        timestamp: new Date().toISOString(),
        rates: Array.from(this.currentRates.values()),
        provider: 'ExchangeRate-API',
        requestCount: this.requestCount,
        lastUpdate: usdData.time_last_update_utc,
        nextUpdate: usdData.time_next_update_utc
      });

    } catch (error) {
      console.error('Error fetching latest rates:', error);
      
      // If we have cached data, continue with that
      if (this.currentRates.size === 0) {
        throw error;
      }
    }
  }

  private processRateData(usdData: ExchangeRateResponse): void {
    const timestamp = Date.now();
    const updatedRates = new Map<string, ForexRate>();

    // Process USD-based pairs
    const usdRates = usdData.rates;
    for (const pair of this.subscribedPairs) {
      const [base, quote] = pair.split('/');
      
      if (base === 'USD' && usdRates[quote]) {
        const rate = usdRates[quote];
        const spread = rate * 0.0002; // Approximate 2 pip spread
        
        updatedRates.set(pair, {
          symbol: pair,
          bid: rate - spread,
          ask: rate + spread,
          spread: spread * 2,
          timestamp: timestamp,
          change24h: this.calculateChange(pair, rate)
        });
      }
      else if (quote === 'USD' && usdRates[base]) {
        const rate = 1 / usdRates[base];
        const spread = rate * 0.0002;
        
        updatedRates.set(pair, {
          symbol: pair,
          bid: rate - spread,
          ask: rate + spread,
          spread: spread * 2,
          timestamp: timestamp,
          change24h: this.calculateChange(pair, rate)
        });
      }
      // Handle cross pairs (EUR/GBP)
      else if (base === 'EUR' && quote === 'GBP' && usdRates.EUR && usdRates.GBP) {
        const eurToUsd = 1 / usdRates.EUR;
        const gbpToUsd = 1 / usdRates.GBP;
        const rate = eurToUsd / gbpToUsd;
        const spread = rate * 0.0003; // Slightly higher spread for cross pairs
        
        updatedRates.set(pair, {
          symbol: pair,
          bid: rate - spread,
          ask: rate + spread,
          spread: spread * 2,
          timestamp: timestamp,
          change24h: this.calculateChange(pair, rate)
        });
      }
    }

    this.currentRates = updatedRates;
    console.log(`Updated ${updatedRates.size} forex rates from ExchangeRate-API`);
  }

  private calculateChange(symbol: string, currentRate: number): number {
    const previousRate = this.currentRates.get(symbol);
    if (!previousRate) {
      return 0;
    }
    
    const midRate = (previousRate.bid + previousRate.ask) / 2;
    return ((currentRate - midRate) / midRate) * 100;
  }

  async subscribe(pairs: string[]): Promise<void> {
    console.log('Subscribed to pairs:', pairs);
    // Update subscribed pairs list
    this.subscribedPairs.push(...pairs.filter(p => !this.subscribedPairs.includes(p)));
  }

  async unsubscribe(pairs: string[]): Promise<void> {
    console.log('Unsubscribed from pairs:', pairs);
    // Remove from subscribed pairs
    pairs.forEach(pair => {
      const index = this.subscribedPairs.indexOf(pair);
      if (index > -1) {
        this.subscribedPairs.splice(index, 1);
      }
    });
  }

  getCurrentRate(symbol: string): ForexRate | null {
    return this.currentRates.get(symbol) || null;
  }

  getAllRates(): ForexRate[] {
    return Array.from(this.currentRates.values());
  }

  isConnected(): boolean {
    return this.isRunning;
  }

  getConnectionStatus() {
    return {
      connected: this.isRunning,
      provider: 'ExchangeRate-API',
      mode: 'live',
      subscriptions: this.subscribedPairs,
      ratesCount: this.currentRates.size,
      requestCount: this.requestCount,
      rateLimit: {
        current: this.requestCount,
        max: 24,
        resetTime: '24 hours'
      },
      lastUpdate: this.lastRequestTime
    };
  }
}