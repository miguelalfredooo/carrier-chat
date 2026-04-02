'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/chat-types';
import { stripBucketBlock } from '@/lib/bucket-parser';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState } from './EmptyState';
import { InsightCard } from './InsightCard';
import { SuggestionChips } from './SuggestionChips';
import { ThinkingIndicator } from './ThinkingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSendSuggestion?: (suggestion: string) => void;
  isRetrying?: boolean;
  hasConversation?: boolean;
}

/**
 * SUGGESTION DELIMITER
 * The AI appends suggestions at the end of its response using this format:
 *
 *   ---suggestions
 *   - How does this compare to Q3?
 *   - What segments are most affected?
 *
 * This function splits the content into visible text and suggestion strings.
 * Parsing happens at render time — no impact on streaming state.
 */
const SUGGESTION_DELIMITER = '\n---suggestions\n';

function parseSuggestions(content: string): { visibleContent: string; suggestions: string[] } {
  // Strip bucket data first (consumed by ChatInterface via bucket-parser)
  const withoutBuckets = stripBucketBlock(content);

  const delimiterIndex = withoutBuckets.indexOf(SUGGESTION_DELIMITER);

  if (delimiterIndex === -1) {
    return { visibleContent: withoutBuckets, suggestions: [] };
  }

  const visibleContent = withoutBuckets.slice(0, delimiterIndex).trimEnd();
  const suggestionsBlock = withoutBuckets.slice(delimiterIndex + SUGGESTION_DELIMITER.length);

  const suggestions = suggestionsBlock
    .split('\n')
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter((line) => line.length > 0);

  return { visibleContent, suggestions };
}

export function MessageList({
  messages,
  isLoading,
  error,
  onRetry,
  onSendSuggestion,
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
      className="flex flex-col flex-1 overflow-y-auto p-6 gap-6"
    >
      {messages.length === 0 && !isLoading && (
        <EmptyState type={hasConversation ? 'no-messages' : 'no-conversation'} />
      )}

      {/* RENDERING RULES — DO NOT CHANGE WITHOUT TESTING STREAMING
          - All messages render through ReactMarkdown with remarkGfm
          - DOM structure is stable: no switching between render paths
          - Changing this causes layout shift or raw markdown symbols — test before touching
          - Suggestion parsing is read-only at render time — no state mutations
          - InsightCard is a pure component override for blockquote — no side effects
      */}
      {messages.map((message, messageIndex) => {
        const isUserMessage = message.role === 'user';
        const isLastAssistantMessage =
          !isUserMessage &&
          messageIndex === messages.length - 1;

        // Parse suggestions from assistant messages (render-time only)
        const { visibleContent, suggestions } = isUserMessage
          ? { visibleContent: message.content, suggestions: [] }
          : parseSuggestions(message.content);

        // Only show suggestion chips on the last assistant message when not loading
        const showChips = isLastAssistantMessage && !isLoading && suggestions.length > 0;

        return (
          <div key={message.id} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={isUserMessage ? 'max-w-md' : 'max-w-2xl'}>
              {isUserMessage ? (
                <div>
                  <div className="bg-black text-white rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  {message.metadata?.attachment_name && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        📎 {message.metadata.attachment_name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="bg-white text-black rounded-2xl px-4 py-2 text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="m-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        li: ({ children }) => <li className="m-0">{children}</li>,
                        ul: ({ children }) => <ul className="list-disc pl-5 m-0">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 m-0">{children}</ol>,
                        blockquote: ({ children }) => <InsightCard>{children}</InsightCard>,
                      } as Record<string, React.ComponentType<any>>}
                    >
                      {visibleContent}
                    </ReactMarkdown>
                  </div>

                  {/* Suggestion chips — only on last assistant message, after streaming completes */}
                  {showChips && onSendSuggestion && (
                    <SuggestionChips
                      suggestions={suggestions}
                      onSelect={onSendSuggestion}
                      disabled={isLoading}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Thinking indicator — shows while agent is processing */}
      {isLoading && <ThinkingIndicator />}

      {error && onRetry && (
        <ErrorMessage message={error} onRetry={onRetry} isRetrying={isRetrying} />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
