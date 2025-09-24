import { useMemo } from 'react';
import { LogEntry, LogFilterOptions } from '@/lib/types';

export function useLogFilter(entries: LogEntry[], filters: LogFilterOptions) {
  const filteredEntries = useMemo(() => {
    if (!entries.length) return [];

    return entries.filter(entry => {
      // Level filter
      if (filters.levels.length > 0 && !filters.levels.includes(entry.level)) {
        return false;
      }

      // Logger filter
      if (filters.loggers.length > 0 && !filters.loggers.includes(entry.logger)) {
        return false;
      }

      // Component filter
      if (filters.components.length > 0 && entry.component && 
          !filters.components.includes(entry.component)) {
        return false;
      }

      // Agent filter
      if (filters.agents.length > 0 && entry.agent_name && 
          !filters.agents.includes(entry.agent_name)) {
        return false;
      }

      // Time range filter
      if (filters.timeRange.start && entry.timestamp < filters.timeRange.start) {
        return false;
      }
      if (filters.timeRange.end && entry.timestamp > filters.timeRange.end) {
        return false;
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const searchFields = [
          entry.message,
          entry.logger,
          entry.funcName,
          entry.component,
          entry.agent_name,
          entry.action
        ].filter(Boolean).filter(field => typeof field === 'string');

        const matches = searchFields.some(field => 
          field?.toLowerCase().includes(searchLower)
        );
        
        if (!matches) return false;
      }

      // Category filters
      const categories = (entry as any).categories || [];
      
      if (!filters.showSystemPrompts && categories.includes('system_prompts')) {
        return false;
      }
      if (!filters.showToolExecutions && categories.includes('tool_executions')) {
        return false;
      }
      if (!filters.showResourceOperations && categories.includes('resource_operations')) {
        return false;
      }
      if (!filters.showAgentOutputs && categories.includes('agent_outputs')) {
        return false;
      }
      if (!filters.showErrors && categories.includes('errors_warnings')) {
        return false;
      }

      return true;
    });
  }, [entries, filters]);

  const getUniqueValues = (key: keyof LogEntry) => {
    const values = new Set<string>();
    entries.forEach(entry => {
      const value = entry[key];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };

  const availableFilters = useMemo(() => ({
    levels: getUniqueValues('level'),
    loggers: getUniqueValues('logger'),
    components: getUniqueValues('component'),
    agents: getUniqueValues('agent_name')
  }), [entries]);

  return {
    filteredEntries,
    availableFilters
  };
}