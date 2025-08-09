import { useState, useEffect } from "react";
import { ChartLine, Signal, Percent, Zap, Trophy, Settings } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { SignalCard } from "@/components/signal-card";
import { DivergenceAnalysis } from "@/components/divergence-analysis";
import { IndicatorStatus } from "@/components/indicator-status";
import { SystemStatus } from "@/components/system-status";
import { BacktestingPanel } from "@/components/backtesting-panel";
import { useWebSocket } from "@/hooks/use-websocket";
import { TradingSignal, SystemStatus as SystemStatusType, MarketUpdate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface MarketPair {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  isActive: boolean;
}

export default function Dashboard() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [marketPairs, setMarketPairs] = useState<MarketPair[]>([
    { symbol: 'EUR/USD', price: 1.23456, change: 0.0008, changePercent: 0.08, isActive: true },
    { symbol: 'GBP/USD', price: 1.45789, change: -0.0012, changePercent: -0.12, isActive: true },
    { symbol: 'USD/JPY', price: 156.234, change: 0.25, changePercent: 0.25, isActive: true },
  ]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType['data']>({
    finnhubConnected: false,
    dataProcessing: false,
    rateLimit: { current: 0, max: 100 },
    signalEngine: false,
    memoryUsage: { used: 650, total: 1000 },
    cpuUsage: 45,
    latency: 45,
    lastUpdate: new Date().toISOString()
  });
  
  const [indicators, setIndicators] = useState({
    rsi: 67.8,
    macd: 0.0024,
    stochastic: 45.2,
    ema: 'Bullish',
    adx: 28.9
  });

  const [minConfidence, setMinConfidence] = useState([60]);
  const [timeframe, setTimeframe] = useState("1m");
  const [autoScroll, setAutoScroll] = useState(true);

  const { isConnected, latency } = useWebSocket({
    onSignalUpdate: (signal) => {
      setSignals(prev => [signal, ...prev.slice(0, 49)]); // Keep last 50 signals
    },
    onMarketUpdate: (market: MarketUpdate['data']) => {
      setMarketPairs(prev => prev.map(pair => 
        pair.symbol === market.symbol 
          ? { ...pair, price: market.price, change: market.change, changePercent: market.changePercent }
          : pair
      ));
    },
    onSystemStatus: (status) => {
      setSystemStatus(status);
    }
  });

  // Update connection status display
  useEffect(() => {
    setSystemStatus(prev => ({
      ...prev,
      finnhubConnected: isConnected,
      latency: latency,
      lastUpdate: new Date().toISOString()
    }));
  }, [isConnected, latency]);

  // Calculate stats from signals
  const stats = {
    activeSignals: signals.filter(s => s.signal !== 'HOLD').length,
    avgConfidence: signals.length > 0 ? 
      Math.round((signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length) * 100) : 0,
    latency: Math.round(latency),
    winRate: 67.3 // This would come from backtest data
  };

  const filteredSignals = signals.filter(signal => 
    signal.confidence >= (minConfidence[0] / 100)
  );

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ChartLine className="text-green-500 text-xl" size={24} />
              <h1 className="text-xl font-semibold text-white">AI Forex Trading Assistant</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse-success' : 'bg-red-500'}`}></div>
                <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">Latency: {latency}ms</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right">
              <div className="text-white font-medium">Research Mode</div>
              <div className="text-gray-400 text-xs">No live trading</div>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Settings size={18} />
            </Button>
          </div>
        </div>
        
        {/* Disclaimer Banner */}
        <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
          <div className="flex items-center space-x-2 text-sm">
            <i className="fas fa-exclamation-triangle text-yellow-500"></i>
            <span className="text-yellow-500 font-medium">Research Only:</span>
            <span className="text-gray-300">This agent provides research signals only, not financial advice. Backtest before live trading.</span>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-80 bg-card border-r border-border p-6 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Currency Pairs */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Active Pairs</h3>
              <div className="space-y-2">
                {marketPairs.map((pair) => (
                  <div key={pair.symbol} className="flex items-center justify-between p-3 bg-background rounded-lg hover:bg-gray-700 transition-colors cursor-pointer border border-transparent hover:border-green-500/30">
                    <div>
                      <div className="font-medium text-white">{pair.symbol}</div>
                      <div className="text-xs text-gray-400">{timeframe} • Active</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-white">{pair.price.toFixed(5)}</div>
                      <div className={`text-xs ${pair.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pair.changePercent >= 0 ? '+' : ''}{pair.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicator Status */}
            <IndicatorStatus indicators={indicators} />

            {/* Configuration */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min Confidence</label>
                  <Slider
                    value={minConfidence}
                    onValueChange={setMinConfidence}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">{minConfidence[0]}%</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-full bg-background border-border text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 minute</SelectItem>
                      <SelectItem value="5m">5 minutes</SelectItem>
                      <SelectItem value="15m">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Auto-scroll</span>
                  <Switch 
                    checked={autoScroll} 
                    onCheckedChange={setAutoScroll}
                  />
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <StatsCard
                title="Active Signals"
                value={stats.activeSignals}
                icon={Signal}
                change="+8"
                changeType="positive"
                description="from last hour"
                iconBgColor="bg-green-500/20"
              />
              <StatsCard
                title="Avg Confidence"
                value={`${stats.avgConfidence}%`}
                icon={Percent}
                change="+2.1%"
                changeType="positive"
                description="from yesterday"
                iconBgColor="bg-yellow-500/20"
              />
              <StatsCard
                title="Processing Latency"
                value={`${stats.latency}ms`}
                icon={Zap}
                description="Under target (<200ms)"
                iconBgColor="bg-green-500/20"
              />
              <StatsCard
                title="Win Rate"
                value={`${stats.winRate}%`}
                icon={Trophy}
                change="+3.2%"
                changeType="positive"
                description="this week"
                iconBgColor="bg-green-500/20"
              />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Real-time Signals */}
              <Card className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Real-time Signals</h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse-success' : 'bg-red-500'}`}></div>
                    <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                      {isConnected ? 'Live' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredSignals.length > 0 ? (
                    filteredSignals.map((signal) => (
                      <SignalCard key={signal.id} signal={signal} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Signal size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No signals matching current filters</p>
                      <p className="text-sm">Waiting for trading opportunities...</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Divergence Detection */}
              <DivergenceAnalysis />

              {/* Backtesting Results */}
              <BacktestingPanel />

              {/* System Status */}
              <SystemStatus status={systemStatus} />

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
