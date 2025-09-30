Right now, this interface supports JSON arrays and NDJSON with different routing and logic.  Within the JSON array route, I want to support a "conversation" viewer that can support logs with a conversation_id param.  See example. Since this is not an agent fow, we shouldn't use the agent flow viewer. We'll need a separate interface that just shows user messages and assistant responses.  Please ask me some design questions and clarifying questions.


1. created at please
2. yes yes and yes former
3. user id, metadata, conversation id, role, content, created_at
4. We need to handle everything here so please examine how the application handles JSON arrays and NDJSON and make sure routing for the conversation viewer is correct (will be JSON array like the example file).  Idf there are multipl ein the uploaded json, they should all load and I should be able to click between conversaitons
5. Yes, latter
6. gracefully