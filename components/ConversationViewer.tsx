'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Bot } from 'lucide-react';
import { Conversation } from '@/lib/types';

interface ConversationViewerProps {
  conversations: Conversation[];
}

export function ConversationViewer({ conversations }: ConversationViewerProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Auto-select first conversation when conversations change
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (conversations.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <p>No conversations found in the data.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Sidebar - Conversation List */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Conversations ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2">
                {conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedConversationId === conversation.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-border/80'
                    }`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {conversation.message_count} messages
                      </Badge>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium text-xs text-muted-foreground mb-1">
                        ID: {conversation.id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        User: {conversation.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(conversation.start_time).toLocaleString()}
                      </div>
                    </div>

                    {/* Preview first user message */}
                    {(() => {
                      const firstUserMessage = conversation.messages.find(m => m.role === 'user');
                      if (firstUserMessage) {
                        return (
                          <div className="mt-2 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <div className="truncate">{firstUserMessage.content}</div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Area - Conversation Messages */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Messages</span>
              {selectedConversation && (
                <div className="text-sm font-normal text-muted-foreground">
                  Conversation: {selectedConversation.id}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-4">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-blue-100 dark:bg-blue-900'
                            : 'bg-green-100 dark:bg-green-900'
                        }`}
                      >
                        {/* Header with role icon and timestamp */}
                        <div className="flex items-center gap-2 mb-2">
                          {message.role === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                          <span className="text-xs font-semibold uppercase">
                            {message.role}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Message content */}
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </div>

                        {/* Metadata section */}
                        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div>
                              <span className="font-semibold">User ID:</span> {message.user_id}
                            </div>
                            <div>
                              <span className="font-semibold">Conversation ID:</span> {message.conversation_id}
                            </div>
                            <div>
                              <span className="font-semibold">Created:</span>{' '}
                              {new Date(message.created_at).toLocaleString()}
                            </div>
                            {message.metadata && message.metadata !== '{}' && (
                              <div>
                                <span className="font-semibold">Metadata:</span>
                                <pre className="mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(JSON.parse(message.metadata), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedConversation.messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No messages in this conversation.
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a conversation to view messages.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
