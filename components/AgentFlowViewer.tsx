import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, MessageSquare, Filter } from 'lucide-react';
import { AgentFlowStep } from '@/components/AgentFlowStep';
import { AgentConversation, FlowViewOptions } from '@/lib/types';

interface AgentFlowViewerProps {
  conversations: AgentConversation[];
}

export function AgentFlowViewer({ conversations }: AgentFlowViewerProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null
  );
  
  // Auto-select first conversation when conversations change
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);
  
  const [flowOptions, setFlowOptions] = useState<FlowViewOptions>({
    showInitialRequests: true,
    showSystemPrompts: true,
    showToolExecutions: true,
    showResourceRetrievals: true,
    showAgentResponses: true,
    showErrors: true
  });

  const updateFlowOption = (key: keyof FlowViewOptions, value: boolean) => {
    setFlowOptions(prev => ({ ...prev, [key]: value }));
  };

  const getFilteredSteps = (conversation: AgentConversation) => {
    return conversation.steps.filter(step => {
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
    });
  };

  const getFlowStats = () => {
    const totalSteps = conversations.reduce((sum, conv) => 
      sum + conv.steps.filter(step => !step.title.endsWith(' Action Progress')).length, 0
    );
    const totalErrors = conversations.reduce((sum, conv) => sum + conv.summary.errors, 0);
    const allAgents = new Set(conversations.flatMap(conv => conv.summary.agents_involved));
    const allTools = new Set(conversations.flatMap(conv => conv.summary.tools_used));
    
    return {
      totalConversations: conversations.length,
      totalSteps,
      totalErrors,
      errorRate: totalSteps > 0 ? (totalErrors / totalSteps) * 100 : 0,
      uniqueAgents: allAgents.size,
      uniqueTools: allTools.size,
      avgStepsPerConv: conversations.length > 0 ? Math.round(totalSteps / conversations.length) : 0
    };
  };

  const stats = getFlowStats();
  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const filteredSteps = selectedConv ? getFilteredSteps(selectedConv) : [];

  if (conversations.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <p>No agent conversations found in the log data.</p>
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
              <div className="text-2xl font-bold text-blue-600">{stats.totalConversations}</div>
              <div className="text-xs text-muted-foreground">Conversations</div>
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

      {/* Conversations and Filters - moved to top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Tabs defaultValue="conversations" className="w-full min-w-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations" className="text-xs">
              <MessageSquare className="w-4 h-4 mr-1" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="filters" className="text-xs">
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2" style={{minWidth: '280px'}}>
                    {conversations.map(conv => (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors min-w-0 ${
                          selectedConversation === conv.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                            : 'border-border hover:border-border/80'
                        }`}
                        onClick={() => setSelectedConversation(conv.id)}
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
          </TabsContent>
          
          <TabsContent value="filters" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Flow Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="space-y-4" style={{minWidth: '280px'}}>
                    <div className="flex items-center justify-between min-w-0 w-full">
                      <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Initial Requests</label>
                      <Switch
                        checked={flowOptions.showInitialRequests}
                        onCheckedChange={(checked) => updateFlowOption('showInitialRequests', checked)}
                        className="shrink-0 min-w-[44px]"
                        style={{flex: '0 0 auto'}}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between min-w-0 w-full">
                      <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>System Prompts</label>
                      <Switch
                        checked={flowOptions.showSystemPrompts}
                        onCheckedChange={(checked) => updateFlowOption('showSystemPrompts', checked)}
                        className="shrink-0 min-w-[44px]"
                        style={{flex: '0 0 auto'}}
                      />
                    </div>
                
                <div className="flex items-center justify-between min-w-0 w-full">
                  <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Tool Executions</label>
                  <Switch
                    checked={flowOptions.showToolExecutions}
                    onCheckedChange={(checked) => updateFlowOption('showToolExecutions', checked)}
                    className="shrink-0 min-w-[44px]"
                    style={{flex: '0 0 auto'}}
                  />
                </div>
                
                <div className="flex items-center justify-between min-w-0 w-full">
                  <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Resource Retrievals</label>
                  <Switch
                    checked={flowOptions.showResourceRetrievals}
                    onCheckedChange={(checked) => updateFlowOption('showResourceRetrievals', checked)}
                    className="shrink-0 min-w-[44px]"
                    style={{flex: '0 0 auto'}}
                  />
                </div>
                
                <div className="flex items-center justify-between min-w-0 w-full">
                  <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Agent Responses</label>
                  <Switch
                    checked={flowOptions.showAgentResponses}
                    onCheckedChange={(checked) => updateFlowOption('showAgentResponses', checked)}
                    className="shrink-0 min-w-[44px]"
                    style={{flex: '0 0 auto'}}
                  />
                </div>
                
                <div className="flex items-center justify-between min-w-0 w-full">
                  <label className="text-sm font-medium truncate mr-2 max-w-[150px]" style={{flex: '1 1 0%'}}>Errors</label>
                  <Switch
                    checked={flowOptions.showErrors}
                    onCheckedChange={(checked) => updateFlowOption('showErrors', checked)}
                    className="shrink-0 min-w-[44px]"
                    style={{flex: '0 0 auto'}}
                  />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Quick actions or additional info can go here */}
        <div className="flex flex-col justify-center">
          {selectedConv && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Request</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {filteredSteps.filter(step => !step.title.endsWith(' Action Progress')).length} of {selectedConv.steps.filter(step => !step.title.endsWith(' Action Progress')).length} steps shown
                    </Badge>
                    <Badge variant="outline">
                      {selectedConv.summary.agents_involved.length} agents
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Request ID: {selectedConv.request_id || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Started: {new Date(selectedConv.start_time).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
                        // Calculate step number excluding action progress steps
                        const stepNumber = filteredSteps.slice(0, index + 1).filter(s => !s.title.endsWith(' Action Progress')).length;
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
                    Select a conversation to view its flow.
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