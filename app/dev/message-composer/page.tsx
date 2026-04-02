'use client';

import { useState } from 'react';
import { MessageComposer } from '@/components/chat/MessageComposer';

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
        <MessageComposer onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
