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
  [key: string]: unknown;
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
  type: 'initial_request' | 'system_prompt' | 'tool_execution' | 'resource_retrieval' | 'agent_response' | 'intelligence_change' | 'error';
  timestamp: string;
  agent_name?: string;
  title: string;
  content: string;
  details?: Record<string, unknown>;
  user_id?: string;
  request_id?: string;
  duration?: number;
  status?: 'success' | 'error' | 'pending';
  actionNumber?: { current: number; total: number } | null;
  extractedContent?: {
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
    resourceCount?: number;
    resourceContent?: string;
    requestDetails?: {
      requestId: string;
      historyCount: number;
      preferences: string;
    };
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
    observationData?: {
      results: Array<{
        id: string;
        title: string;
        content: string;
        type: string;
        final_score?: number;
        relevance_score?: number;
        similarity_score?: number;
        last_accessed?: string;
        instructions?: string;
        created_at?: string;
      }>;
    };
  };
}

export interface AgentRequest {
  id: string;
  user_id?: string;
  request_id?: string;
  start_time: string;
  end_time?: string;
  steps: AgentStep[];
  entries: LogEntry[];
  summary: {
    total_steps: number;
    agents_involved: string[];
    tools_used: string[];
    resources_retrieved: number;
    errors: number;
  };
}

// Database row format for JSON array files (like mas_logs_rows.json)
export interface DatabaseLogRow {
  idx: number;
  id: string;
  request_id: string;
  user_id: string;
  type: 'thought' | 'action' | 'observation' | 'response' | 'user_request';
  turn: number;
  agent_name: string;
  content: string;
  model: string;
  action_name: string | null;
  action_params: string | null;
  metadata: string;
  created_at: string;
}

export interface FlowViewOptions {
  showInitialRequests: boolean;
  showSystemPrompts: boolean;
  showToolExecutions: boolean;
  showResourceRetrievals: boolean;
  showAgentResponses: boolean;
  showIntelligenceChanges: boolean;
  showErrors: boolean;
  selectedAgents: string[]; // Changed from selectedAgent to selectedAgents array
  selectedRequest?: string;
  timeRange?: {
    start?: string;
    end?: string;
  };
}

export interface FlowStats {
  totalRequests: number;
  totalSteps: number;
  averageStepsPerRequest: number;
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