import { useMemo } from 'react';
import { LogEntry, LogStats } from '@/lib/types';

export function useLogStats(entries: LogEntry[]): LogStats {
  return useMemo(() => {
    if (!entries.length) {
      return {
        total: 0,
        byLevel: {},
        byLogger: {},
        byComponent: {},
        byAgent: {},
        errorRate: 0,
        timeRange: { start: '', end: '' }
      };
    }

    const byLevel: Record<string, number> = {};
    const byLogger: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    
    let errorCount = 0;
    const timestamps = entries.map(entry => entry.timestamp).sort();

    entries.forEach(entry => {
      // Count by level
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
      
      // Count by logger
      byLogger[entry.logger] = (byLogger[entry.logger] || 0) + 1;
      
      // Count by component
      if (entry.component) {
        byComponent[entry.component] = (byComponent[entry.component] || 0) + 1;
      }
      
      // Count by agent
      if (entry.agent_name) {
        byAgent[entry.agent_name] = (byAgent[entry.agent_name] || 0) + 1;
      }
      
      // Count errors
      if (entry.level === 'ERROR' ||
          (entry.message && entry.message.includes('Observation: Error:')) ||
          (entry.message && entry.message.includes('Error:'))) {
        errorCount++;
      }
    });

    const errorRate = entries.length > 0 ? (errorCount / entries.length) * 100 : 0;

    return {
      total: entries.length,
      byLevel,
      byLogger,
      byComponent,
      byAgent,
      errorRate,
      timeRange: {
        start: timestamps[0] || '',
        end: timestamps[timestamps.length - 1] || ''
      }
    };
  }, [entries]);
}

export function useLogMetrics(entries: LogEntry[]) {
  return useMemo(() => {
    const categories = {
      system_prompts: 0,
      tool_executions: 0,
      resource_operations: 0,
      agent_outputs: 0,
      errors_warnings: 0
    };

    entries.forEach(entry => {
      const entryCategories = (entry as any).categories || [];
      entryCategories.forEach((category: string) => {
        if (category in categories) {
          categories[category as keyof typeof categories]++;
        }
      });
    });

    const topLoggers = Object.entries(
      entries.reduce((acc, entry) => {
        acc[entry.logger] = (acc[entry.logger] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

    const topComponents = Object.entries(
      entries.reduce((acc, entry) => {
        if (entry.component) {
          acc[entry.component] = (acc[entry.component] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    )
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

    return {
      categories,
      topLoggers,
      topComponents,
      uniqueUsers: new Set(entries.map(e => e.user_id).filter(Boolean)).size,
      uniqueRequests: new Set(entries.map(e => e.request_id).filter(Boolean)).size
    };
  }, [entries]);
}