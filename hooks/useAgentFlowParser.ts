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
        } catch {
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
  // Group by conversation more inclusively - combine by user_id primarily, then request_id as secondary
  const conversationMap: Map<string, LogEntry[]> = new Map();
  
  logEntries.forEach(entry => {
    // Primary grouping by user_id for continuity
    let conversationId = entry.user_id || 'unknown_user';
    
    // If we have a request_id, use it to create sub-conversations within the user
    if (entry.request_id) {
      conversationId = `${conversationId}_${entry.request_id}`;
    }
    
    // For entries without request_id but with timestamps close to existing conversations, group them
    if (!entry.request_id && entry.user_id) {
      const existingConversations = Array.from(conversationMap.keys()).filter(key => 
        key.startsWith(entry.user_id as string)
      );
      
      // Find the most recent conversation within 5 minutes
      for (const convId of existingConversations) {
        const convEntries = conversationMap.get(convId) || [];
        const lastEntry = convEntries[convEntries.length - 1];
        if (lastEntry && lastEntry.timestamp) {
          const timeDiff = new Date(entry.timestamp).getTime() - new Date(lastEntry.timestamp).getTime();
          if (Math.abs(timeDiff) < 5 * 60 * 1000) { // 5 minutes
            conversationId = convId;
            break;
          }
        }
      }
    }
    
    if (!conversationMap.has(conversationId)) {
      conversationMap.set(conversationId, []);
    }
    conversationMap.get(conversationId)!.push(entry);
  });

  const parsedConversations: AgentConversation[] = [];
  conversationMap.forEach((entries, conversationId) => {
    const conversation = {
      id: conversationId,
      user_id: entries[0].user_id,
      request_id: entries[0].request_id,
      start_time: entries[0].timestamp,
      end_time: entries[entries.length - 1].timestamp,
      steps: [] as AgentStep[],
      summary: {
        total_steps: 0,
        agents_involved: [] as string[],
        tools_used: [] as string[],
        resources_retrieved: 0,
        errors: 0
      }
    };

    entries.forEach((entry, index) => {
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

    parsedConversations.push(conversation);
  });

  return parsedConversations;
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
    'Adding observation to messages:',
    'Action 1/5 executed',
    'Action 2/8 executed',
    'Action 3/8 executed',
    'Action 4/8 executed',
    'Request completed:',
    'Agent initialized with system prompt',
    'Agent produced observation',
    'Agent produced final response',
    'Query completed successfully'
  ];
  
  // Skip routine system messages
  if (routinePatterns.some(pattern => entry.message.includes(pattern))) {
    return null;
  }
  
  // Determine step type based on message content and action
  let stepType: AgentStep['type'] = 'system_prompt';
  let title = entry.message;
  let content = entry.message;

  if (entry.action?.includes('query_start') || entry.message.includes('Starting query processing')) {
    stepType = 'system_prompt';
    title = 'Query Started';
    content = 'Query Started';
  } else if (entry.action?.includes('log_agent_event') && entry.message.includes('Agent initialized')) {
    stepType = 'system_prompt'; 
    title = 'System Prompt';
    content = 'System Prompt';
  } else if (entry.message.includes('model response:') && 
             (entry.message.includes('Thought:') || entry.message.includes('Action:') || 
              entry.message.includes('Observation:') || entry.message.includes('Response:'))) {
    stepType = 'agent_response';
    title = `${entry.agent_name || 'Agent'} Model Response`;
    content = entry.message;
  } else if (entry.message.includes('Observation:') && 
             (entry.message.includes('Associated Resources:') || entry.message.includes('Available service tools:'))) {
    stepType = 'agent_response';
    title = `${entry.agent_name || 'Agent'} Observation`;
    content = entry.message;
  } else if (entry.message.includes('Tool:') && entry.message.includes('Parameters:')) {
    stepType = 'tool_execution';
    title = 'Tool Details';
    content = entry.message;
  } else if (entry.action?.includes('fetch_service_resources') || entry.message.includes('truncated resources')) {
    stepType = 'resource_retrieval';
    title = 'Resource Retrieval';
    content = entry.message;
  } else if (entry.level === 'ERROR' || entry.message.toLowerCase().includes('error') || 
             entry.message.toLowerCase().includes('failed')) {
    stepType = 'error';
    title = entry.message.includes('Service tool execution failed') ? 'Tool Execution Failed' : 'Error Occurred';
    content = entry.message;
  } else if (entry.message.includes('thought match:') || entry.message.includes('action match:') || 
             entry.message.includes('observation match:') || entry.message.includes('response match:')) {
    // These are parsing logs - include them as agent responses but with lower priority
    stepType = 'agent_response';
    title = `${entry.agent_name || 'Agent'} Pattern Match`;
    content = entry.message;
  } else if (entry.message.includes('processing actions') || entry.message.includes('generating model response')) {
    // Skip these routine processing messages
    return null;
  }

  // Extract structured content for better display
  let extractedContent = extractAgentContent(entry.message);
  
  // For non-model-response entries, create more meaningful content
  if (!extractedContent.thought && !extractedContent.action && !extractedContent.response && !extractedContent.associatedResources && !extractedContent.toolDetails) {
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
  associatedResources?: Array<{
    id: string;
    title: string;
    relevance?: number;
    content: string;
    lastAccessed?: string;
  }>;
  toolDetails?: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
    example?: string;
  };
}

function extractAgentContent(message: string): AgentResponseContent {
  // Handle both model responses and observation messages
  let content = message;
  
  // Priority 1: Extract from complete model response format (most reliable)
  if (message.includes('model response:')) {
    const responseIndex = message.indexOf('model response:');
    content = message.substring(responseIndex + 'model response:'.length).trim();
  } 
  // Priority 2: Extract from observation format with resources
  else if (message.includes('Observation:') && (message.includes('Associated Resources:') || message.includes('Available service tools:'))) {
    content = message;
  }
  // Priority 3: Handle pattern matching logs - extract the original content if available
  else if (message.includes('thought match:') || message.includes('action match:') || 
           message.includes('observation match:') || message.includes('response match:')) {
    // For truncated pattern matches, keep the original message
    content = message;
  }
  // Priority 4: Tool details format
  else if (message.includes('Tool:') && message.includes('Parameters:')) {
    content = message;
  }

  // Parse structured components
  const result: AgentResponseContent = {
    thought: '',
    action: '',
    observation: '',
    response: '',
    associatedResources: [],
    toolDetails: undefined
  };

  // Parse structured reasoning patterns
  const thoughtMatch = content.match(/Thought:\s*(.*?)(?=\n\n?Action:|$)/);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  const actionMatch = content.match(/Action:\s*(.*?)(?=\n\n?Observation:|$)/);
  if (actionMatch) {
    result.action = actionMatch[1].trim();
  }

  const observationMatch = content.match(/Observation:\s*(.*?)(?=\n\n?Response:|$)/);
  if (observationMatch) {
    result.observation = observationMatch[1].trim();
  }

  const responseMatch = content.match(/Response:\s*(.*?)$/);
  if (responseMatch) {
    result.response = responseMatch[1].trim();
  }

  // Parse associated resources with improved regex
  if (content.includes('Associated Resources:') || content.includes('[Memory Resources]')) {
    const resourcesStart = content.indexOf('Associated Resources:');
    if (resourcesStart !== -1) {
      const resourcesText = content.substring(resourcesStart);
      result.associatedResources = parseAssociatedResources(resourcesText);
    }
  }

  // Parse available service tools
  if (content.includes('Available service tools:')) {
    const toolsStart = content.indexOf('Available service tools:');
    if (toolsStart !== -1) {
      const toolsText = content.substring(toolsStart);
      // Extract tool list and add to observation if not already there
      if (!result.observation) {
        result.observation = toolsText;
      }
    }
  }

  // Parse tool details
  if (content.includes('Tool:') && content.includes('Parameters:')) {
    const toolDetails = parseToolDetails(content);
    if (toolDetails) {
      result.toolDetails = toolDetails;
    }
  }

  return result;
}

function parseAssociatedResources(resourcesText: string): Array<{
  id: string;
  title: string;
  relevance?: number;
  content: string;
  lastAccessed?: string;
}> {
  const resources: Array<{
    id: string;
    title: string;
    relevance?: number;
    content: string;
    lastAccessed?: string;
  }> = [];

  // Handle both single line and multi-line resource formats
  // Match resource blocks with more flexible whitespace handling
  const resourceMatches = resourcesText.matchAll(/- Resource ID:\s*([^\n]+)\s*\n\s*Title:\s*([^\n]+)\s*\n\s*Relevance:\s*(\d+)\s*\n\s*Content:\s*([^\n]+)\s*\n\s*Last accessed:\s*([^\n]+)/g);

  for (const match of resourceMatches) {
    resources.push({
      id: match[1].trim(),
      title: match[2].trim(),
      relevance: parseInt(match[3]),
      content: match[4].trim(),
      lastAccessed: match[5].trim()
    });
  }

  // If the above pattern doesn't match, try a more flexible approach
  if (resources.length === 0) {
    // Split by lines that start with "- Resource ID:"
    const resourceBlocks = resourcesText.split(/(?=- Resource ID:)/);
    
    for (const block of resourceBlocks) {
      if (!block.trim() || !block.includes('Resource ID:')) continue;
      
      const idMatch = block.match(/Resource ID:\s*([^\n\r]+)/);
      const titleMatch = block.match(/Title:\s*([^\n\r]+)/);
      const relevanceMatch = block.match(/Relevance:\s*(\d+)/);
      const contentMatch = block.match(/Content:\s*([^\n\r]+)/);
      const lastAccessedMatch = block.match(/Last accessed:\s*([^\n\r]+)/);
      
      if (idMatch && titleMatch && contentMatch) {
        resources.push({
          id: idMatch[1].trim(),
          title: titleMatch[1].trim(),
          relevance: relevanceMatch ? parseInt(relevanceMatch[1]) : undefined,
          content: contentMatch[1].trim(),
          lastAccessed: lastAccessedMatch ? lastAccessedMatch[1].trim() : undefined
        });
      }
    }
  }

  return resources;
}

function parseToolDetails(toolText: string): {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  example?: string;
} | undefined {
  const toolMatch = toolText.match(/Tool:\s*([^\n]+)/);
  const descMatch = toolText.match(/Description:\s*([^\n]+)/);
  
  // Handle multi-line parameters JSON
  const paramsMatch = toolText.match(/Parameters:\s*(\{[\s\S]*?\n\})/);
  
  // Handle various example formats
  const examplePatterns = [
    /Example:\s*"([^"]+)"/,
    /Example:\s*'([^']+)'/,
    /Example:\s*"([^"]+)"/,
    /Example:\s*(Action:.*?)(?:\n\w+:|$)/
  ];

  if (!toolMatch) return undefined;

  const result: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
    example?: string;
  } = {
    name: toolMatch[1].trim(),
    description: descMatch ? descMatch[1].trim() : ''
  };

  // Parse parameters with better error handling
  if (paramsMatch) {
    try {
      const paramText = paramsMatch[1].trim();
      result.parameters = JSON.parse(paramText);
    } catch {
      // If JSON parsing fails, try to extract key information
      const paramLines = paramsMatch[1].split('\n');
      const paramObj: Record<string, unknown> = {};
      
      for (const line of paramLines) {
        const keyMatch = line.match(/^\s*"([^"]+)":\s*\{/);
        if (keyMatch) {
          const key = keyMatch[1];
          const typeMatch = line.match(/type":\s*"([^"]+)"/);
          const descMatch = line.match(/description":\s*"([^"]+)"/);
          
          paramObj[key] = {
            type: typeMatch ? typeMatch[1] : 'unknown',
            description: descMatch ? descMatch[1] : ''
          };
        }
      }
      
      result.parameters = Object.keys(paramObj).length > 0 ? paramObj : { raw: paramsMatch[1] };
    }
  }

  // Try multiple example patterns
  for (const pattern of examplePatterns) {
    const match = toolText.match(pattern);
    if (match) {
      result.example = match[1].trim();
      // Clean up escaped quotes and backslashes
      result.example = result.example.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      break;
    }
  }

  return result;
}