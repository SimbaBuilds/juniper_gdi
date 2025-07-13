import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { LogFilterOptions } from '@/lib/types';

interface LogFiltersProps {
  filters: LogFilterOptions;
  onFiltersChange: (filters: LogFilterOptions) => void;
  availableFilters: {
    levels: string[];
    loggers: string[];
    components: string[];
    agents: string[];
  };
}

export function LogFilters({ filters, onFiltersChange, availableFilters }: LogFiltersProps) {
  const updateFilter = (key: keyof LogFilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleArrayFilter = (key: 'levels' | 'loggers' | 'components' | 'agents', value: string) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    onFiltersChange({
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
  };

  const getFilterCount = () => {
    const count = [
      ...filters.levels,
      ...filters.loggers,
      ...filters.components,
      ...filters.agents
    ].length + (filters.searchTerm ? 1 : 0);
    return count;
  };

  return (
    <div className="space-y-4 overflow-hidden">
      {/* Search */}
      <Card className="overflow-x-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter
            {getFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getFilterCount()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Search logs..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="flex-1 min-w-0 max-w-full"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1 shrink-0"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Toggles */}
      <Card className="overflow-x-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Log Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">System Prompts</label>
            <Switch
              checked={filters.showSystemPrompts}
              onCheckedChange={(checked) => updateFilter('showSystemPrompts', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Tool Executions</label>
            <Switch
              checked={filters.showToolExecutions}
              onCheckedChange={(checked) => updateFilter('showToolExecutions', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Resource Operations</label>
            <Switch
              checked={filters.showResourceOperations}
              onCheckedChange={(checked) => updateFilter('showResourceOperations', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Agent Outputs</label>
            <Switch
              checked={filters.showAgentOutputs}
              onCheckedChange={(checked) => updateFilter('showAgentOutputs', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Errors & Warnings</label>
            <Switch
              checked={filters.showErrors}
              onCheckedChange={(checked) => updateFilter('showErrors', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Log Levels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Log Levels</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex flex-wrap gap-2 w-full overflow-x-auto">
            {availableFilters.levels.map(level => (
              <Badge
                key={level}
                variant={filters.levels.includes(level) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleArrayFilter('levels', level)}
              >
                {level}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loggers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Loggers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableFilters.loggers.map(logger => (
              <div key={logger} className="flex items-center justify-between min-w-0 w-full">
                <span className="text-sm truncate mr-2 max-w-[200px]" style={{flex: '1 1 0%'}}>{logger}</span>
                <Switch
                  checked={filters.loggers.includes(logger)}
                  onCheckedChange={() => toggleArrayFilter('loggers', logger)}
                  className="shrink-0 min-w-[44px]"
                  style={{flex: '0 0 auto'}}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      {availableFilters.components.length > 0 && (
        <Card className="overflow-x-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Components</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableFilters.components.map(component => (
                <div key={component} className="flex items-center justify-between min-w-0 w-full">
                  <span className="text-sm truncate mr-2 max-w-[200px]" style={{flex: '1 1 0%'}}>{component}</span>
                  <Switch
                    checked={filters.components.includes(component)}
                    onCheckedChange={() => toggleArrayFilter('components', component)}
                    className="shrink-0 min-w-[44px]"
                    style={{flex: '0 0 auto'}}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents */}
      {availableFilters.agents.length > 0 && (
        <Card className="overflow-x-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Agents</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableFilters.agents.map(agent => (
                <div key={agent} className="flex items-center justify-between min-w-0 w-full">
                  <span className="text-sm truncate mr-2 max-w-[200px]" style={{flex: '1 1 0%'}}>{agent}</span>
                  <Switch
                    checked={filters.agents.includes(agent)}
                    onCheckedChange={() => toggleArrayFilter('agents', agent)}
                    className="shrink-0 min-w-[44px]"
                    style={{flex: '0 0 auto'}}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}