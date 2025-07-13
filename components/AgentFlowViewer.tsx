import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  
  const [flowOptions, setFlowOptions] = useState<FlowViewOptions>({
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
    const totalSteps = conversations.reduce((sum, conv) => sum + conv.steps.length, 0);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full w-full">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4 h-full min-w-0 w-full overflow-hidden">
          {/* Stats Overview - moved here */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
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
                  <CardTitle className="text-lg">Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <ScrollArea className="h-[400px]">
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
        </div>

        {/* Main Flow View - now takes up all remaining columns and height */}
        <div className="lg:col-span-2 h-full flex flex-col min-w-0 w-full">
          <Card className="flex flex-col flex-1 h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Agent Flow</span>
                {selectedConv && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {filteredSteps.length} of {selectedConv.steps.length} steps
                    </Badge>
                    <Badge variant="outline">
                      {selectedConv.summary.agents_involved.length} agents
                    </Badge>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 h-0 p-0">
              <ScrollArea className="h-full">
                <div className="overflow-x-auto px-6 pt-6">
                  {selectedConv ? (
                    <div className="space-y-4 pb-6" style={{minWidth: '600px'}}>
                      {filteredSteps.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No steps match the current filters.
                        </div>
                      ) : (
                        filteredSteps.map((step, index) => (
                          <AgentFlowStep
                            key={step.id}
                            step={step}
                            stepNumber={index + 1}
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Select a conversation to view its flow.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}