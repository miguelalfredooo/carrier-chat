'use client';

import { MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-conversation' | 'no-messages';
}

export function EmptyState({ type }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
      <div className="mb-4">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto" />
      </div>
      {type === 'no-conversation' ? (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversation selected</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Start a new conversation or select an existing one from the sidebar to begin discussing design ideas with the crew.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Ask anything about your product, users, or design decisions.
          </p>
        </>
      )}
    </div>
  );
}
