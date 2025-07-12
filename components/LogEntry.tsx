import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Clock, User, AlertTriangle, Info, XCircle } from 'lucide-react';
import { LogEntry as LogEntryType } from '@/lib/types';

interface LogEntryProps {
  entry: LogEntryType;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function LogEntry({ entry, isExpanded = false, onToggleExpand }: LogEntryProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggleExpand?.();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DEBUG':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <XCircle className="w-4 h-4" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4" />;
      case 'INFO':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCategories = () => {
    return (entry as any).categories || [];
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      system_prompts: 'bg-purple-100 text-purple-800',
      tool_executions: 'bg-green-100 text-green-800',
      resource_operations: 'bg-orange-100 text-orange-800',
      agent_outputs: 'bg-indigo-100 text-indigo-800',
      errors_warnings: 'bg-red-100 text-red-800'
    };
    return colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="mb-2 transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-6 w-6 p-0"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            
            <Badge className={`flex items-center gap-1 ${getLevelColor(entry.level)}`}>
              {getLevelIcon(entry.level)}
              {entry.level}
            </Badge>
            
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {entry.user_id && (
              <Badge variant="outline" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                {entry.user_id.slice(0, 8)}...
              </Badge>
            )}
            
            {getCategories().map((category: string) => (
              <Badge 
                key={category} 
                variant="secondary" 
                className={`text-xs ${getCategoryColor(category)}`}
              >
                {category.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium">Message:</span>
            <span className="text-sm flex-1">{entry.message}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Logger: {entry.logger}</span>
            <span>Module: {entry.module}</span>
            <span>Function: {entry.funcName}</span>
          </div>
          
          {expanded && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Pathname:</span>
                  <p className="text-muted-foreground break-all">{entry.pathname}</p>
                </div>
                <div>
                  <span className="font-medium">Line:</span>
                  <p className="text-muted-foreground">{entry.lineno}</p>
                </div>
                
                {entry.component && (
                  <div>
                    <span className="font-medium">Component:</span>
                    <p className="text-muted-foreground">{entry.component}</p>
                  </div>
                )}
                
                {entry.action && (
                  <div>
                    <span className="font-medium">Action:</span>
                    <p className="text-muted-foreground">{entry.action}</p>
                  </div>
                )}
                
                {entry.agent_name && (
                  <div>
                    <span className="font-medium">Agent:</span>
                    <p className="text-muted-foreground">{entry.agent_name}</p>
                  </div>
                )}
                
                {entry.request_id && (
                  <div>
                    <span className="font-medium">Request ID:</span>
                    <p className="text-muted-foreground break-all">{entry.request_id}</p>
                  </div>
                )}
              </div>
              
              {entry.exception && (
                <div className="mt-4">
                  <span className="font-medium text-red-600">Exception:</span>
                  <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                    {entry.exception}
                  </pre>
                </div>
              )}
              
              <div className="mt-4">
                <span className="font-medium">Raw JSON:</span>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(entry, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}