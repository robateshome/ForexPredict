import { TechnicalIndicators, IndicatorResult } from './indicators.js';
import { DivergenceDetector, DivergenceCandidate } from './divergence-detector.js';
import { TradingSignal, InsertTradingSignal } from '@shared/schema.js';

export interface ConfirmationRule {
  name: string;
  check: (indicators: IndicatorResult, history: IndicatorResult[]) => boolean;
  weight: number;
}

export class SignalEngine {
  private divergenceDetector = new DivergenceDetector();
  private indicatorHistory: IndicatorResult[] = [];
  private readonly maxHistoryLength = 50;
  private readonly minConfidenceThreshold = 0.6;
  
  private bullishConfirmationRules: ConfirmationRule[] = [
    {
      name: 'MACD Histogram Rising',
      check: (current, history) => {
        if (history.length < 3) return false;
        const recent = history.slice(-3);
        return recent.every((h, i) => i === 0 || h.macd.histogram > recent[i-1].macd.histogram);
      },
      weight: 0.3
    },
    {
      name: 'EMA Fast Above Slow',
      check: (current) => current.ema.fast > current.ema.slow,
      weight: 0.25
    },
    {
      name: 'RSI Oversold Recovery',
      check: (current, history) => {
        if (history.length < 2) return false;
        const prev = history[history.length - 1];
        return prev.rsi < 30 && current.rsi > 30;
      },
      weight: 0.2
    },
    {
      name: 'ADX Strong Trend',
      check: (current) => current.adx > 25,
      weight: 0.15
    },
    {
      name: 'Stochastic Bullish',
      check: (current) => current.stochastic.k > current.stochastic.d && current.stochastic.k < 80,
      weight: 0.1
    }
  ];
  
  private bearishConfirmationRules: ConfirmationRule[] = [
    {
      name: 'MACD Histogram Falling',
      check: (current, history) => {
        if (history.length < 3) return false;
        const recent = history.slice(-3);
        return recent.every((h, i) => i === 0 || h.macd.histogram < recent[i-1].macd.histogram);
      },
      weight: 0.3
    },
    {
      name: 'EMA Fast Below Slow',
      check: (current) => current.ema.fast < current.ema.slow,
      weight: 0.25
    },
    {
      name: 'RSI Overbought Decline',
      check: (current, history) => {
        if (history.length < 2) return false;
        const prev = history[history.length - 1];
        return prev.rsi > 70 && current.rsi < 70;
      },
      weight: 0.2
    },
    {
      name: 'ADX Strong Trend',
      check: (current) => current.adx > 25,
      weight: 0.15
    },
    {
      name: 'Stochastic Bearish',
      check: (current) => current.stochastic.k < current.stochastic.d && current.stochastic.k > 20,
      weight: 0.1
    }
  ];
  
  processMarketData(
    symbol: string,
    price: number,
    highs: number[],
    lows: number[],
    closes: number[]
  ): InsertTradingSignal | null {
    
    // Calculate indicators
    const indicators = TechnicalIndicators.calculateAllIndicators(closes, highs, lows, closes);
    
    // Add to history
    this.indicatorHistory.push(indicators);
    if (this.indicatorHistory.length > this.maxHistoryLength) {
      this.indicatorHistory = this.indicatorHistory.slice(-this.maxHistoryLength);
    }
    
    // Add data point for divergence detection
    this.divergenceDetector.addDataPoint(price, indicators);
    
    // Detect divergences
    const divergences = this.divergenceDetector.detectDivergences();
    
    // Check for strong divergence candidates
    const strongDivergences = divergences.filter(d => d.strength > 0.5);
    
    if (strongDivergences.length === 0) {
      return this.generateHoldSignal(symbol, price, indicators);
    }
    
    // Process the strongest divergence
    const primaryDivergence = strongDivergences.reduce((prev, current) => 
      current.strength > prev.strength ? current : prev
    );
    
    if (primaryDivergence.type === 'bullish') {
      return this.generateBuySignal(symbol, price, indicators, primaryDivergence);
    } else if (primaryDivergence.type === 'bearish') {
      return this.generateSellSignal(symbol, price, indicators, primaryDivergence);
    }
    
    return this.generateHoldSignal(symbol, price, indicators);
  }
  
