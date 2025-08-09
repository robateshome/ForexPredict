import { TradingSignal, SystemStatus, MarketUpdate } from '@shared/schema.js';

export class DemoDataService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private signalIntervalId: NodeJS.Timeout | null = null;
  
  private onSignalCallback?: (signal: TradingSignal) => void;
  private onMarketUpdateCallback?: (update: MarketUpdate['data']) => void;
  private onSystemStatusCallback?: (status: SystemStatus['data']) => void;
  
  private basePrice = {
    'EUR/USD': 1.23456,
    'GBP/USD': 1.45789,
    'USD/JPY': 156.234
  };
  
  private lastPrices = { ...this.basePrice };

  setCallbacks(
    onSignal: (signal: TradingSignal) => void,
    onMarketUpdate: (update: MarketUpdate['data']) => void,
    onSystemStatus: (status: SystemStatus['data']) => void
  ) {
    this.onSignalCallback = onSignal;
    this.onMarketUpdateCallback = onMarketUpdate;
    this.onSystemStatusCallback = onSystemStatus;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('Starting demo data service with simulated forex signals');
    
    // Generate market updates every 2 seconds
    this.intervalId = setInterval(() => {
      this.generateMarketUpdate();
    }, 2000);
    
    // Generate trading signals every 8-15 seconds
    this.signalIntervalId = setInterval(() => {
      this.generateTradingSignal();
    }, 8000 + Math.random() * 7000);
    
    // Send system status every 3 seconds
    setInterval(() => {
      this.sendSystemStatus();
    }, 3000);
    
    // Send initial status
    setTimeout(() => this.sendSystemStatus(), 100);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.signalIntervalId) {
      clearInterval(this.signalIntervalId);
      this.signalIntervalId = null;
    }
  }

  private generateMarketUpdate() {
    const pairs = Object.keys(this.basePrice) as Array<keyof typeof this.basePrice>;
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    
    // Generate small random price movement
    const change = (Math.random() - 0.5) * 0.0002;
    const newPrice = this.lastPrices[pair] + change;
    const priceChange = newPrice - this.lastPrices[pair];
    const changePercent = (priceChange / this.lastPrices[pair]) * 100;
    
    this.lastPrices[pair] = newPrice;
    
    if (this.onMarketUpdateCallback) {
      this.onMarketUpdateCallback({
        symbol: pair,
        price: newPrice,
        change: priceChange,
        changePercent: changePercent,
        timestamp: new Date().toISOString()
      });
    }
  }

  private generateTradingSignal() {
    const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
    const signals = ['BUY', 'SELL', 'HOLD'];
    const indicators = ['RSI', 'MACD', 'Stochastic'];
    
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const signal = signals[Math.floor(Math.random() * signals.length)];
    const primaryIndicator = indicators[Math.floor(Math.random() * indicators.length)];
    const confidence = 0.6 + Math.random() * 0.35;
    
    const price = this.lastPrices[pair as keyof typeof this.lastPrices];
    
    let reason = '';
    let stopLoss = null;
    let takeProfit = null;
    let expectedMove = 0;
    
    if (signal === 'BUY') {
      reason = `${primaryIndicator} bullish divergence + EMA crossover + ADX strength (3/3)`;
      stopLoss = price * 0.998;
      takeProfit = price * 1.004;
      expectedMove = 0.3;
    } else if (signal === 'SELL') {
      reason = `${primaryIndicator} bearish divergence + MACD histogram falling + RSI overbought (3/3)`;
      stopLoss = price * 1.002;
      takeProfit = price * 0.996;
      expectedMove = -0.3;
    } else {
      reason = 'Mixed signals - insufficient confirmation for trade entry';
    }

    const tradingSignal: TradingSignal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      pair,
      timeframe: '1m',
      signal: signal as 'BUY' | 'SELL' | 'HOLD',
      confidence,
      reason,
      entryPrice: price,
      entryType: 'market',
      stopLoss,
      takeProfit,
      predictionHorizonMins: 5,
      expectedMovePct: expectedMove,
      indicatorValues: {
        rsi: 30 + Math.random() * 40,
        macd: { macd: (Math.random() - 0.5) * 0.01, signal: (Math.random() - 0.5) * 0.008, histogram: (Math.random() - 0.5) * 0.005 },
        stochastic: { k: 20 + Math.random() * 60, d: 20 + Math.random() * 60 },
        ema: { fast: price * (1 + (Math.random() - 0.5) * 0.001), slow: price * (1 + (Math.random() - 0.5) * 0.001) },
        adx: 15 + Math.random() * 20
      },
      backtestStats: {
        winrate: 0.64 + Math.random() * 0.1,
        avgWinPct: 0.3 + Math.random() * 0.2,
        avgLossPct: 0.2 + Math.random() * 0.15
      }
    };

    if (this.onSignalCallback) {
      this.onSignalCallback(tradingSignal);
    }
  }

  private sendSystemStatus() {
    if (!this.onSystemStatusCallback) return;
    
    const status: SystemStatus['data'] = {
      finnhubConnected: false, // Demo mode - no external connection
      dataProcessing: this.isRunning,
      rateLimit: { current: Math.floor(Math.random() * 15), max: 100 },
      signalEngine: true,
      memoryUsage: { used: 450 + Math.floor(Math.random() * 100), total: 1000 },
      cpuUsage: 15 + Math.random() * 25,
      latency: 25 + Math.random() * 20,
      lastUpdate: new Date().toISOString()
    };
    
    this.onSystemStatusCallback(status);
  }

  getConnectionStatus() {
    return {
      connected: this.isRunning,
      mode: 'demo',
      rateLimit: { current: 0, max: 100 },
      uptime: Date.now()
    };
  }
}