import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Clock, Bot, Cog, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { AgentStep } from '@/lib/types';

interface AgentFlowStepProps {
  step: AgentStep;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  stepNumber: number;
}

// System prompt formatter component
const SystemPromptFormatter: React.FC<{ content: string }> = ({ content }) => {
  const formatSystemPrompt = (text: string) => {
    // Split by lines and process each section
    const lines = text.split('\n');
    const sections: React.ReactElement[] = [];
    let currentSection: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';
    
    const finishCurrentSection = () => {
      if (currentSection.length > 0) {
        const sectionText = currentSection.join('\n');
        sections.push(
          <div key={sections.length} className="mb-4">
            {formatTextSection(sectionText)}
          </div>
        );
        currentSection = [];
      }
    };
    
    const finishCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        sections.push(
          <div key={sections.length} className="mb-4">
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto text-sm">
              <code className="text-gray-800 dark:text-gray-200">
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          </div>
        );
        codeBlockContent = [];
      }
    };
    
    for (const line of lines) {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          finishCodeBlock();
          inCodeBlock = false;
          codeBlockLanguage = '';
        } else {
          // Start of code block
          finishCurrentSection();
          inCodeBlock = true;
          codeBlockLanguage = line.trim().slice(3);
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }
      
      // Handle section headers
      if (line.match(/^=== .+ ===$/)) {
        finishCurrentSection();
        const headerText = line.replace(/^=== (.+) ===$/,'$1');
        sections.push(
          <div key={sections.length} className="mb-4">
            <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700 pb-2 mb-3">
              {headerText}
            </h3>
          </div>
        );
        continue;
      }
      
      // Regular content
      currentSection.push(line);
    }
    
    // Finish any remaining content
    finishCurrentSection();
    finishCodeBlock();
    
    return sections;
  };
  
  const formatTextSection = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line.trim()) {
        elements.push(<br key={i} />);
        continue;
      }
      
      // Handle bullet points
      if (line.match(/^- /)) {
        elements.push(
          <div key={i} className="flex items-start gap-2 mb-1">
            <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{line.slice(2)}</span>
          </div>
        );
        continue;
      }
      
      // Handle inline code (backticks)
      if (line.includes('`')) {
        const parts = line.split('`');
        const formatted = parts.map((part, index) => {
          if (index % 2 === 1) {
            // This is inside backticks
            return (
              <code key={index} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-purple-700 dark:text-purple-300">
                {part}
              </code>
            );
          }
          return part;
        });
        elements.push(
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {formatted}
          </p>
        );
        continue;
      }
      
      // Regular text
      elements.push(
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {line}
        </p>
      );
    }
    
    return elements;
  };
  
  return (
    <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border-l-4 border-purple-400">
      <div className="font-medium text-sm text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
        <Cog className="w-4 h-4" />
        System Prompt
      </div>
      <div className="space-y-2">
        {formatSystemPrompt(content)}
      </div>
    </div>
  );
};

