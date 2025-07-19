import { useState, useEffect } from 'react';
import { LogEntry } from '@/lib/types';

export function useLogParser(logData: string | null) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logData) {
      setEntries([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lines = logData.split('\n').filter(line => line.trim());
      const parsedEntries: LogEntry[] = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          parsedEntries.push(entry);
        } catch (lineError) {
          // Skip invalid JSON lines
          console.warn('Failed to parse log line:', line);
        }
      }

      setEntries(parsedEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse log data');
    } finally {
      setIsLoading(false);
    }
  }, [logData]);

  const categorizeEntry = (entry: LogEntry): string[] => {
    const categories: string[] = [];

    // System prompts
    if (entry.system_prompt || entry.message.includes('system prompt') || entry.action === 'agent_initialization') {
      categories.push('system_prompts');
    }

    // Tool executions
    if (entry.message.includes('API') || entry.message.includes('request') || 
        entry.message.includes('database') || entry.action?.includes('search')) {
      categories.push('tool_executions');
    }

    // Resource operations
    if (entry.message.includes('resource') || entry.action?.includes('resource') ||
        entry.message.includes('embedding')) {
      categories.push('resource_operations');
    }

    // Agent outputs
    if (entry.message.includes('response') || entry.action?.includes('response') ||
        entry.message.includes('Agent') || entry.agent_name) {
      categories.push('agent_outputs');
    }

    // Errors and warnings
    if (entry.level === 'ERROR' || entry.level === 'WARNING' ||
        entry.message.includes('Observation: Error:') ||
        entry.message.includes('Error:')) {
      categories.push('errors_warnings');
    }

    return categories;
  };

  const entriesWithCategories = entries.map(entry => ({
    ...entry,
    categories: categorizeEntry(entry)
  }));

  return {
    entries: entriesWithCategories,
    isLoading,
    error
  };
}