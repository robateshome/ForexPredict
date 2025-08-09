import { Card } from "@/components/ui/card";
import { SystemStatus as SystemStatusType } from "@shared/schema";

interface SystemStatusProps {
  status: SystemStatusType['data'];
}

export function SystemStatus({ status }: SystemStatusProps) {
  const formatUptime = (lastUpdate: string) => {
    const now = new Date();
    const lastUpdateDate = new Date(lastUpdate);
    const diffMs = now.getTime() - lastUpdateDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)} minutes ago`;
    } else {
      return `${Math.floor(diffSeconds / 3600)} hours ago`;
    }
  };

  const getStatusColor = (active: boolean) => {
    return active ? 'success' : 'danger';
  };

  const getRateLimitColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 90) return 'danger';
    if (percentage > 70) return 'warning';
    return 'success';
  };

  return (
    <Card className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">System Status</h2>
        <div className="text-xs text-gray-400">
          Last updated: {formatUptime(status.lastUpdate)}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getStatusColor(status.finnhubConnected)}`}></div>
            <span className="text-sm text-white">Finnhub WebSocket</span>
          </div>
          <span className={`text-xs ${status.finnhubConnected ? 'text-green-500' : 'text-red-500'}`}>
            {status.finnhubConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getStatusColor(status.dataProcessing)}`}></div>
            <span className="text-sm text-white">Data Processing</span>
          </div>
          <span className={`text-xs ${status.dataProcessing ? 'text-green-500' : 'text-red-500'}`}>
            {status.dataProcessing ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getRateLimitColor(status.rateLimit.current, status.rateLimit.max)}`}></div>
            <span className="text-sm text-white">Rate Limiting</span>
          </div>
          <span className="text-xs text-yellow-500">
            {status.rateLimit.current}/{status.rateLimit.max} req/min
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getStatusColor(status.signalEngine)}`}></div>
            <span className="text-sm text-white">Signal Engine</span>
          </div>
          <span className={`text-xs ${status.signalEngine ? 'text-green-500' : 'text-red-500'}`}>
            {status.signalEngine ? 'Operational' : 'Offline'}
          </span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-sm text-gray-400 mb-2">Memory Usage</div>
        <div className="w-full bg-background rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(status.memoryUsage.used / status.memoryUsage.total) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{status.memoryUsage.used} MB</span>
          <span>{status.memoryUsage.total} MB</span>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="text-sm text-gray-400 mb-2">CPU Usage</div>
        <div className="w-full bg-background rounded-full h-2">
          <div 
            className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${status.cpuUsage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{Math.round(status.cpuUsage)}%</span>
          <span>100%</span>
        </div>
      </div>
    </Card>
  );
}
