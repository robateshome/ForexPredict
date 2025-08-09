interface IndicatorStatusProps {
  indicators: {
    rsi: number;
    macd: number;
    stochastic: number;
    ema: string;
    adx: number;
  };
}

export function IndicatorStatus({ indicators }: IndicatorStatusProps) {
  const getIndicatorStatus = (value: number, type: 'rsi' | 'adx' | 'stochastic' | 'macd') => {
    switch (type) {
      case 'rsi':
        if (value > 70) return 'warning';
        if (value < 30) return 'warning';
        return 'success';
      case 'adx':
        return value > 25 ? 'success' : 'warning';
      case 'stochastic':
        if (value > 80) return 'warning';
        if (value < 20) return 'warning';
        return 'success';
      case 'macd':
        return value > 0 ? 'success' : value < -0.01 ? 'danger' : 'warning';
      default:
        return 'success';
    }
  };

  const formatValue = (value: number | string, type: string) => {
    if (typeof value === 'string') return value;
    
    switch (type) {
      case 'macd':
        return value.toFixed(4);
      case 'rsi':
      case 'stochastic':
      case 'adx':
        return value.toFixed(1);
      default:
        return value.toString();
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">Indicator Status</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getIndicatorStatus(indicators.rsi, 'rsi')}`}></div>
            <span className="text-sm text-white">RSI (14)</span>
          </div>
          <span className="text-sm font-mono text-gray-400">{formatValue(indicators.rsi, 'rsi')}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getIndicatorStatus(indicators.macd, 'macd')}`}></div>
            <span className="text-sm text-white">MACD</span>
          </div>
          <span className="text-sm font-mono text-gray-400">{formatValue(indicators.macd, 'macd')}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getIndicatorStatus(indicators.stochastic, 'stochastic')}`}></div>
            <span className="text-sm text-white">Stochastic</span>
          </div>
          <span className="text-sm font-mono text-gray-400">{formatValue(indicators.stochastic, 'stochastic')}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="indicator-dot success"></div>
            <span className="text-sm text-white">EMA 9/21</span>
          </div>
          <span className="text-sm font-mono text-gray-400">{indicators.ema}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getIndicatorStatus(indicators.adx, 'adx')}`}></div>
            <span className="text-sm text-white">ADX (14)</span>
          </div>
          <span className="text-sm font-mono text-gray-400">{formatValue(indicators.adx, 'adx')}</span>
        </div>
      </div>
    </div>
  );
}
