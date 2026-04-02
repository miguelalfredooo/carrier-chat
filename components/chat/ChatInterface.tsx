'use client';

import { useState, useEffect } from 'react';
import { Archive, ArchiveX, Download } from 'lucide-react';
import { ChatConversation, ChatMessage, CrewResponse, ConversationMode } from '@/lib/chat-types';
import { authenticatedFetch } from '@/lib/auth-utils';
import { ConversationSidebar } from './ConversationSidebar';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatInterfaceProps {
  conversationId?: string | null;
}

export function ChatInterface({ conversationId = null }: ChatInterfaceProps) {
  // Sidebar and conversation state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);

  // Message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Loading and status state
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'running' | 'complete' | 'blocked'>('complete');
  const [phase, setPhase] = useState<string>('');
  const [blockedAt, setBlockedAt] = useState<'pm' | 'research' | 'designer' | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastMessageContent, setLastMessageContent] = useState<string>('');


  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    console.log('currentConversationId changed:', currentConversationId);
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Fetch conversations from API
  const loadConversations = async () => {
    try {
      const response = await authenticatedFetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Loaded conversations:', data.conversations);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  };

  // Fetch messages for a conversation
  const loadMessages = async (convId: string) => {
    try {
      const response = await authenticatedFetch(`/api/chat/messages?conversation_id=${convId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // Create a new conversation
  const createConversation = async (title: string, mode: ConversationMode = 'conversational') => {
    try {
      const response = await authenticatedFetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mode }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }
      const newConversation = await response.json();
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Send a message and trigger crew
  const sendMessage = async (content: string, attachment?: { name: string; type: string; data: string }) => {
    if (!content.trim()) {
      return;
    }

    // Fix 2: Set loading immediately before any async work
    setIsLoading(true);
    setStatus('running');
    setError(null);
    setBlockedAt(undefined);

    let convId = currentConversationId;

    // Auto-create conversation if none exists
    if (!convId) {
      try {
        const response = await authenticatedFetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Conversation ${new Date().toLocaleDateString()}`, mode: 'conversational' }),
        });

        if (!response.ok) {
          throw new Error('Failed to create conversation');
        }

        const newConversation = await response.json();
        convId = newConversation.id;
        setConversations((prev) => [newConversation, ...prev]);
        handleSelectConversation(newConversation.id);
      } catch (error) {
        console.error('Error auto-creating conversation:', error);
        setError('Failed to create conversation. Please try again.');
        setIsLoading(false);
        return;
      }
    }

    // Save content for potential retry
    setLastMessageContent(content);

    // Fix 1 & 3: Add user message and empty assistant placeholder to state
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      sequence: messages.length,
      metadata: attachment ? { attachment_name: attachment.name } : undefined,
    };

    // Empty assistant message that will be streamed to
    const assistantMessage: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: convId,
      role: 'research',
      content: '',
      created_at: new Date().toISOString(),
      sequence: messages.length + 1,
      metadata: {
        confidence: 'n/a',
      },
    };

    // Add both messages immediately - user stays visible, assistant waits for stream
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      // POST message to API with streaming
      const response = await authenticatedFetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          role: 'user',
          content,
          attachment,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      // Fix 3: Stream response into the assistant message bubble
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              if (dataStr === '[DONE]') {
                // Stream complete
                break;
              }

              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  const chunk = data.delta.text;
                  // Append each chunk to assistant message in real-time
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: msg.content + chunk }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // JSON parse error, skip
              }
            }
          }
        }

        setStatus('complete');
        setBlockedAt(undefined);

        // Wait briefly for DB persistence before triggering loadMessages to avoid race
        setTimeout(() => setCurrentConversationId(convId), 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('blocked');
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry sending the last message
  const handleRetry = async () => {
    if (!lastMessageContent.trim()) {
      return;
    }
    setIsRetrying(true);
    try {
      await sendMessage(lastMessageContent);
    } finally {
      setIsRetrying(false);
    }
  };


  // Handle conversation selection
  const handleSelectConversation = (convId: string) => {
    console.log('Selected conversation:', convId);
    setCurrentConversationId(convId);
  };

  // Handle archive conversation (toggle from header)
  const handleArchiveConversation = async (convId: string) => {
    try {
      const isCurrentlyArchived = currentConversation?.archived || false;
      const response = await authenticatedFetch(`/api/chat/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !isCurrentlyArchived }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`);
      }
      const updatedConversation = await response.json();

      // Update conversations list
      setConversations((prev) =>
        prev.map((conv) => (conv.id === convId ? updatedConversation : conv))
      );

      // If archiving current conversation, switch to next active one
      if (!isCurrentlyArchived && currentConversationId === convId) {
        const nextActive = conversations.find((c) => !c.archived && c.id !== convId);
        if (nextActive) {
          setCurrentConversationId(nextActive.id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  // Handle unarchive conversation
  const handleUnarchiveConversation = async (convId: string) => {
    try {
      const response = await authenticatedFetch(`/api/chat/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      if (!response.ok) {
        throw new Error(`Failed to unarchive conversation: ${response.statusText}`);
      }
      const updatedConversation = await response.json();

      // Update conversations list
      setConversations((prev) =>
        prev.map((conv) => (conv.id === convId ? updatedConversation : conv))
      );
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
    }
  };

  // Handle export conversation
  const handleExportConversation = async (convId: string) => {
    try {
      const response = await authenticatedFetch(
        `/api/chat/conversations/${convId}/export?format=md`
      );

      if (!response.ok) {
        throw new Error(`Failed to export conversation: ${response.statusText}`);
      }

      const markdown = await response.text();

      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentConversation?.title || 'conversation'}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting conversation:', error);
    }
  };

  // Get current conversation
  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedId={currentConversationId}
        onSelect={handleSelectConversation}
        onArchive={handleArchiveConversation}
        onUnarchive={handleUnarchiveConversation}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Header with Archive and Export Buttons */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <div>
            {currentConversation && (
              <h1 className="text-lg font-semibold text-gray-900">
                {currentConversation.title}
              </h1>
            )}
          </div>
          {currentConversation && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportConversation(currentConversation.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Export conversation as markdown"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => handleArchiveConversation(currentConversation.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title={currentConversation.archived ? 'Unarchive conversation' : 'Archive conversation'}
              >
                {currentConversation.archived ? (
                  <>
                    <ArchiveX className="w-4 h-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Archive
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          status={status}
          phase={phase}
          blockedAt={blockedAt}
          error={error}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          hasConversation={!!currentConversationId}
        />

        {/* Chat Input */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>

    </div>
  );
}
