'use client';

import { useState, useEffect, useMemo } from 'react';
import { Archive, ArchiveX, Download } from 'lucide-react';
import { ChatConversation, ChatMessage, CrewResponse, ConversationMode } from '@/lib/chat-types';
import { authenticatedFetch } from '@/lib/auth-utils';
import { buildBucketsFromMessages } from '@/lib/bucket-parser';
import { ConversationSidebar } from './ConversationSidebar';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { ProjectBuckets } from './ProjectBuckets';
import { useRef } from 'react';

interface ChatInterfaceProps {
  conversationId?: string | null;
}

export function ChatInterface({ conversationId = null }: ChatInterfaceProps) {
  // Sidebar and conversation state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const justAutoCreatedRef = useRef<string | null>(null);

  // Message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Loading and status state
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'running' | 'complete'>('complete');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastMessageContent, setLastMessageContent] = useState<string>('');
  const [depth, setDepth] = useState<'quick' | 'balanced' | 'in-depth'>('balanced');


  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  // CRITICAL GUARD: The !isLoading check prevents the chat flicker bug (April 2026)
  // When auto-creating a conversation, currentConversationId changes and triggers this effect.
  // If we don't guard with !isLoading, loadMessages fetches from DB while sendMessage is
  // adding optimistic messages — the race clears optimistic state and causes flicker.
  // See docs/CHAT_FLICKER_FIX.md and lib/CHAT_PATTERNS.md for details.
  useEffect(() => {
    if (currentConversationId && !isLoading) {
      // Skip loadMessages if we just auto-created this conversation
      // (messages are already correct in state from optimistic + streaming)
      if (justAutoCreatedRef.current !== currentConversationId) {
        loadMessages(currentConversationId);
      } else {
        justAutoCreatedRef.current = null;
      }
    } else if (!currentConversationId) {
      setMessages([]);
    }
  }, [currentConversationId, isLoading]);

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
      // Mark this conversation as just-created so we don't reload from DB yet
      // (messages are already correct in local state from optimistic + streaming)
      justAutoCreatedRef.current = newConversation.id;
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

    // Fix 1 & 3: Add user message and three empty agent placeholders to state
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversation_id: convId as string,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      sequence: messages.length,
      metadata: attachment ? { attachment_name: attachment.name } : undefined,
    };

    // Single assistant message that will be streamed to
    const assistantMessage: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: convId as string,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      sequence: messages.length + 1,
    };

    // Add user and assistant messages - assistant content will be streamed in
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      // Track the assistant message ID for streaming
      let activeMessageId: string = assistantMessage.id;

      // POST message to API with streaming
      const response = await authenticatedFetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          role: 'user',
          content,
          attachment,
          depth,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      // Fix 3: Stream response into agent message bubbles
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

                // Handle content chunks
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  const chunk = data.delta.text;
                  // Append each chunk to the assistant message in real-time
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === activeMessageId
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

        // Set complete status
        setStatus('complete');

        // CRITICAL: Do NOT call loadMessages() or setCurrentConversationId() here
        // The messages are already correct in local state from optimistic update + streaming.
        // Reloading from DB causes the entire message list to re-render, creating a visible
        // flicker/disappear-reappear flash. DB persistence happens in background via the
        // API endpoint — no need to synchronize. Local state IS the source of truth.
        // See lib/CHAT_PATTERNS.md and docs/CHAT_FLICKER_FIX.md for details.
      }
    } catch (error) {
      console.error('Error sending message:', error);
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

  // Compute project buckets from all messages (pure, no side effects)
  const buckets = useMemo(() => buildBucketsFromMessages(messages), [messages]);

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-950 via-blue-700 to-pink-600">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedId={currentConversationId}
        onSelect={handleSelectConversation}
        onArchive={handleArchiveConversation}
        onUnarchive={handleUnarchiveConversation}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 p-4 pb-0">
        {/* Chat Container */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <MessageList
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            onSendSuggestion={(suggestion) => sendMessage(suggestion)}
            isRetrying={isRetrying}
            hasConversation={!!currentConversationId}
          />

          {/* Project Buckets — above input, accumulates as conversation progresses */}
          <ProjectBuckets
            buckets={buckets}
            onDiveIn={(prompt) => sendMessage(prompt)}
            disabled={isLoading}
          />

          {/* Chat Input */}
          <div className="flex-shrink-0 w-full flex justify-center px-4 pb-4">
            <div style={{ width: '100%', maxWidth: '600px' }}>
              <MessageComposer
                onSend={sendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
