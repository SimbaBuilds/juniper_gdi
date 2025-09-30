import { useState, useEffect } from 'react';
import { LogEntry } from '@/lib/types';

// Format detection function - distinguishes between different JSON array types
function detectDataFormat(data: string): 'ndjson' | 'json-array' | 'conversation' | 'unknown' {
  const trimmed = data.trim();

  // Check if it starts with [ and ends with ] (JSON array)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstItem = parsed[0];

        // Check if it's conversation data (has conversation_id and role fields)
        if (firstItem.conversation_id && firstItem.role) {
          return 'conversation';
        }

        // Otherwise, it's agent flow data (has request_id, turn, type fields)
        return 'json-array';
      }
    } catch {
      // Fall through to other checks
    }
  }

  // Check if it looks like NDJSON (multiple lines, each starting with {)
  const lines = trimmed.split('\n').filter(line => line.trim());
  if (lines.length > 0 && lines.every(line => line.trim().startsWith('{'))) {
    return 'ndjson';
  }

  return 'unknown';
}

export function useLogParser(logData: string | null) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataFormat, setDataFormat] = useState<'ndjson' | 'json-array' | 'conversation' | 'unknown' | null>(null);
  const [formatMessage, setFormatMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!logData) {
      setEntries([]);
      setDataFormat(null);
      setFormatMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFormatMessage(null);

    try {
      const format = detectDataFormat(logData);
      setDataFormat(format);

      if (format === 'json-array') {
        // JSON arrays are meant for the agent flow tab, not the logs tab
        // Return empty array but provide helpful info instead of error
        setEntries([]);
        setFormatMessage('This file contains agent flow data. Please use the "Agent Flow" tab to view this content.');
      } else if (format === 'conversation') {
        // Conversation data is meant for the conversation tab, not the logs tab
        setEntries([]);
        setFormatMessage('This file contains conversation data. Please use the "Conversations" tab to view this content.');
      } else if (format === 'ndjson') {
        // Parse NDJSON format (original logs)
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
        setFormatMessage(`Successfully loaded ${parsedEntries.length} log entries.`);
      } else {
        setEntries([]);
        setFormatMessage('Unsupported data format. Expected NDJSON logs or agent flow JSON arrays.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse log data');
    } finally {
      setIsLoading(false);
    }
  }, [logData]);

  const categorizeEntry = (entry: LogEntry): string[] => {
    const categories: string[] = [];

    // Safely access message field (might not exist in new JSON array format)
    const message = entry.message || '';

    // System prompts
    if (entry.system_prompt || message.includes('system prompt') || entry.action === 'agent_initialization') {
      categories.push('system_prompts');
    }

    // Tool executions
    if (message.includes('API') || message.includes('request') ||
        message.includes('database') || entry.action?.includes('search')) {
      categories.push('tool_executions');
    }

    // Resource operations
    if (message.includes('resource') || entry.action?.includes('resource') ||
        message.includes('embedding')) {
      categories.push('resource_operations');
    }

    // Agent outputs
    if (message.includes('response') || entry.action?.includes('response') ||
        message.includes('Agent') || entry.agent_name) {
      categories.push('agent_outputs');
    }

    // Errors and warnings
    if (entry.level === 'ERROR' || entry.level === 'WARNING' ||
        message.includes('Observation: Error:') ||
        message.includes('Error:')) {
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
    error,
    dataFormat,
    formatMessage
  };
}