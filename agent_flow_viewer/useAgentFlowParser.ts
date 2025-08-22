import { useState, useEffect } from 'react';
import { LogEntry, AgentRequest, AgentStep } from '@/lib/types';

interface AgentResponseContent {
  thought?: string;
  action?: string;
  observation?: string;
  response?: string;
  fullContent?: string;
  systemPrompt?: string;
  systemPromptCache?: {
    isCached: boolean;
    sections?: {
      content: string;
      cached: boolean;
      type?: string;
    }[];
    totalSections?: number;
  };
  service_name?: string;
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
  resourceCount?: number;
  resourceContent?: string;
  observationData?: {
    results: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
      instructions?: string;
      relevance_score?: number;
      similarity_score?: number;
      final_score?: number;
      last_accessed?: string;
      created_at?: string;
    }>;
  };
}

export function useAgentFlowParser(logData: string | null) {
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logData) {
      setRequests([]);
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

      // Convert log entries to agent requests
      const parsedRequests = parseAgentRequests(logEntries);
      setRequests(parsedRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse log data');
    } finally {
      setIsLoading(false);
    }
  }, [logData]);

  return {
    requests,
    isLoading,
    error
  };
}

function parseAgentRequests(logEntries: LogEntry[]): AgentRequest[] {
  const requests: AgentRequest[] = [];
  let startIndex = -1;
  
  for (let i = 0; i < logEntries.length; i++) {
    const entry = logEntries[i];
    
    // Look for authentication successful as start of new request
    if (entry.message.includes('Received chat request:') || 
        entry.message === '=== TEST SESSION START ===') {
      startIndex = i;
    }
    
    // Look for request completed as end of current request
    if (startIndex !== -1 && (entry.message.includes('Request completed:') ||
        entry.message === '=== TEST SESSION END ===')) {
      // Extract entries for this request
      const requestEntries = logEntries.slice(startIndex, i + 1);
      
      if (requestEntries.length > 0) {
        // Get user_id and request_id from the entries
        let userId = 'unknown_user';
        let requestId = '';
        
        for (const requestEntry of requestEntries) {
          if (requestEntry.user_id && userId === 'unknown_user') {
            userId = requestEntry.user_id;
          }
          if (requestEntry.request_id && !requestId) {
            requestId = requestEntry.request_id;
          }
        }
        
        const requestKey = requestId ? `${userId}_${requestId}` : userId;
        
        const request: AgentRequest = {
          id: requestKey,
          user_id: userId,
          request_id: requestId,
          start_time: requestEntries[0].timestamp,
          end_time: requestEntries[requestEntries.length - 1].timestamp,
          steps: [],
          entries: requestEntries,
          summary: {
            total_steps: 0,
            agents_involved: [],
            tools_used: [],
            resources_retrieved: 0,
            errors: 0
          }
        };

        // Convert entries to steps
        requestEntries.forEach((requestEntry, index) => {
          const step = convertLogEntryToStep(requestEntry, index);
          
          if (step) {
            request.steps.push(step);
            
            // Update summary - only count steps that contain "Thought:" as actual LLM reasoning steps
            if (isThoughtStep(step)) {
              request.summary.total_steps++;
            }
            
            if (step.agent_name && !request.summary.agents_involved.includes(step.agent_name)) {
              request.summary.agents_involved.push(step.agent_name);
            }
            
            if (requestEntry.level === 'ERROR' || 
                requestEntry.message.includes('Observation: Error:') ||
                requestEntry.message.includes('Error:')) {
              request.summary.errors++;
            }
            
            if (step.type === 'resource_retrieval') {
              request.summary.resources_retrieved++;
            }
            
            if (step.type === 'tool_execution') {
              const toolName = extractToolName(requestEntry.message);
              if (toolName && !request.summary.tools_used.includes(toolName)) {
                request.summary.tools_used.push(toolName);
              }
            }
          }
        });

        requests.push(request);
      }
      
      // Reset for next request
      startIndex = -1;
    }
  }
  
  return requests;
}

function isThoughtStep(step: AgentStep): boolean {
  // A step represents a "Thought" log if it contains structured reasoning with a "Thought:" section
  // These are the actual LLM reasoning steps that should be counted
  return Boolean(step.content?.includes('Thought:')) || 
         Boolean(step.extractedContent?.thought && step.extractedContent.thought.trim().length > 0);
}

