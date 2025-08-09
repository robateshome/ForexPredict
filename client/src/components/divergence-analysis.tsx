import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, X } from "lucide-react";
import { useState } from "react";

interface DivergenceData {
  id: string;
  type: 'bullish' | 'bearish' | 'hidden_bearish';
  status: 'confirmed' | 'pending' | 'rejected';
  pair: string;
  indicator: string;
  description: string;
  values: {
    indicator: string;
    price: string;
  };
}

export function DivergenceAnalysis() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Sample data - in real app this would come from props or API
  const divergences: DivergenceData[] = [
    {
      id: '1',
      type: 'bullish',
      status: 'confirmed',
      pair: 'EUR/USD',
      indicator: 'RSI',
      description: 'Price making lower lows while RSI shows higher lows, indicating potential reversal',
      values: {
        indicator: '32.4 → 38.7',
        price: '1.2334 → 1.2328'
      }
    },
    {
      id: '2',
      type: 'hidden_bearish',
      status: 'pending',
      pair: 'GBP/USD',
      indicator: 'MACD',
      description: 'Monitoring for confirmation - needs additional indicator support',
      values: {
        indicator: '0.0024 → 0.0018',
        price: '1.4565 → 1.4578'
      }
    },
    {
      id: '3',
      type: 'bearish',
      status: 'rejected',
      pair: 'USD/JPY',
      indicator: 'Stochastic',
      description: 'Divergence invalidated by counter-trend movement',
      values: {
        indicator: '',
        price: ''
      }
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getTypeIcon = (type: DivergenceData['type']) => {
    switch (type) {
      case 'bullish':
        return <TrendingUp className="text-green-500" size={16} />;
      case 'bearish':
      case 'hidden_bearish':
        return <TrendingDown className="text-yellow-500" size={16} />;
      default:
        return <X className="text-red-500" size={16} />;
    }
  };

  const getStatusColor = (status: DivergenceData['status']) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-500 border-green-500/30 bg-green-500/5';
      case 'pending':
        return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5';
      case 'rejected':
        return 'text-red-500 border-red-500/30 bg-red-500/5 opacity-50';
    }
  };

  const getStatusText = (status: DivergenceData['status']) => {
    switch (status) {
      case 'confirmed':
        return 'CONFIRMED';
      case 'pending':
        return 'PENDING';
      case 'rejected':
        return 'REJECTED';
    }
  };

  const getTypeText = (type: DivergenceData['type']) => {
    switch (type) {
      case 'bullish':
        return 'Bullish Divergence';
      case 'bearish':
        return 'Bearish Divergence';
      case 'hidden_bearish':
        return 'Hidden Bearish';
    }
  };

  return (
    <Card className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Divergence Analysis</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} size={16} />
        </Button>
      </div>
      
      <div className="space-y-4">
        {divergences.map((divergence) => (
          <div 
            key={divergence.id} 
            className={`border rounded-lg p-4 ${getStatusColor(divergence.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getTypeIcon(divergence.type)}
                <span className="font-medium text-white">{getTypeText(divergence.type)}</span>
              </div>
              <span className="text-xs font-medium">
                {getStatusText(divergence.status)}
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-2">
              {divergence.pair} • {divergence.indicator} vs Price
            </div>
            <div className="text-xs text-gray-400 mb-3">
              {divergence.description}
            </div>
            {divergence.status !== 'rejected' && (
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">{divergence.indicator}:</span>
                  <span className="text-white font-mono">{divergence.values.indicator}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-white font-mono">{divergence.values.price}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
