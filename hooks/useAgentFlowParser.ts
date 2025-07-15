import { useState, useEffect } from 'react';
import { LogEntry, AgentConversation, AgentStep } from '@/lib/types';

interface AgentResponseContent {
  thought?: string;
  action?: string;
  observation?: string;
  response?: string;
  fullContent?: string;
  systemPrompt?: string;
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
        
        // Use the extracted agent name from the step (Chat Agent, Config Agent, etc.)
        if (step.agent_name && !conversation.summary.agents_involved.includes(step.agent_name)) {
          conversation.summary.agents_involved.push(step.agent_name);
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

  // Handle "Adding observation to messages" entries - these contain structured observation data
  if (entry.message.includes('Adding observation to messages:')) {
    console.log('Found observation message:', entry.message);
    
    // Simple approach: find the JSON starting from the first { and ending at the last }
    const jsonStart = entry.message.indexOf('{');
    const jsonEnd = entry.message.lastIndexOf('}');
    
    console.log('JSON positions:', { jsonStart, jsonEnd });
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const jsonString = entry.message.substring(jsonStart, jsonEnd + 1);
        console.log('Extracted JSON string:', jsonString);
        
        const observationData = JSON.parse(jsonString);
        console.log('Parsed observation data:', observationData);
        
        // Extract the actual agent name from the entry
        const actualAgentName = extractActualAgentName(entry.message) || entry.agent_name;
        const displayAgentName = actualAgentName || 'Agent';
        
        const result: AgentStep = {
          id: stepId,
          type: 'agent_response' as const,
          timestamp: entry.timestamp,
          agent_name: actualAgentName || entry.agent_name,
          title: `${displayAgentName} Observation`,
          content: entry.message,
          extractedContent: {
            observation: `Status: ${observationData.status}\nMessage: ${observationData.message}`,
            observationData: observationData.results ? {
              results: observationData.results
            } : undefined
          },
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
          status: observationData.status === 'success' ? 'success' : 'error'
        };
        
        console.log('Returning parsed step:', result);
        return result;
      } catch (error) {
        console.warn('Failed to parse observation JSON:', error, 'Raw message:', entry.message);
        return null;
      }
    }
    console.log('No valid JSON found in message');
    return null;
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

  // 1. TRUE SYSTEM PROMPT: Only include if a dedicated field or clear message
  if (entry.system_prompt || (typeof entry.message === 'string' && entry.message.trim().toLowerCase().startsWith('system prompt:'))) {
    const promptText = entry.system_prompt || entry.message.replace(/^System Prompt:/i, '').trim();
    const actualAgentName = extractActualAgentName(entry.message);
    const displayAgentName = actualAgentName || entry.agent_name || 'Agent';
    
    return {
      id: stepId,
      type: 'system_prompt',
      timestamp: entry.timestamp,
      agent_name: actualAgentName || entry.agent_name,
      title: `${displayAgentName} System Prompt`,
      content: promptText,
      extractedContent: { 
        response: promptText,
        systemPrompt: promptText
      },
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
  if (entry.message.includes('model response:') && 
      (entry.message.includes('Thought:') || entry.message.includes('Action:') || 
       entry.message.includes('Observation:') || entry.message.includes('Response:'))) {
    stepType = 'agent_response';
    title = `${displayAgentName} Reasoning`;
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
      service_name: entry.service_name
    };
  } else if (stepType === 'tool_execution' && !extractedContent.toolDetails) {
    extractedContent = {
      action: entry.message
    };
  }

  return {
    id: stepId,
    type: stepType,
    timestamp: entry.timestamp,
    agent_name: actualAgentName || entry.agent_name,
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