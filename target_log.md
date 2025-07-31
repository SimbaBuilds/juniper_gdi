1. Please add parsing logic for the following logs to be added as steps in the agent flow viewer:
2. Please update the step counter logic to only count “Thought” logs towards the total steps calculation that is displayed in the card at the top of the screen, as Thought logs represent actual LLM calls.


```
{"timestamp": "2025-07-31T13:47:42.444335+00:00", "level": "INFO", "logger": "app.agents.integrations.integrations_agent", "message": "Integration in progress. Using model: claude-sonnet-4-20250514 for integrations agent", "module": "integrations_agent", "pathname": "/Users/cameronhightower/Software_Projects/Mobile_Jarvis_Backend/app/agents/integrations/integrations_agent.py", "lineno": 1096, "funcName": "handle_integrations_request", "component": "agent", "agent_name": "Integrations Agent"}
```

```
{"timestamp": "2025-07-30T13:55:11.650890+00:00", "level": "INFO", "logger": "app.agents.base_agent", "message": "Intelligence upgraded to level 2", "module": "component_loggers", "pathname": "/Users/cameronhightower/Software_Projects/Mobile_Jarvis_Backend/app/utils/logging/component_loggers.py", "lineno": 86, "funcName": "log_agent_event", "component": "agent", "action": "intelligence_upgrade", "agent_name": "Integrations Agent"}
```

