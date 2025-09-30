import { useState, useEffect } from 'react';
import { ConversationMessage, Conversation } from '@/lib/types';

export function useConversationParser(logData: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logData) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse JSON array
      const messages = JSON.parse(logData) as ConversationMessage[];

      // Group messages by conversation_id
      const conversationMap = new Map<string, ConversationMessage[]>();

      messages.forEach(message => {
        if (!conversationMap.has(message.conversation_id)) {
          conversationMap.set(message.conversation_id, []);
        }
        conversationMap.get(message.conversation_id)!.push(message);
      });

      // Convert to Conversation objects
      const parsedConversations: Conversation[] = [];

      conversationMap.forEach((messages, conversationId) => {
        // Sort messages by created_at (chronological order)
        const sortedMessages = messages.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Get user_id from first message (they should all have the same user_id)
        const userId = sortedMessages[0]?.user_id || 'unknown';

        // Get time range
        const startTime = sortedMessages[0]?.created_at || '';
        const endTime = sortedMessages[sortedMessages.length - 1]?.created_at || '';

        parsedConversations.push({
          id: conversationId,
          messages: sortedMessages,
          user_id: userId,
          start_time: startTime,
          end_time: endTime,
          message_count: sortedMessages.length
        });
      });

      // Sort conversations by start_time (most recent first)
      parsedConversations.sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );

      setConversations(parsedConversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse conversation data');
    } finally {
      setIsLoading(false);
    }
  }, [logData]);

  return {
    conversations,
    isLoading,
    error
  };
}
