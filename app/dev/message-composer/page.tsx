'use client';

import { useState } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';

export default function MessageComposerPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
