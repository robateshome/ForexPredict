import { TechnicalIndicators, IndicatorResult } from './indicators.js';

export interface DivergenceCandidate {
  type: 'bullish' | 'bearish' | 'hidden_bullish' | 'hidden_bearish';
  indicator: 'RSI' | 'MACD' | 'Stochastic';
  strength: number;
  pricePoints: { x: number; y: number }[];
  indicatorPoints: { x: number; y: number }[];
  description: string;
}

export class DivergenceDetector {
  private priceHistory: number[] = [];
  private indicatorHistory: { [key: string]: number[] } = {
    rsi: [],
    macd: [],
    stochastic: []
  };
  
  private readonly minBarsForDivergence = 5;
  private readonly maxHistoryLength = 100;
  
  addDataPoint(price: number, indicators: IndicatorResult) {
    this.priceHistory.push(price);
    this.indicatorHistory.rsi.push(indicators.rsi);
    this.indicatorHistory.macd.push(indicators.macd.histogram);
    this.indicatorHistory.stochastic.push(indicators.stochastic.k);
    
    // Keep history bounded
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory = this.priceHistory.slice(-this.maxHistoryLength);
      Object.keys(this.indicatorHistory).forEach(key => {
        this.indicatorHistory[key] = this.indicatorHistory[key].slice(-this.maxHistoryLength);
      });
    }
  }
  
  detectDivergences(): DivergenceCandidate[] {
    if (this.priceHistory.length < this.minBarsForDivergence) {
      return [];
    }
    
    const candidates: DivergenceCandidate[] = [];
    
    // Check RSI divergences
    const rsiDivergences = this.checkIndicatorDivergence(
      this.priceHistory,
      this.indicatorHistory.rsi,
      'RSI'
    );
    candidates.push(...rsiDivergences);
    
    // Check MACD histogram divergences
    const macdDivergences = this.checkIndicatorDivergence(
      this.priceHistory,
      this.indicatorHistory.macd,
      'MACD'
    );
    candidates.push(...macdDivergences);
    
    // Check Stochastic divergences
    const stochasticDivergences = this.checkIndicatorDivergence(
      this.priceHistory,
      this.indicatorHistory.stochastic,
      'Stochastic'
    );
    candidates.push(...stochasticDivergences);
    
    return candidates;
  }
  
  private checkIndicatorDivergence(
    prices: number[],
    indicatorValues: number[],
    indicatorName: 'RSI' | 'MACD' | 'Stochastic'
  ): DivergenceCandidate[] {
    const candidates: DivergenceCandidate[] = [];
    const len = Math.min(prices.length, indicatorValues.length);
    
    if (len < this.minBarsForDivergence) return candidates;
    
    // Look for peaks and troughs in recent data
    const recentPrices = prices.slice(-this.minBarsForDivergence);
    const recentIndicator = indicatorValues.slice(-this.minBarsForDivergence);
    
    // Find local maxima and minima
    const priceExtremes = this.findExtremes(recentPrices);
    const indicatorExtremes = this.findExtremes(recentIndicator);
    
    // Check for bullish divergence (price lower lows, indicator higher lows)
    if (priceExtremes.minima.length >= 2 && indicatorExtremes.minima.length >= 2) {
      const priceMin1 = priceExtremes.minima[priceExtremes.minima.length - 2];
      const priceMin2 = priceExtremes.minima[priceExtremes.minima.length - 1];
      const indMin1 = indicatorExtremes.minima[indicatorExtremes.minima.length - 2];
      const indMin2 = indicatorExtremes.minima[indicatorExtremes.minima.length - 1];
      
      if (priceMin2.value < priceMin1.value && indMin2.value > indMin1.value) {
        const strength = this.calculateDivergenceStrength(priceMin1, priceMin2, indMin1, indMin2);
        if (strength > 0.3) {
          candidates.push({
            type: 'bullish',
            indicator: indicatorName,
            strength,
            pricePoints: [priceMin1, priceMin2],
            indicatorPoints: [indMin1, indMin2],
            description: `${indicatorName} bullish divergence: price making lower lows while ${indicatorName} shows higher lows`
          });
        }
      }
    }
    
    // Check for bearish divergence (price higher highs, indicator lower highs)
    if (priceExtremes.maxima.length >= 2 && indicatorExtremes.maxima.length >= 2) {
      const priceMax1 = priceExtremes.maxima[priceExtremes.maxima.length - 2];
      const priceMax2 = priceExtremes.maxima[priceExtremes.maxima.length - 1];
      const indMax1 = indicatorExtremes.maxima[indicatorExtremes.maxima.length - 2];
      const indMax2 = indicatorExtremes.maxima[indicatorExtremes.maxima.length - 1];
      
      if (priceMax2.value > priceMax1.value && indMax2.value < indMax1.value) {
        const strength = this.calculateDivergenceStrength(priceMax1, priceMax2, indMax1, indMax2);
        if (strength > 0.3) {
          candidates.push({
            type: 'bearish',
            indicator: indicatorName,
            strength,
            pricePoints: [priceMax1, priceMax2],
            indicatorPoints: [indMax1, indMax2],
            description: `${indicatorName} bearish divergence: price making higher highs while ${indicatorName} shows lower highs`
          });
        }
      }
    }
    
    return candidates;
  }
  
  private findExtremes(data: number[]): { maxima: Array<{index: number, value: number}>, minima: Array<{index: number, value: number}> } {
    const maxima: Array<{index: number, value: number}> = [];
    const minima: Array<{index: number, value: number}> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        maxima.push({ index: i, value: data[i] });
      }
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        minima.push({ index: i, value: data[i] });
      }
    }
    
    return { maxima, minima };
  }
  
  private calculateDivergenceStrength(
    point1: {index: number, value: number},
    point2: {index: number, value: number},
    indPoint1: {index: number, value: number},
    indPoint2: {index: number, value: number}
  ): number {
    const priceChange = Math.abs(point2.value - point1.value) / point1.value;
    const indicatorChange = Math.abs(indPoint2.value - indPoint1.value) / Math.abs(indPoint1.value || 1);
    const timeDiff = Math.abs(point2.index - point1.index);
    
    // Strength based on magnitude of divergence and time separation
    const strength = (priceChange + indicatorChange) * Math.min(timeDiff / 5, 1);
    return Math.min(strength, 1);
  }
}
