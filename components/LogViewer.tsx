'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, BarChart3, Settings, GitBranch, Moon, Sun } from 'lucide-react';
import { LogEntry } from '@/components/LogEntry';
import { LogFilters } from '@/components/LogFilters';
import { LogStats } from '@/components/LogStats';
import { AgentFlowViewer } from '@/components/AgentFlowViewer';
import { useLogParser } from '@/hooks/useLogParser';
import { useLogFilter } from '@/hooks/useLogFilter';
import { useLogStats } from '@/hooks/useLogStats';
import { useAgentFlowParser } from '@/hooks/useAgentFlowParser';
import { useDarkMode } from '@/hooks/useDarkMode';
import { LogFilterOptions } from '@/lib/types';

export function LogViewer() {
  const [logData, setLogData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState('logs');
  const [mainTab, setMainTab] = useState('logs');
  const [availableLogFiles, setAvailableLogFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const { isDark, toggleDarkMode } = useDarkMode();
  
  const [filters, setFilters] = useState<LogFilterOptions>({
    levels: [],
    loggers: [],
    components: [],
    agents: [],
    timeRange: {},
    searchTerm: '',
    showSystemPrompts: true,
    showToolExecutions: true,
    showResourceOperations: true,
    showAgentOutputs: true,
    showErrors: true
  });

  const { entries, isLoading, error } = useLogParser(logData);
  const { filteredEntries, availableFilters } = useLogFilter(entries, filters);
  const stats = useLogStats(filteredEntries);
  const { conversations } = useAgentFlowParser(logData);

  const loadAvailableLogFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        setAvailableLogFiles(data.files);
        // Load the first available log file
        loadLogFile(data.files[0]);
      } else {
        console.warn('No log files found in logs directory');
        setAvailableLogFiles([]);
      }
    } catch (error) {
      console.error('Failed to load available log files:', error);
      setAvailableLogFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  // Load available log files and first log on component mount
  useEffect(() => {
    loadAvailableLogFiles();
  }, [loadAvailableLogFiles]);

  const loadLogFile = async (filename: string) => {
    try {
      const response = await fetch(`/api/logs?filename=${encodeURIComponent(filename)}`);
      const data = await response.json();
      
      if (data.content) {
        setLogData(data.content);
        setFileName(filename);
      } else {
        console.error('Failed to load log file:', data.error);
      }
    } catch (error) {
      console.error('Failed to load log file:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setLogData(content);
        setFileName(file.name);
      };
      reader.readAsText(file);
    }
  };

  const refreshLogFiles = async () => {
    await loadAvailableLogFiles();
  };

  if (isLoading || loadingFiles) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (availableLogFiles.length === 0 && !logData) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Log Viewer GDI</h1>
            <p className="text-muted-foreground">Intuitive viewing of structured JSON logs</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleDarkMode}
            className="h-9 w-9 p-0"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Load Log File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-lg text-muted-foreground mb-4">No log files found in the logs directory</div>
              <div className="text-sm text-muted-foreground mb-4">
                Please add .log files to the <code className="bg-muted px-2 py-1 rounded">logs/</code> directory or upload a file
              </div>
              <input
                type="file"
                accept=".log,.txt,.json"
                onChange={handleFileUpload}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Juniper GDI</h1>
          <p className="text-muted-foreground">Intuitive viewing of structured JSON logs</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleDarkMode}
          className="h-9 w-9 p-0"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* File Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Load Log File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="file"
              accept=".log,.txt,.json"
              onChange={handleFileUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {availableLogFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Available logs:</span>
                {availableLogFiles.map(file => (
                  <Button
                    key={file}
                    onClick={() => loadLogFile(file)}
                    variant={fileName === file ? "default" : "outline"}
                    size="sm"
                  >
                    {file}
                  </Button>
                ))}
              </div>
            )}
            
            <Button onClick={refreshLogFiles} variant="outline" size="sm" disabled={loadingFiles}>
              {loadingFiles ? 'Loading...' : 'Refresh'}
            </Button>
            
            {fileName && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Currently viewing: {fileName}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {logData && (
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Raw Log View
            </TabsTrigger>
            <TabsTrigger value="flow" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Agent Flow
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
              {/* Sidebar */}
              <div className="lg:col-span-1 min-w-0 w-full max-w-full overflow-hidden">
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full min-w-0 max-w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="filters" className="flex items-center gap-1 text-xs">
                      <Settings className="w-4 h-4" />
                      Filters
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-1 text-xs">
                      <BarChart3 className="w-4 h-4" />
                      Stats
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="filters" className="mt-4 min-w-0 max-w-full overflow-hidden">
                    <ScrollArea className="h-[calc(100vh-250px)] w-full">
                      <div className="min-w-0 max-w-full overflow-hidden">
                        <LogFilters
                          filters={filters}
                          onFiltersChange={setFilters}
                          availableFilters={availableFilters}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="stats" className="mt-4 min-w-0 max-w-full overflow-hidden">
                    <ScrollArea className="h-[calc(100vh-250px)] w-full">
                      <div className="min-w-0 max-w-full overflow-hidden">
                        <LogStats stats={stats} entries={filteredEntries} />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2 min-w-0 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Log Entries</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {filteredEntries.length} of {entries.length} entries
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-250px)]">
                      <div className="space-y-2">
                        {filteredEntries.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No log entries match the current filters.
                          </div>
                        ) : (
                          filteredEntries.map((entry, index) => (
                            <LogEntry key={index} entry={entry} />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="flow">
            <AgentFlowViewer conversations={conversations} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}