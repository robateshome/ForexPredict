import { useState, useEffect } from "react";
import { ChartLine, Signal, Percent, Zap, Trophy, Settings, RefreshCw } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { SignalCard } from "@/components/signal-card";
import { DivergenceAnalysis } from "@/components/divergence-analysis";
import { IndicatorStatus } from "@/components/indicator-status";
import { SystemStatus } from "@/components/system-status";
import { BacktestingPanel } from "@/components/backtesting-panel";
import { PriceCard } from "@/components/price-card";
import { useRealtimePrice } from "@/hooks/use-realtime-price";
import { TradingSignal, SystemStatus as SystemStatusType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function Dashboard() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [previousPrices, setPreviousPrices] = useState<Record<string, any>>({});
  
  // Real-time price data with polling
  const { prices, isLoading: pricesLoading, error: priceError, isConnected: pricesConnected, refetch } = useRealtimePrice({
    symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'],
    updateInterval: 3000, // 3 second updates
    debounceMs: 200
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatusType['data']>({
    connected: true,
    mode: 'demo',
    provider: 'Demo',
    rateLimit: { current: 0, max: 100 },
    uptime: Date.now(),
    latency: 45,
    lastUpdate: new Date().toISOString(),
    // Legacy fields for backward compatibility
    finnhubConnected: false,
    dataProcessing: false,
    signalEngine: false,
    memoryUsage: { used: 650, total: 1000 },
    cpuUsage: 45
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

  // Update previous prices for animations
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      setPreviousPrices(prev => {
        const updated = { ...prev };
        Object.keys(prices).forEach(symbol => {
          if (!updated[symbol]) {
            updated[symbol] = prices[symbol];
          } else {
            updated[symbol] = { ...updated[symbol], price: updated[symbol].price };
          }
        });
        return updated;
      });
    }
  }, [prices]);

  // Update connection status display
  useEffect(() => {
    setSystemStatus(prev => ({
      ...prev,
      connected: pricesConnected,
      lastUpdate: new Date().toISOString(),
      latency: prev.latency || 45,
      // Legacy fields for backward compatibility
      finnhubConnected: pricesConnected
    }));
  }, [pricesConnected]);

  // Calculate stats from signals and prices
  const activePairs = Object.keys(prices).length;
  const stats = {
    activeSignals: signals.filter(s => s.signal !== 'HOLD').length,
    avgConfidence: signals.length > 0 ? 
      Math.round((signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length) * 100) : 0,
    latency: systemStatus.latency || 45,
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
                <div className={`w-2 h-2 rounded-full ${pricesConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={pricesConnected ? 'text-green-500' : 'text-red-500'}>
                  {pricesConnected ? 'Live Data' : 'Disconnected'}
                </span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">{activePairs} Pairs Active</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">Latency: {systemStatus.latency || 45}ms</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={refetch}
              disabled={pricesLoading}
            >
              <RefreshCw size={16} className={pricesLoading ? 'animate-spin' : ''} />
            </Button>
            <div className="text-sm text-right">
              <div className="text-white font-medium">Research Mode</div>
              <div className="text-gray-400 text-xs">
                {priceError ? 'Connection Error' : 'No live trading'}
              </div>
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
            
            {/* Real-time Currency Prices */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Live Forex Rates</h3>
                {pricesLoading && (
                  <RefreshCw size={14} className="animate-spin text-blue-400" />
                )}
              </div>
              
              {priceError && (
                <div className="mb-3 p-2 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
                  Connection Error: {priceError}
                </div>
              )}
              
              <div className="space-y-3">
                {Object.values(prices).length > 0 ? (
                  Object.values(prices).map((priceData) => (
                    <PriceCard
                      key={priceData.symbol}
                      data={priceData}
                      previousData={previousPrices[priceData.symbol]}
                      isConnected={pricesConnected}
                      className="w-full"
                    />
                  ))
                ) : pricesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No price data available
                  </div>
                )}
              </div>
            </div>

            {/* Legacy Market Pairs for backward compatibility */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Quick Overview</h3>
              <div className="space-y-2">
                {Object.values(prices).slice(0, 3).map((pair) => (
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
                    <div className={`w-2 h-2 rounded-full ${pricesConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-xs ${pricesConnected ? 'text-green-500' : 'text-red-500'}`}>
                      {pricesConnected ? 'Live' : 'Offline'}
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
