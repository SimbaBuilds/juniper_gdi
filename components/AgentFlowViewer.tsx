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
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalConversations}</div>
            <div className="text-sm text-muted-foreground">Conversations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalSteps}</div>
            <div className="text-sm text-muted-foreground">Total Steps</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueAgents}</div>
            <div className="text-sm text-muted-foreground">Agents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Tabs defaultValue="conversations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conversations">
                <MessageSquare className="w-4 h-4 mr-1" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="filters">
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
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {conversations.map(conv => (
                        <div
                          key={conv.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedConversation === conv.id 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                              : 'border-border hover:border-border/80'
                          }`}
                          onClick={() => setSelectedConversation(conv.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {conv.summary.total_steps} steps
                            </Badge>
                            {conv.summary.errors > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conv.summary.errors} errors
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <div className="font-medium truncate">
                              {conv.request_id || conv.id}
                            </div>
                            <div className="text-muted-foreground text-xs mt-1">
                              {new Date(conv.start_time).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {conv.summary.agents_involved.slice(0, 2).map(agent => (
                              <Badge key={agent} variant="secondary" className="text-xs">
                                {agent}
                              </Badge>
                            ))}
                            {conv.summary.agents_involved.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{conv.summary.agents_involved.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="filters" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Flow Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">System Prompts</label>
                    <Switch
                      checked={flowOptions.showSystemPrompts}
                      onCheckedChange={(checked) => updateFlowOption('showSystemPrompts', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Tool Executions</label>
                    <Switch
                      checked={flowOptions.showToolExecutions}
                      onCheckedChange={(checked) => updateFlowOption('showToolExecutions', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Resource Retrievals</label>
                    <Switch
                      checked={flowOptions.showResourceRetrievals}
                      onCheckedChange={(checked) => updateFlowOption('showResourceRetrievals', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Agent Responses</label>
                    <Switch
                      checked={flowOptions.showAgentResponses}
                      onCheckedChange={(checked) => updateFlowOption('showAgentResponses', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Errors</label>
                    <Switch
                      checked={flowOptions.showErrors}
                      onCheckedChange={(checked) => updateFlowOption('showErrors', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Flow View */}
        <div className="lg:col-span-3">
          <Card>
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
            <CardContent>
              <ScrollArea className="h-[600px]">
                {selectedConv ? (
                  <div className="space-y-4">
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
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}