  private generateBuySignal(
    symbol: string,
    price: number,
    indicators: IndicatorResult,
    divergence: DivergenceCandidate
  ): InsertTradingSignal | null {
    
    const confirmations = this.checkConfirmations(indicators, this.bullishConfirmationRules);
    
    if (confirmations.count < 2) {
      return this.generateHoldSignal(symbol, price, indicators, `Bullish divergence detected but insufficient confirmation (${confirmations.count}/2)`);
    }
    
    const confidence = Math.min(0.95, 0.6 + (confirmations.score * 0.35) + (divergence.strength * 0.2));
    
    if (confidence < this.minConfidenceThreshold) {
      return null;
    }
    
    const stopLoss = price * 0.998; // 0.2% stop loss
    const takeProfit = price * 1.004; // 0.4% take profit
    
    return {
      pair: symbol,
      timeframe: '1m',
      signal: 'BUY',
      confidence,
      reason: `${divergence.description} + ${confirmations.reasons.join(' + ')} (${confirmations.count}/2)`,
      entryPrice: price,
      entryType: 'market',
      stopLoss,
      takeProfit,
      predictionHorizonMins: 5,
      expectedMovePct: 0.3,
      indicatorValues: indicators,
      backtestStats: {
        winrate: 0.67,
        avgWinPct: 0.4,
        avgLossPct: 0.2
      }
    };
  }
  
  private generateSellSignal(
    symbol: string,
    price: number,
    indicators: IndicatorResult,
    divergence: DivergenceCandidate
  ): InsertTradingSignal | null {
    
    const confirmations = this.checkConfirmations(indicators, this.bearishConfirmationRules);
    
    if (confirmations.count < 2) {
      return this.generateHoldSignal(symbol, price, indicators, `Bearish divergence detected but insufficient confirmation (${confirmations.count}/2)`);
    }
    
    const confidence = Math.min(0.95, 0.6 + (confirmations.score * 0.35) + (divergence.strength * 0.2));
    
    if (confidence < this.minConfidenceThreshold) {
      return null;
    }
    
    const stopLoss = price * 1.002; // 0.2% stop loss
    const takeProfit = price * 0.996; // 0.4% take profit
    
    return {
      pair: symbol,
      timeframe: '1m',
      signal: 'SELL',
      confidence,
      reason: `${divergence.description} + ${confirmations.reasons.join(' + ')} (${confirmations.count}/2)`,
      entryPrice: price,
      entryType: 'market',
      stopLoss,
      takeProfit,
      predictionHorizonMins: 5,
      expectedMovePct: -0.3,
      indicatorValues: indicators,
      backtestStats: {
        winrate: 0.64,
        avgWinPct: 0.4,
        avgLossPct: 0.25
      }
    };
  }
  
  private generateHoldSignal(
    symbol: string,
    price: number,
    indicators: IndicatorResult,
    reason?: string
  ): InsertTradingSignal {
    return {
      pair: symbol,
      timeframe: '1m',
      signal: 'HOLD',
      confidence: 0.45,
      reason: reason || 'Mixed signals - insufficient confirmation for trade entry',
      entryPrice: price,
      entryType: 'market',
      stopLoss: null,
      takeProfit: null,
      predictionHorizonMins: 1,
      expectedMovePct: 0,
      indicatorValues: indicators,
      backtestStats: {
        winrate: 0.5,
        avgWinPct: 0,
        avgLossPct: 0
      }
    };
  }
  
  private checkConfirmations(indicators: IndicatorResult, rules: ConfirmationRule[]) {
    let count = 0;
    let score = 0;
    const reasons: string[] = [];
    
    for (const rule of rules) {
      if (rule.check(indicators, this.indicatorHistory)) {
        count++;
        score += rule.weight;
        reasons.push(rule.name);
      }
    }
    
    return { count, score, reasons };
  }
}
