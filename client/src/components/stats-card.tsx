import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  iconBgColor?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'neutral', 
  description,
  iconBgColor = 'bg-green-500/20'
}: StatsCardProps) {
  const changeColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-400'
  }[changeType];

  return (
    <Card className="stats-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className="text-green-500 text-lg" size={20} />
        </div>
      </div>
      {(change || description) && (
        <div className="mt-4 flex items-center text-sm">
          {change && <span className={changeColor}>{change}</span>}
          {description && (
            <span className="text-gray-400 ml-1">{description}</span>
          )}
        </div>
      )}
    </Card>
  );
}
