'use client';

import { useState } from 'react';
import { MessageSquare, Archive, Home, Search, Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConversationMode = 'pipeline' | 'conversational';
type TabType = 'active' | 'archived';

interface Conversation {
  id: string;
  title: string;
  mode: ConversationMode;
  created_at: string;
  updated_at: string;
  archived: boolean;
  user_id: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (checkDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (checkDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    const daysAgo = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${daysAgo} days ago`;
  }
}

export function ConversationSidebar({
  conversations,
  selectedId,
  onSelect,
  onArchive,
  onUnarchive,
  onDelete,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const activeConversations = conversations.filter(
    (conv) => !conv.archived && conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const archivedConversations = conversations.filter(
    (conv) => conv.archived && conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConversations = activeTab === 'active' ? activeConversations : archivedConversations;

  return (
    <div className="flex flex-col h-full w-64 bg-gray-900/30 backdrop-blur-md px-4">
      {/* Logo Header */}
      <div className="flex-shrink-0 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Bird className="w-5 h-5 text-black" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">Carrier</h2>
            <p className="text-xs text-gray-400 truncate">Explore, chat, ship</p>
          </div>
        </div>
      </div>

      {/* Home Button */}
      <div className="flex-shrink-0 py-3">
        <button className="w-full flex items-center gap-2 pr-3 h-8 rounded-lg bg-white/30 text-black text-sm font-medium hover:bg-white/40 transition-colors">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4 text-black" />
          </div>
          Home
        </button>
      </div>

      {/* Conversations Header */}
      <div className="flex-shrink-0 py-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversations</h3>
      </div>

      {/* Search */}
      <div className="hidden flex-shrink-0 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-gray-600"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'white transparent',
        }}
      >
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-xs text-gray-500 text-center">No conversations yet</p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  onSelect(conversation.id);
                }}
                className={`flex items-start justify-between py-3 cursor-pointer hover:bg-gray-800 transition-colors rounded-lg ${
                  selectedId === conversation.id ? 'bg-gray-800' : ''
                }`}
              >
                <div className="min-w-0 flex-1 px-1">
                  <div className="font-medium text-sm text-white truncate">
                    {conversation.title}
                  </div>
                  <div className="hidden text-xs text-gray-400 mt-1">
                    {formatDate(conversation.updated_at)}
                  </div>
                </div>
                {activeTab === 'active' && onArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(conversation.id);
                    }}
                    className="hidden p-1 hover:bg-gray-700 rounded ml-2 flex-shrink-0 transition-colors"
                    title="Archive conversation"
                  >
                    <Archive className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
