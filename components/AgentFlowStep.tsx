import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Clock, User, Bot, Cog, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { AgentStep } from '@/lib/types';

interface AgentFlowStepProps {
  step: AgentStep;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  stepNumber: number;
}

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
    return new Date(timestamp).toLocaleString();
  };

  const formatStepType = (type: AgentStep['type']) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
      
      <Card className="ml-12 mb-4 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Step number circle */}
              <div className="absolute -left-6 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                {stepNumber}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                className="h-6 w-6 p-0"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStepColor(step.type)}`}>
                {getStepIcon(step.type)}
                <span className="text-sm font-medium">{formatStepType(step.type)}</span>
              </div>
              
              {getStatusIcon(step.status)}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(step.timestamp)}
              </span>
              
              {step.agent_name && (
                <Badge variant="outline" className="text-xs">
                  <Bot className="w-3 h-3 mr-1" />
                  {step.agent_name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">{step.title}</h3>
            <p className="text-sm text-gray-700">{step.content}</p>
            
            {expanded && step.details && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {step.details.logger && (
                    <div>
                      <span className="font-medium">Logger:</span>
                      <p className="text-gray-600">{step.details.logger}</p>
                    </div>
                  )}
                  
                  {step.details.module && (
                    <div>
                      <span className="font-medium">Module:</span>
                      <p className="text-gray-600">{step.details.module}</p>
                    </div>
                  )}
                  
                  {step.details.funcName && (
                    <div>
                      <span className="font-medium">Function:</span>
                      <p className="text-gray-600">{step.details.funcName}</p>
                    </div>
                  )}
                  
                  {step.details.component && (
                    <div>
                      <span className="font-medium">Component:</span>
                      <p className="text-gray-600">{step.details.component}</p>
                    </div>
                  )}
                  
                  {step.details.action && (
                    <div>
                      <span className="font-medium">Action:</span>
                      <p className="text-gray-600">{step.details.action}</p>
                    </div>
                  )}
                  
                  {step.request_id && (
                    <div>
                      <span className="font-medium">Request ID:</span>
                      <p className="text-gray-600 break-all">{step.request_id}</p>
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
                    <p className="text-xs text-gray-600 break-all">
                      {step.details.pathname}:{step.details.lineno}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}