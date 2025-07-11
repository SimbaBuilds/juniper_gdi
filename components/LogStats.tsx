import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertCircle, Clock, Activity } from 'lucide-react';
import { LogStats as LogStatsType } from '@/lib/types';
import { useLogMetrics } from '@/hooks/useLogStats';
import { LogEntry } from '@/lib/types';

interface LogStatsProps {
  stats: LogStatsType;
  entries: LogEntry[];
}

export function LogStats({ stats, entries }: LogStatsProps) {
  const metrics = useLogMetrics(entries);

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTimeRange = (start: string, end: string) => {
    if (!start || !end) return 'N/A';
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = endDate.getTime() - startDate.getTime();
    
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Logs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatPercentage(stats.errorRate)}</div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{metrics.uniqueUsers}</div>
              <div className="text-sm text-gray-600">Unique Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{metrics.uniqueRequests}</div>
              <div className="text-sm text-gray-600">Unique Requests</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Clock className="w-4 h-4" />
              Duration: {formatTimeRange(stats.timeRange.start, stats.timeRange.end)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Levels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Log Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <Badge 
                  variant={level === 'ERROR' ? 'destructive' : level === 'WARNING' ? 'secondary' : 'outline'}
                  className="w-16 justify-center"
                >
                  {level}
                </Badge>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.categories).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Loggers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Loggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.topLoggers.map(([logger, count]) => (
              <div key={logger} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{logger}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Components */}
      {metrics.topComponents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topComponents.map(([component, count]) => (
                <div key={component} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{component}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents */}
      {Object.keys(stats.byAgent).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byAgent).map(([agent, count]) => (
                <div key={agent} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{agent}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}