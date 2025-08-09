import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { AnimatedPrice, AnimatedChange } from './animated-price';
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from 'lucide-react';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface PriceCardProps {
  data: PriceData;
  previousData?: PriceData;
  isConnected?: boolean;
  className?: string;
}

export function PriceCard({ data, previousData, isConnected = true, className = "" }: PriceCardProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date(data.timestamp);
      setLastUpdateTime(now.toLocaleTimeString());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [data.timestamp]);

  const getTrendIcon = () => {
    if (data.change > 0) return <TrendingUp size={16} className="text-green-400" />;
    if (data.change < 0) return <TrendingDown size={16} className="text-red-400" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  return (
    <Card className={`p-4 bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-white">{data.symbol}</h3>
          {getTrendIcon()}
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          {isConnected ? (
            <Wifi size={12} className="text-green-400" />
          ) : (
            <WifiOff size={12} className="text-red-400" />
          )}
          <span>{lastUpdateTime}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold">
          <AnimatedPrice
            price={data.price}
            previousPrice={previousData?.price}
            decimals={data.symbol.includes('JPY') ? 3 : 5}
          />
        </div>
        
        <AnimatedChange
          change={data.change}
          changePercent={data.changePercent}
        />
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>
            <span className="block">24h High</span>
            <span className="text-white font-mono">
              {(data.price * 1.002).toFixed(data.symbol.includes('JPY') ? 3 : 5)}
            </span>
          </div>
          <div>
            <span className="block">24h Low</span>
            <span className="text-white font-mono">
              {(data.price * 0.998).toFixed(data.symbol.includes('JPY') ? 3 : 5)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}