export function AgentFlowStep({ step, isExpanded = false, onToggleExpand, stepNumber }: AgentFlowStepProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggleExpand?.();
  };

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'system_prompt':
        return <Cog className="w-5 h-5" />;
      case 'tool_execution':
        return <Database className="w-5 h-5" />;
      case 'resource_retrieval':
        return <Database className="w-5 h-5" />;
      case 'agent_response':
        return <Bot className="w-5 h-5" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getStepColor = (type: AgentStep['type']) => {
    switch (type) {
      case 'system_prompt':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tool_execution':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resource_retrieval':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'agent_response':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'error') {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatStepType = (type: AgentStep['type']) => {
    switch (type) {
      case 'system_prompt':
        return 'System Prompt';
      case 'tool_execution':
        return 'Tool Execution';
      case 'resource_retrieval':
        return 'Resource Retrieval';
      case 'agent_response':
        return 'Agent Response';
      case 'error':
        return 'Error';
      default:
        return 'Step';
    }
  };

  return (
    <div className="relative">
      <Card className={`transition-all duration-200 ${expanded ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step.type)}`}>
                {getStepIcon(step.type)}
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {stepNumber}. {formatStepType(step.type)}
                  </span>
                  {getStatusIcon(step.status)}
                </div>
                
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(step.timestamp)}
                  </span>
                  
                  {step.agent_name && (
                    <Badge variant="outline" className="text-xs truncate max-w-[120px] shrink-0">
                      <Bot className="w-3 h-3 mr-1" />
                      {step.agent_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
                  <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <div className="space-y-3 pr-4" style={{minWidth: '500px'}}>
                <h3 className="font-medium">{step.title}</h3>
            
            {/* Special handling for system prompts */}
            {step.type === 'system_prompt' ? (
              <SystemPromptFormatter content={step.content} />
            ) : (
              <>
                {/* Show structured content if available */}
                {step.extractedContent && (step.extractedContent.thought || step.extractedContent.action || step.extractedContent.response) ? (
                  <div className="space-y-3">
                    {step.extractedContent.thought && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border-l-4 border-blue-400">
                        <div className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-1">🤔 Thought</div>
                        <p className="text-sm text-blue-700 dark:text-blue-200">{step.extractedContent.thought}</p>
                      </div>
                    )}
                    
                    {step.extractedContent.action && (
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border-l-4 border-green-400">
                        <div className="font-medium text-sm text-green-800 dark:text-green-300 mb-1">⚡ Action</div>
                        <p className="text-sm text-green-700 dark:text-green-200">{step.extractedContent.action}</p>
                      </div>
                    )}
                    
                    {step.extractedContent.observation && (
                      <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border-l-4 border-orange-400">
                        <div className="font-medium text-sm text-orange-800 dark:text-orange-300 mb-1">👁️ Observation</div>
                        <p className="text-sm text-orange-700 dark:text-orange-200">{step.extractedContent.observation}</p>
                      </div>
                    )}
                    
                    {step.extractedContent.response && (
                      <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border-l-4 border-purple-400">
                        <div className="font-medium text-sm text-purple-800 dark:text-purple-300 mb-1">💬 Response</div>
                        <p className="text-sm text-purple-700 dark:text-purple-200">{step.extractedContent.response}</p>
                      </div>
                    )}
                    
                    {step.extractedContent.associatedResources && step.extractedContent.associatedResources.length > 0 && (
                      <div className="bg-cyan-50 dark:bg-cyan-950/30 p-3 rounded-lg border-l-4 border-cyan-400">
                        <div className="font-medium text-sm text-cyan-800 dark:text-cyan-300 mb-2">📁 Associated Resources</div>
                        <div className="space-y-2">
                          {step.extractedContent.associatedResources.map((resource, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-xs text-cyan-900 dark:text-cyan-100">{resource.title}</span>
                                {resource.relevance && (
                                  <span className="text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-1 rounded">
                                    {resource.relevance}% relevant
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">{resource.content}</p>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>ID: {resource.id.slice(0, 8)}...</span>
                                {resource.lastAccessed && <span>Last: {resource.lastAccessed}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {step.extractedContent.toolDetails && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border-l-4 border-yellow-400">
                        <div className="font-medium text-sm text-yellow-800 dark:text-yellow-300 mb-2">🔧 Tool Details</div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                          <div className="font-medium text-sm text-yellow-900 dark:text-yellow-100 mb-1">{step.extractedContent.toolDetails.name}</div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">{step.extractedContent.toolDetails.description}</p>
                          {step.extractedContent.toolDetails.parameters && (
                            <div className="mb-2">
                              <span className="font-medium text-xs text-yellow-800 dark:text-yellow-200">Parameters:</span>
                              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(step.extractedContent.toolDetails.parameters, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.extractedContent.toolDetails.example && (
                            <div>
                              <span className="font-medium text-xs text-yellow-800 dark:text-yellow-200">Example:</span>
                              <code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded block mt-1">
                                {step.extractedContent.toolDetails.example}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{step.content}</p>
                )}
              </>
            )}
            
                            {expanded && step.details && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                  {step.details.logger && (
                    <div className="min-w-0">
                      <span className="font-medium">Logger:</span>
                      <p className="text-muted-foreground truncate max-w-[200px]">{step.details.logger}</p>
                    </div>
                  )}
                  
                  {step.details.module && (
                    <div className="min-w-0">
                      <span className="font-medium">Module:</span>
                      <p className="text-muted-foreground truncate max-w-[200px]">{step.details.module}</p>
                    </div>
                  )}
                  
                  {step.details.funcName && (
                    <div className="min-w-0">
                      <span className="font-medium">Function:</span>
                      <p className="text-muted-foreground truncate max-w-[200px]">{step.details.funcName}</p>
                    </div>
                  )}
                  
                  {step.details.component && (
                    <div className="min-w-0">
                      <span className="font-medium">Component:</span>
                      <p className="text-muted-foreground truncate max-w-[200px]">{step.details.component}</p>
                    </div>
                  )}
                  
                  {step.details.action && (
                    <div className="min-w-0">
                      <span className="font-medium">Action:</span>
                      <p className="text-muted-foreground truncate max-w-[200px]">{step.details.action}</p>
                    </div>
                  )}
                  
                  {step.request_id && (
                    <div>
                      <span className="font-medium">Request ID:</span>
                      <p className="text-muted-foreground break-all">{step.request_id}</p>
                    </div>
                  )}
                </div>
                
                {step.details.exception && (
                  <div className="mt-4">
                    <span className="font-medium text-red-600">Exception:</span>
                    <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                      {step.details.exception}
                    </pre>
                  </div>
                )}
                
                {step.details.pathname && (
                  <div className="mt-4">
                    <span className="font-medium">Source:</span>
                    <p className="text-xs text-muted-foreground break-all">
                      {step.details.pathname}:{step.details.lineno}
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}