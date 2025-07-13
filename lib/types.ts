export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  logger: string;
  message: string;
  module: string;
  pathname: string;
  lineno: number;
  funcName: string;
  component?: string;
  action?: string;
  agent_name?: string;
  user_id?: string;
  request_id?: string;
  exception?: string;
  service_type?: string;
  [key: string]: any;
}

export interface LogFilterOptions {
  levels: string[];
  loggers: string[];
  components: string[];
  agents: string[];
  timeRange: {
    start?: string;
    end?: string;
  };
  searchTerm: string;
  showSystemPrompts: boolean;
  showToolExecutions: boolean;
  showResourceOperations: boolean;
  showAgentOutputs: boolean;
  showErrors: boolean;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byLogger: Record<string, number>;
  byComponent: Record<string, number>;
  byAgent: Record<string, number>;
  errorRate: number;
  timeRange: {
    start: string;
    end: string;
  };
}

// Agent Flow specific types
export interface AgentStep {
  id: string;
  type: 'system_prompt' | 'tool_execution' | 'resource_retrieval' | 'agent_response' | 'error';
  timestamp: string;
  agent_name?: string;
  title: string;
  content: string;
  details?: Record<string, any>;
  user_id?: string;
  request_id?: string;
  duration?: number;
  status?: 'success' | 'error' | 'pending';
  extractedContent?: {
    thought?: string;
    action?: string;
    observation?: string;
    response?: string;
    fullContent?: string;
    systemPrompt?: string;
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
      parameters?: Record<string, any>;
      example?: string;
    };
  };
}

export interface AgentConversation {
  id: string;
  user_id?: string;
  request_id?: string;
  start_time: string;
  end_time?: string;
  steps: AgentStep[];
  summary: {
    total_steps: number;
    agents_involved: string[];
    tools_used: string[];
    resources_retrieved: number;
    errors: number;
  };
}

export interface FlowViewOptions {
  showSystemPrompts: boolean;
  showToolExecutions: boolean;
  showResourceRetrievals: boolean;
  showAgentResponses: boolean;
  showErrors: boolean;
  selectedAgent?: string;
  selectedRequest?: string;
  timeRange?: {
    start?: string;
    end?: string;
  };
}

export interface FlowStats {
  totalConversations: number;
  totalSteps: number;
  averageStepsPerConversation: number;
  mostActiveAgent: string;
  totalErrors: number;
  errorRate: number;
  uniqueUsers: number;
  timeSpan: {
    start: string;
    end: string;
    duration: string;
  };
}