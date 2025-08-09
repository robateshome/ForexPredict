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
            <div className={`indicator-dot ${getStatusColor(status.connected)}`}></div>
            <span className="text-sm text-white">Data Provider</span>
          </div>
          <span className={`text-xs ${status.connected ? 'text-green-500' : 'text-red-500'}`}>
            {status.mode === 'demo' ? 'Demo Mode' : 'ExchangeRate-API'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getStatusColor(status.connected)}`}></div>
            <span className="text-sm text-white">Connection Status</span>
          </div>
          <span className={`text-xs ${status.connected ? 'text-green-500' : 'text-red-500'}`}>
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`indicator-dot ${getRateLimitColor(status.rateLimit.current, status.rateLimit.max)}`}></div>
            <span className="text-sm text-white">
              {status.mode === 'demo' ? 'Demo Rate Limit' : 'API Rate Limit'}
            </span>
          </div>
          <span className="text-xs text-yellow-500">
            {status.rateLimit.current}/{status.rateLimit.max}
            {status.mode === 'demo' ? ' req/min' : ' req/day'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="indicator-dot success"></div>
            <span className="text-sm text-white">Signal Engine</span>
          </div>
          <span className="text-xs text-green-500">
            Running
          </span>
        </div>
        
        {status.uptime && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="indicator-dot success"></div>
              <span className="text-sm text-white">Uptime</span>
            </div>
            <span className="text-xs text-green-500">
              {Math.floor((Date.now() - status.uptime) / 1000)}s
            </span>
          </div>
        )}
      </div>
      
      {/* Attribution for ExchangeRate-API when in live mode */}
      {status.mode === 'live' && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-gray-400">
            Forex rates powered by{' '}
            <a 
              href="https://www.exchangerate-api.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              ExchangeRate-API
            </a>
          </p>
        </div>
      )}
    </Card>
  );
}
