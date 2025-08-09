import { TradingSignal } from '@shared/schema';

export interface ExchangeRateData {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  rates: Record<string, number>;
}

export interface ForexPair {
  base: string;
  quote: string;
  symbol: string;
  rate: number;
  timestamp: number;
  change24h?: number;
  volume?: number;
}

export class ExchangeRateService {
  private baseUrl = 'https://api.exchangerate-api.com/v4';
  private lastUpdate = 0;
  private cache = new Map<string, ExchangeRateData>();
  private rateLimitDelay = 1000; // 1 second between requests to be respectful
  
  // Major forex pairs to monitor
  private readonly majorPairs = [
    { base: 'EUR', quote: 'USD', symbol: 'EUR/USD' },
    { base: 'GBP', quote: 'USD', symbol: 'GBP/USD' },
    { base: 'USD', quote: 'JPY', symbol: 'USD/JPY' },
    { base: 'USD', quote: 'CHF', symbol: 'USD/CHF' },
    { base: 'AUD', quote: 'USD', symbol: 'AUD/USD' },
    { base: 'USD', quote: 'CAD', symbol: 'USD/CAD' },
    { base: 'NZD', quote: 'USD', symbol: 'NZD/USD' },
    { base: 'EUR', quote: 'GBP', symbol: 'EUR/GBP' },
    { base: 'EUR', quote: 'JPY', symbol: 'EUR/JPY' },
    { base: 'GBP', quote: 'JPY', symbol: 'GBP/JPY' }
  ];
  
  private onSignalCallback?: (signal: TradingSignal) => void;
  private onMarketUpdateCallback?: (update: any) => void;
  private onSystemStatusCallback?: (status: any) => void;
  
  private isRunning = false;
  private updateInterval?: NodeJS.Timeout;
  private currentPairs: ForexPair[] = [];

  constructor() {
    console.log('ExchangeRate-API service initialized');
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
      
      // Initial data fetch
      await this.fetchAllRates();
      
      // Set up periodic updates (every 5 minutes to respect rate limits)
      this.updateInterval = setInterval(async () => {
        try {
          await this.fetchAllRates();
        } catch (error) {
          console.error('Error during periodic update:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      this.onSystemStatusCallback?.({
        connected: true,
        mode: 'live',
        provider: 'ExchangeRate-API',
        pairs: this.majorPairs.length,
        lastUpdate: new Date().toISOString(),
        rateLimit: {
          current: 0,
          max: 1500, // Daily limit estimate
          resetTime: 'Daily reset'
        }
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

  private async fetchRatesForBase(base: string): Promise<ExchangeRateData> {
    const cacheKey = base;
    const now = Date.now();
    
    // Check cache (valid for 5 minutes)
    const cached = this.cache.get(cacheKey);
    if (cached && (now - this.lastUpdate) < 5 * 60 * 1000) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/latest/${base}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: ExchangeRateData = await response.json();
      
      if (data.result !== 'success') {
        throw new Error(`API Error: ${data.result}`);
      }
      
      this.cache.set(cacheKey, data);
      this.lastUpdate = now;
      
      return data;
    } catch (error) {
      console.error(`Error fetching rates for ${base}:`, error);
      throw error;
    }
  }

  private async fetchAllRates(): Promise<void> {
    try {
      const bases = ['USD', 'EUR', 'GBP']; // Fetch major bases to get all pairs
      const ratePromises = bases.map(base => this.fetchRatesForBase(base));
      
      // Stagger requests to be respectful of rate limits
      const rateData: ExchangeRateData[] = [];
      for (const promise of ratePromises) {
        const data = await promise;
        rateData.push(data);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
      
      // Process the rate data into forex pairs
      this.procesRateData(rateData);
      
      // Broadcast market update
      this.onMarketUpdateCallback?.({
        timestamp: new Date().toISOString(),
        pairs: this.currentPairs,
        provider: 'ExchangeRate-API'
      });
      
    } catch (error) {
      console.error('Error fetching all rates:', error);
      throw error;
    }
  }

  private procesRateData(rateDataArray: ExchangeRateData[]): void {
    const updatedPairs: ForexPair[] = [];
    const timestamp = Date.now();
    
    for (const rateData of rateDataArray) {
      const baseCode = rateData.base_code;
      
      // Find pairs that match this base
      for (const pair of this.majorPairs) {
        if (pair.base === baseCode && rateData.rates[pair.quote]) {
          const rate = rateData.rates[pair.quote];
          
          updatedPairs.push({
            base: pair.base,
            quote: pair.quote,
            symbol: pair.symbol,
            rate: rate,
            timestamp: timestamp
          });
        }
        // Handle reverse pairs (e.g., USD/EUR from EUR base)
        else if (pair.quote === baseCode && rateData.rates[pair.base]) {
          const reverseRate = 1 / rateData.rates[pair.base];
          
          updatedPairs.push({
            base: pair.base,
            quote: pair.quote,
            symbol: pair.symbol,
            rate: reverseRate,
            timestamp: timestamp
          });
        }
      }
    }
    
    // Calculate price changes if we have previous data
    for (const newPair of updatedPairs) {
      const oldPair = this.currentPairs.find(p => p.symbol === newPair.symbol);
      if (oldPair) {
        const change = ((newPair.rate - oldPair.rate) / oldPair.rate) * 100;
        newPair.change24h = change;
      }
    }
    
    this.currentPairs = updatedPairs;
    
    console.log(`Updated ${updatedPairs.length} forex pairs from ExchangeRate-API`);
  }

  // Get current rates for a specific pair
  getCurrentRate(symbol: string): ForexPair | null {
    return this.currentPairs.find(pair => pair.symbol === symbol) || null;
  }

  // Get all current pairs
  getAllPairs(): ForexPair[] {
    return [...this.currentPairs];
  }

  // Check if service is connected
  isConnected(): boolean {
    return this.isRunning;
  }

  // Get service status
  getStatus() {
    return {
      connected: this.isRunning,
      provider: 'ExchangeRate-API',
      pairsCount: this.currentPairs.length,
      lastUpdate: this.lastUpdate,
      cacheSize: this.cache.size
    };
  }
}