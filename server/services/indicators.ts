export interface IndicatorValue {
  timestamp: number;
  value: number;
}

export interface IndicatorResult {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number; };
  stochastic: { k: number; d: number; };
  ema: { fast: number; slow: number; };
  adx: number;
}

export class TechnicalIndicators {
  
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI using Wilder's smoothing
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  static calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    if (prices.length < slowPeriod) {
      return { macd: 0, signal: 0, histogram: 0 };
    }
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;
    
    // For signal line, we'd need MACD history, simplified here
    const signal = macdLine * 0.9; // Simplified
    const histogram = macdLine - signal;
    
    return { macd: macdLine, signal, histogram };
  }
  
  static calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3) {
    if (closes.length < kPeriod) {
      return { k: 50, d: 50 };
    }
    
    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Simplified D calculation
    const d = k * 0.95; // Simplified
    
    return { k: k || 50, d: d || 50 };
  }
  
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  static calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 25;
    
    // Simplified ADX calculation
    let totalTrueRange = 0;
    let totalDMPlus = 0;
    let totalDMMinus = 0;
    
    for (let i = 1; i < Math.min(closes.length, period + 1); i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];
      
      const dmPlus = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
      const dmMinus = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
      
      const trueRange = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      
      totalTrueRange += trueRange;
      totalDMPlus += dmPlus;
      totalDMMinus += dmMinus;
    }
    
    if (totalTrueRange === 0) return 25;
    
    const diPlus = (totalDMPlus / totalTrueRange) * 100;
    const diMinus = (totalDMMinus / totalTrueRange) * 100;
    
    if (diPlus + diMinus === 0) return 25;
    
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    return dx;
  }
  
  static calculateAllIndicators(
    prices: number[],
    highs: number[],
    lows: number[],
    closes: number[]
  ): IndicatorResult {
    return {
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      stochastic: this.calculateStochastic(highs, lows, closes),
      ema: {
        fast: this.calculateEMA(prices, 9),
        slow: this.calculateEMA(prices, 21)
      },
      adx: this.calculateADX(highs, lows, closes)
    };
  }
}
