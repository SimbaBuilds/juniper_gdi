report-hmr-latency.ts:26 [Fast Refresh] done in NaNms
useAgentFlowParser.ts:190 Found observation message: Adding observation to messages: Observation: {"status": "success", "message": "Found 2 matching resources", "results": [{"id": "ba8e317f-dbf1-4dc8-831d-5c3eb51cefce", "title": "Fav News Sources", "content": "My fav News sources for finance are @amitisinvesting and unusual whales on X and Fox Business YouTube channel", "type": "memory", "instructions": "Use this information when the user asks about finance/economics related news", "relevance_score": 94, "similarity_score": 0.483, "final_score": 0.671, "last_accessed": "2025-06-01T19:31:02.372+00:00", "created_at": "2025-06-01T19:31:02.373+00:00"}, {"id": "5e912670-5b44-4fe0-be22-e0d7e38e4683", "title": "User's Media Consumption and Views", "content": "The user is frequently active in the Twitter/X space and is skeptical of mainstream media, believing that mainstream media is mostly bought by special interests.", "type": "memory", "instructions": "Use this information when discussing news sources, media recommendations, or understanding the user's perspective on information sources.", "relevance_score": 94, "similarity_score": 0.405, "final_score": 0.593, "last_accessed": "2025-07-13T19:47:29.330926+00:00", "created_at": "2025-07-13T19:47:29.33093+00:00"}]}
useAgentFlowParser.ts:196 JSON positions: {jsonStart: 45, jsonEnd: 1223}
useAgentFlowParser.ts:201 Extracted JSON string: {"status": "success", "message": "Found 2 matching resources", "results": [{"id": "ba8e317f-dbf1-4dc8-831d-5c3eb51cefce", "title": "Fav News Sources", "content": "My fav News sources for finance are @amitisinvesting and unusual whales on X and Fox Business YouTube channel", "type": "memory", "instructions": "Use this information when the user asks about finance/economics related news", "relevance_score": 94, "similarity_score": 0.483, "final_score": 0.671, "last_accessed": "2025-06-01T19:31:02.372+00:00", "created_at": "2025-06-01T19:31:02.373+00:00"}, {"id": "5e912670-5b44-4fe0-be22-e0d7e38e4683", "title": "User's Media Consumption and Views", "content": "The user is frequently active in the Twitter/X space and is skeptical of mainstream media, believing that mainstream media is mostly bought by special interests.", "type": "memory", "instructions": "Use this information when discussing news sources, media recommendations, or understanding the user's perspective on information sources.", "relevance_score": 94, "similarity_score": 0.405, "final_score": 0.593, "last_accessed": "2025-07-13T19:47:29.330926+00:00", "created_at": "2025-07-13T19:47:29.33093+00:00"}]}
useAgentFlowParser.ts:204 Parsed observation data: {status: 'success', message: 'Found 2 matching resources', results: Array(2)}
useAgentFlowParser.ts:237 Returning parsed step: {id: 'step_36', type: 'agent_response', timestamp: '2025-07-15T07:59:52.467877+00:00', agent_name: 'base_agent', title: 'base_agent Observation', …}
useAgentFlowParser.ts:190 Found observation message: Adding observation to messages: Observation: I found information about the user's favorite news sources:

**Finance/Economics News Sources:**
- @amitisinvesting on X (Twitter)
- Unusual Whales on X (Twitter)
- Fox Business YouTube channel

**Media Consumption Preferences:**
- The user is frequently active in the Twitter/X space
- They are skeptical of mainstream media, believing that mainstream media is mostly bought by special interests

The user appears to prefer alternative and social media sources, particularly on X/Twitter, especially for financial news and information. They tend to avoid mainstream media due to concerns about special interest influence.
useAgentFlowParser.ts:196 JSON positions: {jsonStart: -1, jsonEnd: -1}
useAgentFlowParser.ts:244 No valid JSON found in message