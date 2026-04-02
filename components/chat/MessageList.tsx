'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/chat-types';
import { stripBucketBlock } from '@/lib/bucket-parser';
import { designTokens as tokens } from '@/lib/design-tokens';
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
      className="flex flex-col flex-1 overflow-y-auto py-6 gap-6 mx-auto w-full"
      style={{ maxWidth: '600px' }}
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
            <div>
              {isUserMessage ? (
                <div>
                  <div
                    className="whitespace-pre-wrap break-words"
                    style={{
                      backgroundColor: tokens.colors.black,
                      color: tokens.colors.white,
                      padding: tokens.spacing.md,
                      borderRadius: tokens.radius.lg,
                      fontSize: '14px',
                      lineHeight: '1.5',
                    }}
                    data-component="MessageBubble"
                    data-role="user"
                  >
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
                  <div
                    style={{
                      backgroundColor: tokens.colors.white,
                      color: tokens.colors.black,
                      padding: tokens.spacing.md,
                      borderRadius: tokens.radius.lg,
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}
                    data-component="MessageBubble"
                    data-role="agent"
                  >
                    {isLoading && !isUserMessage && !visibleContent ? (
                      <ThinkingIndicator />
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p style={{ margin: 0, marginBottom: '8px' }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ fontWeight: '600' }}>{children}</strong>,
                          li: ({ children }) => <li style={{ margin: 0 }}>{children}</li>,
                          ul: ({ children }) => <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0 }}>{children}</ol>,
                          blockquote: ({ children }) => <InsightCard>{children}</InsightCard>,
                        } as Record<string, React.ComponentType<any>>}
                      >
                        {visibleContent}
                      </ReactMarkdown>
                    )}
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

      {error && onRetry && (
        <ErrorMessage message={error} onRetry={onRetry} isRetrying={isRetrying} />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
