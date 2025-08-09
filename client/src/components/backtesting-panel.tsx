import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useState } from "react";

interface BacktestData {
  totalPnL: string;
  sharpeRatio: string;
  winRate: string;
  maxDrawdown: string;
  avgWin: string;
  avgLoss: string;
  totalTrades: string;
}

export function BacktestingPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState("24h");
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Sample data - in real app this would come from API based on selectedPeriod
  const backtestData: BacktestData = {
    totalPnL: "+12.4%",
    sharpeRatio: "1.84",
    winRate: "67.3%",
    maxDrawdown: "-3.2%",
    avgWin: "+0.8%",
    avgLoss: "-0.5%",
    totalTrades: "247"
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download-backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedPeriod }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `backtest-data-${selectedPeriod}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Backtesting Performance</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40 bg-background border-border text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{backtestData.totalPnL}</div>
          <div className="text-sm text-gray-400">Total P&L</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{backtestData.sharpeRatio}</div>
          <div className="text-sm text-gray-400">Sharpe Ratio</div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Win Rate</span>
          <span className="text-sm font-medium text-white">{backtestData.winRate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Max Drawdown</span>
          <span className="text-sm font-medium text-red-500">{backtestData.maxDrawdown}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Avg Win</span>
          <span className="text-sm font-medium text-green-500">{backtestData.avgWin}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Avg Loss</span>
          <span className="text-sm font-medium text-red-500">{backtestData.avgLoss}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Total Trades</span>
          <span className="text-sm font-medium text-white">{backtestData.totalTrades}</span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <Button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full bg-background hover:bg-gray-700 border border-border text-white"
          variant="outline"
        >
          <Download className="mr-2" size={16} />
          {isDownloading ? 'Downloading...' : 'Download Backtest Data'}
        </Button>
      </div>
    </Card>
  );
}
