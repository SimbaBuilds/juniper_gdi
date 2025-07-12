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
    // Use request_id if available, otherwise group by user_id, skip entries without either
    const conversationId = entry.request_id || (entry.user_id ? `user_${entry.user_id}` : null);
    
    if (!conversationId) {
      // Skip logs that don't belong to a user session or specific request
      return;
    }
    
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
  
  // Filter out routine system logs that don't represent meaningful agent actions
  const routinePatterns = [
    'Settings updated:',
    'Integration in progress:',
    'Successfully processed chat response',
    'Using user\'s preferred model:',
    'User search config:',
    'Processing chat request -',
    'thought match:',
    'action match:',
    'observation match:',
    'response match:',
    'processing complete response'
  ];
  
  // Skip routine system messages
  if (routinePatterns.some(pattern => entry.message.includes(pattern))) {
    return null;
  }
  
  // Only include meaningful entries
  let stepType: AgentStep['type'] = 'agent_response';
  let title = '';
  let content = entry.message;
  
  if (entry.level === 'ERROR') {
    stepType = 'error';
    title = 'Error Occurred';
  } else if (entry.message.includes('system prompt') || entry.action === 'agent_initialization') {
    stepType = 'system_prompt';
    title = 'System Prompt';
  } else if (entry.action?.includes('search') || entry.message.includes('semantic search') ||
             entry.message.includes('database search')) {
    stepType = 'tool_execution';
    title = extractToolName(entry.message) || 'Search Operation';
  } else if (entry.action?.includes('resource') || entry.action?.includes('retrieval') ||
             entry.message.includes('auto-context')) {
    stepType = 'resource_retrieval';
    title = 'Resource Retrieval';
  } else if (entry.message.includes('model response:')) {
    stepType = 'agent_response';
    title = `${entry.agent_name || 'Agent'} Response`;
  } else if (entry.action?.includes('query_start') || entry.message.includes('Starting query processing')) {
    stepType = 'system_prompt';
    title = 'Query Started';
  } else {
    // Skip other entries that don't represent key agent flow steps
    return null;
  }

  // Extract structured content for better display
  let extractedContent = extractAgentContent(entry.message);
  
  // For non-model-response entries, create more meaningful content
  if (!extractedContent.thought && !extractedContent.action && !extractedContent.response) {
    if (stepType === 'system_prompt' && entry.action === 'query_start') {
      extractedContent = {
        response: `Started processing query for user ${entry.user_id?.slice(-8) || 'unknown'} in request ${entry.request_id || 'session'}`
      };
    } else if (stepType === 'resource_retrieval') {
      extractedContent = {
        action: entry.message
      };
    } else if (stepType === 'tool_execution') {
      extractedContent = {
        action: entry.message
      };
    }
  }

  return {
    id: stepId,
    type: stepType,
    timestamp: entry.timestamp,
    agent_name: entry.agent_name,
    title,
    content,
    extractedContent,
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

interface AgentResponseContent {
  thought?: string;
  action?: string;
  observation?: string;
  response?: string;
  fullContent?: string;
}

function extractAgentContent(message: string): AgentResponseContent {
  // Extract structured content from agent model responses
  if (!message.includes('model response:')) {
    return { fullContent: message };
  }

  const content = message.split('model response:')[1]?.trim();
  if (!content) {
    return { fullContent: message };
  }

  const result: AgentResponseContent = { fullContent: content };

  // Extract thought section
  const thoughtMatch = content.match(/Thought:\s*([^\n]*(?:\n(?!(?:Action|Observation|Response):)[^\n]*)*)/);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  // Extract action section
  const actionMatch = content.match(/Action:\s*([^\n]*(?:\n(?!(?:Thought|Observation|Response):)[^\n]*)*)/);
  if (actionMatch) {
    result.action = actionMatch[1].trim();
  }

  // Extract observation section
  const observationMatch = content.match(/Observation:\s*([^\n]*(?:\n(?!(?:Thought|Action|Response):)[^\n]*)*)/);
  if (observationMatch) {
    result.observation = observationMatch[1].trim();
  }

  // Extract response section
  const responseMatch = content.match(/Response:\s*([^\n]*(?:\n(?!(?:Thought|Action|Observation):)[^\n]*)*)/);
  if (responseMatch) {
    result.response = responseMatch[1].trim();
  }

  return result;
}