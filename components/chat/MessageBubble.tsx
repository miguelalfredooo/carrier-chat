'use client';

import { designTokens as tokens } from '@/lib/design-tokens';

interface MessageBubbleProps {
  role: 'user' | 'agent';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className="whitespace-pre-wrap break-words"
      style={{
        backgroundColor: isUser ? tokens.colors.black : tokens.colors.white,
        color: isUser ? tokens.colors.white : tokens.colors.black,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        fontSize: '14px',
        lineHeight: '1.6',
        maxWidth: '100%',
      }}
      data-component="MessageBubble"
      data-role={role}
    >
      {content}
    </div>
  );
}