function convertLogEntryToStep(entry: LogEntry, index: number): AgentStep | null {
  const stepId = `step_${index}`;

  // Handle initial request messages (chat requests)
  if (entry.message.includes('Received chat request:')) {
    // More robust message parsing to handle apostrophes within the message
    const messageMatch = entry.message.match(/message='(.*?)',\s*history_count=/);
    const requestIdMatch = entry.message.match(/request_id=([^,\s]+)/);
    const historyCountMatch = entry.message.match(/history_count=(\d+)/);
    const preferencesMatch = entry.message.match(/preferences=\{([^}]+)\}/);
    
    const userMessage = messageMatch ? messageMatch[1] : 'Unknown request';
    const requestId = requestIdMatch ? requestIdMatch[1] : entry.request_id;
    const historyCount = historyCountMatch ? parseInt(historyCountMatch[1]) : 0;
    const preferences = preferencesMatch ? preferencesMatch[1] : '';
    
    return {
      id: stepId,
      type: 'initial_request',
      timestamp: entry.timestamp,
      agent_name: 'User',
      title: 'Initial Request',
      content: userMessage,
      extractedContent: {
        response: userMessage,
        fullContent: entry.message,
        requestDetails: {
          requestId: requestId || '',
          historyCount,
          preferences
        }
      },
      actionNumber: null,
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
      status: 'success'
    };
  }

  // Handle "Integration in progress" entries
  if (entry.message.includes('Integration in progress. Now using model:')) {
    const modelMatch = entry.message.match(/using model:\s*([^\s]+)\s+for\s+([^$]+)/);
    const model = modelMatch ? modelMatch[1] : 'Unknown model';
    const agentType = modelMatch ? modelMatch[2] : 'agent';
    
    const actualAgentName = entry.agent_name || 'Integrations Agent';
    
    return {
      id: stepId,
      type: 'intelligence_change' as const,
      timestamp: entry.timestamp,
      agent_name: actualAgentName,
      title: `${actualAgentName} Integration Started`,
      content: entry.message,
      extractedContent: {
        response: `Integration in progress. Now using model: ${model}`,
        fullContent: entry.message
      },
      actionNumber: null,
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
      status: 'success'
    };
  }

  // Handle "Intelligence upgraded" entries
  if (entry.message.includes('Intelligence upgraded to level')) {
    const levelMatch = entry.message.match(/Intelligence upgraded to level\s*(\d+)/);
    const level = levelMatch ? levelMatch[1] : 'unknown';
    
    const actualAgentName = entry.agent_name || 'Agent';
    
    return {
      id: stepId,
      type: 'intelligence_change' as const,
      timestamp: entry.timestamp,
      agent_name: actualAgentName,
      title: `${actualAgentName} Intelligence Upgrade`,
      content: entry.message,
      extractedContent: {
        response: `Intelligence upgraded to level ${level}`,
        fullContent: entry.message
      },
      actionNumber: null,
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
      status: 'success'
    };
  }

  // Handle "Adding observation to messages" entries - these contain structured observation data
  if (entry.message.includes('Adding observation to messages:')) {
    
    // Extract the observation content after "Adding observation to messages:"
    const observationPrefix = 'Adding observation to messages:';
    const observationIndex = entry.message.indexOf(observationPrefix);
    if (observationIndex === -1) return null;
    
    const observationContent = entry.message.substring(observationIndex + observationPrefix.length).trim();
    
    // Remove any "Observation: " prefix that might be there
    const cleanContent = observationContent.replace(/^Observation:\s*/, '');
    
    
    // Extract the actual agent name from the entry
    const actualAgentName = extractActualAgentName(entry.message) || entry.agent_name;
    const displayAgentName = actualAgentName || 'Agent';
    
    // Try to parse as JSON to detect the data structure
    let parsedObservation = null;
    let observationText = cleanContent;
    let structuredData = null;
    
    try {
      // Look for JSON content (could start with [ or {)
      const jsonMatch = cleanContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        const jsonString = jsonMatch[1];
        parsedObservation = JSON.parse(jsonString);
        
        // Handle different data structures
        if (parsedObservation.status && parsedObservation.message) {
          // Traditional tool observation format
          observationText = `Status: ${parsedObservation.status}\nMessage: ${parsedObservation.message}`;
          structuredData = parsedObservation.results ? {
            results: parsedObservation.results
          } : undefined;
        } else if (Array.isArray(parsedObservation)) {
          // Array of data - distinguish between database resources and email/external data
          const count = parsedObservation.length;
          if (count > 0) {
            const firstItem = parsedObservation[0];
            const itemKeys = Object.keys(firstItem);
            
            // Check if this looks like database resources (has id, title, content, type fields)
            const isDatabaseResource = firstItem.id && firstItem.title && firstItem.content && firstItem.type;
            
            // Check if this looks like email data (has subject, from, body, etc.)
            const isEmailData = firstItem.subject || firstItem.from || firstItem.body || firstItem.sender;
            
            if (isDatabaseResource) {
              observationText = `Found ${count} matching items`;
              if (firstItem.title) {
                observationText += `\nFirst resource: "${firstItem.title}"`;
              }
              if (count > 1) {
                observationText += `\n... and ${count - 1} more items`;
              }
            } else if (isEmailData) {
              observationText = `Retrieved ${count} items`;
              if (firstItem.subject) {
                observationText += `\nFirst email: "${firstItem.subject}"`;
              }
              if (count > 1) {
                observationText += `\n... and ${count - 1} more items`;
              }
            } else {
              // Generic data items
              observationText = `Retrieved ${count} items`;
              if (firstItem.subject) {
                observationText += `\nFirst item: "${firstItem.subject}"`;
              } else if (firstItem.title) {
                observationText += `\nFirst item: "${firstItem.title}"`;
              } else if (firstItem.name) {
                observationText += `\nFirst item: "${firstItem.name}"`;
              }
              if (count > 1) {
                observationText += `\n... and ${count - 1} more items`;
              }
            }
          } else {
            observationText = 'Empty result set';
          }
          structuredData = { results: parsedObservation };
        } else if (typeof parsedObservation === 'object') {
          // Complex object - show key information
          const keys = Object.keys(parsedObservation);
          observationText = `Data object with ${keys.length} fields`;
          if (keys.length > 0) {
            observationText += `\nFields: ${keys.slice(0, 5).join(', ')}`;
            if (keys.length > 5) {
              observationText += ` ... and ${keys.length - 5} more`;
            }
          }
          structuredData = { results: [parsedObservation] };
        }
      }
    } catch (error) {
      // Keep the original text if JSON parsing fails
    }
    
    const result: AgentStep = {
      id: stepId,
      type: 'agent_response' as const,
      timestamp: entry.timestamp,
      agent_name: actualAgentName || entry.agent_name,
      title: `${displayAgentName} Observation`,
      content: entry.message,
      extractedContent: {
        observation: observationText,
        observationData: structuredData || undefined
      },
      actionNumber: null,
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
      status: 'success'
    };
    
    return result;
  }

  // Check for resource addition messages
  const resourceAdditionMatch = entry.message.match(/(\w+\s+Agent)\s+added\s+(\d+)\s+relevant\s+resources\s+to\s+chat\s+context(?::\s+([\s\S]*))?/);
  if (resourceAdditionMatch) {
    const agentName = resourceAdditionMatch[1];
    const resourceCount = parseInt(resourceAdditionMatch[2]);
    const resourceContent = resourceAdditionMatch[3] || '';
    
    // Parse structured resources if available
    let parsedResources: Array<{
      id: string;
      title: string;
      content: string;
    }> = [];
    
    if (resourceContent && resourceContent.includes('Relevant Resources:')) {
      // Extract individual resource entries
      const resourceMatches = resourceContent.matchAll(/- \[ID: ([^\]]+)\] Title: "([^"]+)" \| Content: "([^"]+)"/g);
      
      for (const match of resourceMatches) {
        parsedResources.push({
          id: match[1],
          title: match[2],
          content: match[3]
        });
      }
    }
    
    return {
      id: stepId,
      type: 'resource_retrieval',
      timestamp: entry.timestamp,
      agent_name: agentName,
      title: `Injected Resources`,
      content: resourceContent ? `Added ${resourceCount} relevant resources to chat context:\n${resourceContent}` : `Added ${resourceCount} relevant resources to chat context`,
      extractedContent: { 
        action: entry.message,
        resourceCount,
        resourceContent,
        associatedResources: parsedResources.length > 0 ? parsedResources : undefined
      },
      actionNumber: null,
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
      status: 'success'
    };
  }

  // Skip redundant cache detection messages since they're handled by the main system prompt display
  if (entry.message.includes('using standard (uncached) system prompt') || 
      entry.message.includes('using CACHED system prompt')) {
    return null;
  }

  // 1. TRUE SYSTEM PROMPT: Only include if a dedicated field or clear message
  if (entry.system_prompt || (typeof entry.message === 'string' && entry.message.trim().toLowerCase().startsWith('system prompt:'))) {
    const promptText = (typeof entry.system_prompt === 'string' ? entry.system_prompt : '') || entry.message.replace(/^System Prompt:/i, '').trim();
    const actualAgentName = extractActualAgentName(entry.message);
    const displayAgentName = actualAgentName || entry.agent_name || 'Agent';
    
    // Parse cached sections if present in the prompt text
    const cacheInfo = parseSystemPromptCache(promptText);
    
    return {
      id: stepId,
      type: 'system_prompt',
      timestamp: entry.timestamp,
      agent_name: actualAgentName || entry.agent_name,
      title: `${displayAgentName} System Prompt`,
      content: promptText,
      extractedContent: { 
        response: promptText,
        systemPrompt: promptText,
        systemPromptCache: cacheInfo
      },
      actionNumber: null,
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

  // FIRST: Check for important content that should always be included
  const shouldInclude = (
    // Agent model responses (core reasoning)
    entry.message.includes('model response:') ||
    // Resource-related observations
    entry.message.includes('Associated Resources:') ||
    entry.message.includes('Observation: Observation: Available service tools:') ||
    entry.message.includes('[Memory Resources]') ||
    // Tool executions
    entry.message.includes('Executing service tool') ||
    entry.message.includes('Successfully executed service tool') ||
    entry.message.includes('Tool:') && entry.message.includes('Parameters:') ||
    // Action execution tracking
    entry.message.match(/Action\s+\d+\/\d+\s+executed/) ||
    // Resource fetching
    entry.message.includes('Fetching truncated resources') ||
    entry.message.includes('Found') && entry.message.includes('truncated resources') ||
    entry.message.includes('Added') && entry.message.includes('integration script tags') ||
    // Errors
    entry.level === 'ERROR' ||
    entry.message.toLowerCase().includes('failed') ||
    entry.message.toLowerCase().includes('error')
  );

  if (!shouldInclude) {
    // Skip infrastructure messages
    const infrastructurePatterns = [
      '=== Authentication successful ===',
      'Received chat request:',
      'Processing chat request -',
      'Successfully processed chat response',
      'Request completed:',
      'Settings updated:',
      'Integration in progress:',
      'Using user\'s preferred model:',
      'User search config:',
      'Initialized AnthropicProvider',
      'Generated response from AnthropicProvider',
      'Agent initialized with system prompt',
      'Starting query processing',
      'Query completed successfully',
      'Agent produced observation',
      'Agent produced final response',
      'processing actions from response',
      'generating model response with',
      'Adding observation to messages:',
      'generated response from',
      'Generated response from',
      'Action 1/', 'Action 2/', 'Action 3/', 'Action 4/', 'Action 5/',
      'Action 6/', 'Action 7/', 'Action 8/',
      'thought match:', 'action match:', 'observation match:', 'response match:',
      'processing mid-process response',
      'processing final response'
    ];
    
    if (infrastructurePatterns.some(pattern => entry.message.includes(pattern))) {
      return null;
    }
    
    // Skip non-agent components unless they're errors
    const nonAgentLoggers = ['app.auth', 'app.endpoints.chat', 'app.main'];
    if (nonAgentLoggers.includes(entry.logger) && entry.level !== 'ERROR') {
      return null;
    }
  }
  
  // NOW classify the meaningful agent steps
  let stepType: AgentStep['type'] = 'agent_response';
  let title = entry.message;
  let content = entry.message;
  
  // Extract actual agent name from message content (Chat Agent, Config Agent, etc.)
  const actualAgentName = extractActualAgentName(entry.message);
  const displayAgentName = actualAgentName || entry.agent_name || 'Agent';
  
  // 1. AGENT MODEL RESPONSES - The core reasoning
  if (entry.message.includes('model response:')) {
    stepType = 'agent_response';
    // Check if it's structured reasoning or a direct response
    if (entry.message.includes('Thought:') || entry.message.includes('Action:') || 
        entry.message.includes('Observation:') || entry.message.includes('Response:')) {
      title = `${displayAgentName} Reasoning`;
    } else {
      title = `${displayAgentName} Response`;
    }
    content = entry.message;
  }
  
  // 2. RESOURCE RETRIEVAL - When agents fetch context or resources
  else if (entry.action?.includes('fetch_service_resources') || 
           entry.message.includes('Fetching truncated resources') ||
           entry.message.includes('Found') && entry.message.includes('truncated resources') ||
           entry.message.includes('Added') && entry.message.includes('integration script tags')) {
    stepType = 'resource_retrieval';
    title = `${displayAgentName} Resource Retrieval`;
    content = entry.message;
  }
  
  // 3. TOOL/SERVICE EXECUTIONS - When agents actually do things
  else if (entry.action?.includes('service_tool_call') || 
           entry.message.includes('Executing service tool') ||
           entry.message.includes('Successfully executed service tool')) {
    stepType = 'tool_execution';
    title = `${displayAgentName} Tool Execution`;
    content = entry.message;
  }
  
  // 3.5. ACTION EXECUTION TRACKING - Action progress messages
  else if (entry.message.match(/Action\s+\d+\/\d+\s+executed/)) {
    stepType = 'agent_response';
    title = `${displayAgentName} Action Progress`;
    content = entry.message;
  }
  
  // 4. OBSERVATIONS WITH RESOURCES - Key observations that contain resources
  else if (entry.message.includes('Observation:') && 
           (entry.message.includes('Associated Resources:') || 
            entry.message.includes('Available service tools:') ||
            entry.message.includes('[Memory Resources]') ||
            entry.message.includes('SMS sent successfully'))) {
    stepType = 'agent_response';
    title = `Observation`;
    content = entry.message;
  }
  
  // 5. TOOL DETAILS - Complete tool information
  else if (entry.message.includes('Tool:') && entry.message.includes('Parameters:')) {
    stepType = 'tool_execution';
    title = `Tool Details`;
    content = entry.message;
  }
  
  // 6. ERRORS - When things go wrong
  else if (entry.level === 'ERROR' || 
           entry.message.includes('Observation: Error:') ||
           entry.message.toLowerCase().includes('failed') ||
           entry.message.toLowerCase().includes('error')) {
    stepType = 'error';
    title = 'Error Occurred';
    content = entry.message;
  }
  
  // 7. FINAL FILTER - If none of the above, skip it
  else {
    return null;
  }
  
  // Extract structured content for better display
  let extractedContent = extractAgentContent(entry.message);
  
  // Enhance content for specific step types
  if (stepType === 'resource_retrieval') {
    extractedContent = {
      action: entry.message,
      service_name: typeof entry.service_name === 'string' ? entry.service_name : undefined
    };
  } else if (stepType === 'tool_execution' && !extractedContent.toolDetails) {
    extractedContent = {
      action: entry.message
    };
  }

  // Extract action number if present
  const actionNumber = extractActionNumber(entry.message);
  

  return {
    id: stepId,
    type: stepType,
    timestamp: entry.timestamp,
    agent_name: actualAgentName || entry.agent_name,
    title,
    content,
    extractedContent,
    actionNumber,
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

function extractActualAgentName(message: string): string | null {
  // Extract actual agent names from message content
  // Patterns: "Chat Agent model response:", "Config Agent generating", etc.
  const patterns = [
    /^([A-Za-z\s]+Agent)\s+model\s+response:/i,
    /^([A-Za-z\s]+Agent)\s+generating/i,
    /^([A-Za-z\s]+Agent)\s+processing/i,
    /^([A-Za-z\s]+Agent)\s+thought\s+match:/i,
    /^([A-Za-z\s]+Agent)\s+action\s+match:/i,
    /^([A-Za-z\s]+Agent)\s+observation\s+match:/i,
    /^([A-Za-z\s]+Agent)\s+response\s+match:/i,
    /^([A-Za-z\s]+Agent)\s+detected/i,
    /^([A-Za-z\s]+Agent)\s+preserving/i,
    /^([A-Za-z\s]+Agent)\s+produced/i,
    /^([A-Za-z\s]+Agent)\s+completed/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
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

  // Parse structured reasoning patterns with improved regex to handle numbered formats
  // Handle both "Thought:" and "1. Thought:" formats, with better multiline support
  const thoughtMatch = content.match(/(?:^|\n)\s*(?:\d+\.\s*)?Thought:\s*([\s\S]*?)(?=\n\s*(?:\d+\.\s*)?(?:Action:|Observation:|Response:)|$)/);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  const actionMatch = content.match(/(?:^|\n)\s*(?:\d+\.\s*)?Action:\s*([\s\S]*?)(?=\n\s*(?:\d+\.\s*)?(?:Observation:|Response:)|$)/);
  if (actionMatch) {
    result.action = actionMatch[1].trim();
  }

  const observationMatch = content.match(/(?:^|\n)\s*(?:\d+\.\s*)?Observation:\s*([\s\S]*?)(?=\n\s*(?:\d+\.\s*)?Response:|$)/);
  if (observationMatch) {
    result.observation = observationMatch[1].trim();
  }

  const responseMatch = content.match(/(?:^|\n)\s*(?:\d+\.\s*)?Response:\s*([\s\S]*?)$/);
  if (responseMatch) {
    result.response = responseMatch[1].trim();
  }

  // If no structured content was found, try to parse standalone observation messages
  if (!result.thought && !result.action && !result.response && message.includes('Observation:')) {
    // Handle standalone observation messages (like from tool executions)
    const observationMatch = content.match(/Observation:\s*([\s\S]*?)$/);
    if (observationMatch) {
      result.observation = observationMatch[1].trim();
    }
  }

  // If no structured content was found but this is a model response, treat the entire content as a response
  if (!result.thought && !result.action && !result.response && !result.observation && 
      message.includes('model response:')) {
    // Extract the response content after "model response:"
    const responseIndex = message.indexOf('model response:');
    if (responseIndex !== -1) {
      const responseContent = message.substring(responseIndex + 'model response:'.length).trim();
      // Clean any newline characters at the start
      result.response = responseContent.replace(/^\n+/, '');
    }
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

function extractActionNumber(message: string): { current: number; total: number } | null {
  // Extract action numbers from messages like "Action 1/8 executed"
  const actionMatch = message.match(/Action\s+(\d+)\/(\d+)\s+executed/);
  if (actionMatch) {
    return {
      current: parseInt(actionMatch[1]),
      total: parseInt(actionMatch[2])
    };
  }
  return null;
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

function parseSystemPromptCache(promptText: string): {
  isCached: boolean;
  sections?: {
    content: string;
    cached: boolean;
    type?: string;
  }[];
  totalSections?: number;
} | undefined {
  if (!promptText) return undefined;
  
  // Check for cache markers in the prompt
  const hasCacheMarkers = promptText.includes('[CACHED:') || promptText.includes('[UNCACHED]');
  
  if (!hasCacheMarkers) {
    // No cache markers found - assume fully uncached
    return {
      isCached: false,
      sections: [{
        content: promptText,
        cached: false,
        type: 'full'
      }],
      totalSections: 1
    };
  }
  
  const sections: { content: string; cached: boolean; type?: string; }[] = [];
  
  // Split the text into sections based on cache markers
  const parts = promptText.split(/(\[(?:CACHED:[^\]]+|UNCACHED)\])/);
  
  let currentCachedState = false;
  let currentType: string | undefined;
  let hasSeenCacheMarker = false;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    
    if (!part) continue;
    
    // Check if this part is a cache marker
    if (part.startsWith('[CACHED:')) {
      // Extract cache type (e.g., "EPHEMERAL" from "[CACHED:EPHEMERAL]")
      const typeMatch = part.match(/\[CACHED:([^\]]+)\]/);
      currentCachedState = true;
      currentType = typeMatch ? typeMatch[1] : 'cached';
      hasSeenCacheMarker = true;
      continue;
    } else if (part === '[UNCACHED]') {
      currentCachedState = false;
      currentType = 'uncached';
      hasSeenCacheMarker = true;
      continue;
    }
    
    // This is content - add it to sections
    if (part.length > 0) {
      // Skip content at the very beginning before any cache markers 
      // (this is usually just whitespace or header text that should be ignored)
      if (!hasSeenCacheMarker) {
        continue;
      }
      
      sections.push({
        content: part,
        cached: currentCachedState,
        type: currentType
      });
    }
  }
  
  // If no sections were parsed, treat the entire prompt as content
  if (sections.length === 0) {
    sections.push({
      content: promptText,
      cached: false,
      type: 'full'
    });
  }
  
  // Determine if overall prompt is cached (has any cached sections)
  const hasCachedSections = sections.some(section => section.cached);
  
  return {
    isCached: hasCachedSections,
    sections,
    totalSections: sections.length
  };
}