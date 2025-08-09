import { TradingSignal } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface SignalCardProps {
  signal: TradingSignal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const signalTypeColors = {
    BUY: 'bg-green-500/20 text-green-500',
    SELL: 'bg-red-500/20 text-red-500',
    HOLD: 'bg-yellow-500/20 text-yellow-500'
  };

  const signalTypeHoverColors = {
    BUY: 'hover:border-green-500/30',
    SELL: 'hover:border-red-500/30',
    HOLD: 'hover:border-yellow-500/30'
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return price.toFixed(5);
  };

  return (
    <div className={`signal-card border-border ${signalTypeHoverColors[signal.signal as keyof typeof signalTypeHoverColors]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Badge className={`${signalTypeColors[signal.signal as keyof typeof signalTypeColors]} text-xs font-medium`}>
            {signal.signal}
          </Badge>
          <span className="font-medium text-white">{signal.pair}</span>
          <span className="text-xs text-gray-400">{signal.timeframe}</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-white">{Math.round(signal.confidence * 100)}%</div>
          <div className="text-xs text-gray-400">{formatTime(signal.timestamp)}</div>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 mb-3">
        {signal.reason}
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-gray-400">Entry</div>
          <div className="font-mono text-white">{formatPrice(signal.entryPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Stop Loss</div>
          <div className="font-mono text-red-500">{formatPrice(signal.stopLoss)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Take Profit</div>
          <div className="font-mono text-green-500">{formatPrice(signal.takeProfit)}</div>
        </div>
      </div>
    </div>
  );
}
