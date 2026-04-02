import { ChatInterface } from '@/components/chat/ChatInterface';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carrier Chat',
  description: 'AI-powered design research chat',
};

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <ChatInterface conversationId={null} />
    </div>
  );
}
