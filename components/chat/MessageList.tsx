'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/chat-types';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState } from './EmptyState';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  hasConversation?: boolean;
}

export function MessageList({
  messages,
  isLoading,
  error,
  onRetry,
  isRetrying = false,
  hasConversation = true,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-col flex-1 overflow-y-auto bg-white p-6 gap-6"
    >
      {messages.length === 0 && !isLoading && (
        <EmptyState type={hasConversation ? 'no-messages' : 'no-conversation'} />
      )}

      {/* RENDERING RULES — DO NOT CHANGE WITHOUT TESTING STREAMING
          - All messages render through ReactMarkdown with remarkGfm
          - DOM structure is stable: no switching between render paths
          - Changing this causes layout shift or raw markdown symbols — test before touching
      */}
      {messages.map((message) => {
        const isUserMessage = message.role === 'user';

        return (
          <div key={message.id} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={isUserMessage ? 'max-w-md' : 'max-w-2xl'}>
              {isUserMessage ? (
                <div>
                  <p className="bg-black text-white rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  {message.metadata?.attachment_name && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        📎 {message.metadata.attachment_name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-900 min-h-[1.5rem]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-3">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-3">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3">{children}</ol>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {error && onRetry && (
        <ErrorMessage message={error} onRetry={onRetry} isRetrying={isRetrying} />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
