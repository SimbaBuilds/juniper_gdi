import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, MessageSquare, Filter } from 'lucide-react';
import { AgentFlowStep } from '@/agent_flow_viewer/AgentFlowStep';
import { AgentRequest, FlowViewOptions } from '@/lib/types';

interface AgentFlowViewerProps {
  requests: AgentRequest[];
}

export function AgentFlowViewer({ requests }: AgentFlowViewerProps) {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  
  // Auto-select first request when requests change or component mounts
  useEffect(() => {
    if (requests.length > 0) {
      setSelectedRequest(requests[0].id);
    } else {
      setSelectedRequest(null);
    }
  }, [requests]);
  
  const [flowOptions, setFlowOptions] = useState<FlowViewOptions>({
    showInitialRequests: true,
    showSystemPrompts: true,
    showToolExecutions: true,
    showResourceRetrievals: true,
    showAgentResponses: true,
    showErrors: true,
    selectedAgents: [] // Initialize empty array for agent filtering
  });

  const updateFlowOption = (key: keyof FlowViewOptions, value: boolean | string[]) => {
    setFlowOptions(prev => ({ ...prev, [key]: value }));
  };

  // Get unique agent names from the selected request
  const getUniqueAgentsForRequest = (request: AgentRequest | undefined): string[] => {
    if (!request) return [];
    
    const agentNames = new Set<string>();
    
    // Extract agent names from all steps in the request
    request.steps.forEach(step => {
      if (step.agent_name && step.agent_name.trim()) {
        agentNames.add(step.agent_name.trim());
      }
    });
    
    // Also include agents from the summary if available
    request.summary.agents_involved.forEach(agent => {
      if (agent && agent.trim()) {
        agentNames.add(agent.trim());
      }
    });
    
    return Array.from(agentNames).sort();
  };

  // Reset selected agents when request changes
  useEffect(() => {
    if (selectedRequest) {
      const selectedConv = requests.find(c => c.id === selectedRequest);
      const uniqueAgents = getUniqueAgentsForRequest(selectedConv);
      
      // Reset to show all agents when switching requests
      setFlowOptions(prev => ({ 
        ...prev, 
        selectedAgents: uniqueAgents // Show all agents by default
      }));
    }
  }, [selectedRequest, requests]);

  const getFilteredSteps = (request: AgentRequest) => {
    return request.steps.filter(step => {
      // Step type filtering
      const stepTypeMatch = (() => {
        switch (step.type) {
          case 'initial_request':
            return flowOptions.showInitialRequests;
          case 'system_prompt':
            return flowOptions.showSystemPrompts;
          case 'tool_execution':
            return flowOptions.showToolExecutions;
          case 'resource_retrieval':
            return flowOptions.showResourceRetrievals;
          case 'agent_response':
            return flowOptions.showAgentResponses;
          case 'error':
            return flowOptions.showErrors;
          default:
            return true;
        }
      })();
      
      // Agent name filtering
      const agentMatch = flowOptions.selectedAgents.length === 0 || 
                        (step.agent_name && flowOptions.selectedAgents.includes(step.agent_name));
      
      return stepTypeMatch && agentMatch;
    });
  };

  const getFlowStats = () => {
    const totalSteps = requests.reduce((sum, conv) => 
      sum + conv.steps.filter(step => !step.title.endsWith(' Action Progress') && step.type !== 'resource_retrieval').length, 0
    );
    const totalErrors = requests.reduce((sum, conv) => sum + conv.summary.errors, 0);
    const allAgents = new Set(requests.flatMap(conv => conv.summary.agents_involved));
    const allTools = new Set(requests.flatMap(conv => conv.summary.tools_used));
    
    return {
      totalRequests: requests.length,
      totalSteps,
      totalErrors,
      errorRate: totalSteps > 0 ? (totalErrors / totalSteps) * 100 : 0,
      uniqueAgents: allAgents.size,
      uniqueTools: allTools.size,
      avgStepsPerConv: requests.length > 0 ? Math.round(totalSteps / requests.length) : 0
    };
  };

  const stats = getFlowStats();
  const selectedConv = requests.find(c => c.id === selectedRequest);
  const filteredSteps = selectedConv ? getFilteredSteps(selectedConv) : [];

  if (requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <p>No agent requests found in the log data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)]">
      {/* Stats Overview - moved to top */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[640px]">
          <Card className="overflow-x-auto">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRequests}</div>
              <div className="text-xs text-muted-foreground">Requests</div>
            </CardContent>
          </Card>
          <Card className="overflow-x-auto">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalSteps}</div>
              <div className="text-xs text-muted-foreground">Total Steps</div>
            </CardContent>
          </Card>
          <Card className="overflow-x-auto">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.uniqueAgents}</div>
              <div className="text-xs text-muted-foreground">Agents</div>
            </CardContent>
          </Card>
          <Card className="overflow-x-auto">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Requests and Filters - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2" style={{minWidth: '280px'}}>
                {requests.map(conv => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors min-w-0 ${
                      selectedRequest === conv.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-border hover:border-border/80'
                    }`}
                    onClick={() => setSelectedRequest(conv.id)}
                  >
                    <div className="flex items-center justify-between mb-2 min-w-0 gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {conv.summary.total_steps} steps
                      </Badge>
                      {conv.summary.errors > 0 && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          {conv.summary.errors} errors
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm min-w-0">
                      <div className="font-medium truncate max-w-[220px]">
                        {conv.request_id || conv.id}
                      </div>
                      <div className="text-muted-foreground text-xs mt-1 truncate max-w-[220px]">
                        {new Date(conv.start_time).toLocaleString()}
                      </div>
                      {/* Display initial request message if available */}
                      {(() => {
                        const initialRequest = conv.steps.find(step => step.type === 'initial_request');
                        if (initialRequest?.content) {
                          return (
                            <div className="text-muted-foreground text-xs mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Request:</div>
                              <div className="truncate max-w-[500px]">{initialRequest.content}</div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2 min-w-0 overflow-hidden">
                      {conv.summary.agents_involved.slice(0, 2).map(agent => (
                        <Badge key={agent} variant="secondary" className="text-xs truncate max-w-[80px]">
                          {agent}
                        </Badge>
                      ))}
                      {conv.summary.agents_involved.length > 2 && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          +{conv.summary.agents_involved.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
        
        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Flow Filters
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    updateFlowOption('showInitialRequests', true);
                    updateFlowOption('showSystemPrompts', true);
                    updateFlowOption('showToolExecutions', true);
                    updateFlowOption('showResourceRetrievals', true);
                    updateFlowOption('showAgentResponses', true);
                    updateFlowOption('showErrors', true);
                  }}
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    updateFlowOption('showInitialRequests', false);
                    updateFlowOption('showSystemPrompts', false);
                    updateFlowOption('showToolExecutions', false);
                    updateFlowOption('showResourceRetrievals', false);
                    updateFlowOption('showAgentResponses', false);
                    updateFlowOption('showErrors', false);
                  }}
                >
                  None
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="space-y-4" style={{minWidth: '280px'}}>
                <div className="flex items-center justify-between min-w-0 w-full">
                  <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Initial Request</label>
                  <Switch
                    checked={flowOptions.showInitialRequests}
                    onCheckedChange={(checked) => updateFlowOption('showInitialRequests', checked)}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex items-center justify-between min-w-0 w-full">
                  <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>System Prompts</label>
                  <Switch
                    checked={flowOptions.showSystemPrompts}
                    onCheckedChange={(checked) => updateFlowOption('showSystemPrompts', checked)}
                    className="shrink-0"
                  />
                </div>
            
            <div className="flex items-center justify-between min-w-0 w-full">
              <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Tool Executions</label>
              <Switch
                checked={flowOptions.showToolExecutions}
                onCheckedChange={(checked) => updateFlowOption('showToolExecutions', checked)}
                className="shrink-0"
              />
            </div>
            
            <div className="flex items-center justify-between min-w-0 w-full">
              <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Resource Retrievals</label>
              <Switch
                checked={flowOptions.showResourceRetrievals}
                onCheckedChange={(checked) => updateFlowOption('showResourceRetrievals', checked)}
                className="shrink-0"
              />
            </div>
            
            <div className="flex items-center justify-between min-w-0 w-full">
              <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Agent Responses</label>
              <Switch
                checked={flowOptions.showAgentResponses}
                onCheckedChange={(checked) => updateFlowOption('showAgentResponses', checked)}
                className="shrink-0"
              />
            </div>
            
            <div className="flex items-center justify-between min-w-0 w-full">
              <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Errors</label>
              <Switch
                checked={flowOptions.showErrors}
                onCheckedChange={(checked) => updateFlowOption('showErrors', checked)}
                className="shrink-0"
              />
            </div>
            
            {/* Agent Filters Section */}
            {selectedConv && (() => {
              const uniqueAgents = getUniqueAgentsForRequest(selectedConv);
              if (uniqueAgents.length > 1) {
                return (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter by Agent</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => updateFlowOption('selectedAgents', uniqueAgents)}
                          >
                            All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => updateFlowOption('selectedAgents', [])}
                          >
                            None
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {uniqueAgents.map(agentName => (
                          <div key={agentName} className="flex items-center justify-between min-w-0 w-full">
                            <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>
                              {agentName}
                            </label>
                            <Switch
                              checked={flowOptions.selectedAgents.includes(agentName)}
                              onCheckedChange={(checked) => {
                                const currentAgents = flowOptions.selectedAgents;
                                if (checked) {
                                  updateFlowOption('selectedAgents', [...currentAgents, agentName]);
                                } else {
                                  updateFlowOption('selectedAgents', currentAgents.filter(a => a !== agentName));
                                }
                              }}
                              className="shrink-0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              }
              return null;
            })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Flow View - now takes up full horizontal space */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Card className="flex flex-col flex-1 h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agent Flow</span>
              {selectedConv && (
                <div className="text-sm text-muted-foreground">
                  {selectedConv.request_id || selectedConv.id}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 h-0 p-0">
            <ScrollArea className="h-full w-full">
              <div className="px-6 pt-6">
                {selectedConv ? (
                  <div className="space-y-4 pb-6 w-max">
                    {filteredSteps.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No steps match the current filters.
                      </div>
                    ) : (
                      filteredSteps.map((step, index) => {
                        // Calculate step number excluding action progress steps and resource retrievals
                        const stepNumber = filteredSteps.slice(0, index + 1).filter(s => 
                          !s.title.endsWith(' Action Progress') && s.type !== 'resource_retrieval'
                        ).length;
                        return (
                          <AgentFlowStep
                            key={step.id}
                            step={step}
                            stepNumber={stepNumber}
                          />
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a request to view its flow.
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}