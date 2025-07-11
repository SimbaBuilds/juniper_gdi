import { useState, useEffect } from 'react';
import { LogEntry, AgentConversation, AgentStep } from '@/lib/types';

export function useAgentFlowParser(logData: string | null) {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logData) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lines = logData.split('\n').filter(line => line.trim());
      const logEntries: LogEntry[] = [];

      // Parse JSON log entries
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          logEntries.push(entry);
        } catch (lineError) {
          console.warn('Failed to parse log line:', line);
        }
      }

      // Convert log entries to agent conversations
      const parsedConversations = parseAgentConversations(logEntries);
      setConversations(parsedConversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse log data');
    } finally {
      setIsLoading(false);
    }
  }, [logData]);

  return {
    conversations,
    isLoading,
    error
  };
}

function parseAgentConversations(logEntries: LogEntry[]): AgentConversation[] {
  const conversationMap = new Map<string, AgentConversation>();
  
  logEntries.forEach((entry, index) => {
    const conversationId = entry.request_id || entry.user_id || `conversation_${index}`;
    
    if (!conversationMap.has(conversationId)) {
      conversationMap.set(conversationId, {
        id: conversationId,
        user_id: entry.user_id,
        request_id: entry.request_id,
        start_time: entry.timestamp,
        steps: [],
        summary: {
          total_steps: 0,
          agents_involved: [],
          tools_used: [],
          resources_retrieved: 0,
          errors: 0
        }
      });
    }

    const conversation = conversationMap.get(conversationId)!;
    const step = convertLogEntryToStep(entry, index);
    
    if (step) {
      conversation.steps.push(step);
      conversation.end_time = entry.timestamp;
      
      // Update summary
      conversation.summary.total_steps++;
      
      if (entry.agent_name && !conversation.summary.agents_involved.includes(entry.agent_name)) {
        conversation.summary.agents_involved.push(entry.agent_name);
      }
      
      if (entry.level === 'ERROR') {
        conversation.summary.errors++;
      }
      
      if (step.type === 'resource_retrieval') {
        conversation.summary.resources_retrieved++;
      }
      
      if (step.type === 'tool_execution') {
        const toolName = extractToolName(entry.message);
        if (toolName && !conversation.summary.tools_used.includes(toolName)) {
          conversation.summary.tools_used.push(toolName);
        }
      }
    }
  });

  return Array.from(conversationMap.values());
}

function convertLogEntryToStep(entry: LogEntry, index: number): AgentStep | null {
  const stepId = `step_${index}`;
  
  // Determine step type based on log content
  let stepType: AgentStep['type'] = 'agent_response';
  let title = '';
  let content = entry.message;
  
  if (entry.level === 'ERROR') {
    stepType = 'error';
    title = 'Error Occurred';
  } else if (entry.message.includes('system prompt') || entry.action === 'agent_initialization') {
    stepType = 'system_prompt';
    title = 'System Prompt';
  } else if (entry.message.includes('API') || entry.message.includes('request') || 
             entry.message.includes('database') || entry.action?.includes('search')) {
    stepType = 'tool_execution';
    title = extractToolName(entry.message) || 'Tool Execution';
  } else if (entry.message.includes('resource') || entry.action?.includes('resource') ||
             entry.message.includes('embedding') || entry.action?.includes('retrieval')) {
    stepType = 'resource_retrieval';
    title = 'Resource Retrieval';
  } else if (entry.message.includes('response') || entry.action?.includes('response') ||
             entry.message.includes('Agent') || entry.agent_name) {
    stepType = 'agent_response';
    title = `${entry.agent_name || 'Agent'} Response`;
  } else {
    // Skip entries that don't fit our flow categories
    return null;
  }

  return {
    id: stepId,
    type: stepType,
    timestamp: entry.timestamp,
    agent_name: entry.agent_name,
    title,
    content,
    details: {
      logger: entry.logger,
      module: entry.module,
      funcName: entry.funcName,
      component: entry.component,
      action: entry.action,
      pathname: entry.pathname,
      lineno: entry.lineno,
      exception: entry.exception,
      level: entry.level
    },
    user_id: entry.user_id,
    request_id: entry.request_id,
    status: entry.level === 'ERROR' ? 'error' : 'success'
  };
}

function extractToolName(message: string): string | null {
  // Extract tool/API names from log messages
  const patterns = [
    /(\w+) API/i,
    /(\w+) request/i,
    /(\w+) database/i,
    /(\w+) search/i,
    /call_(\w+)/i,
    /(\w+)_agent/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}