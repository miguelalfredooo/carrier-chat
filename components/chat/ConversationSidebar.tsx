'use client';

import { useState } from 'react';
import { MessageSquare, Archive } from 'lucide-react';

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
    <div className="flex flex-col h-full w-64 border-r border-gray-200 bg-white">
      {/* Search */}
      <div className="flex-shrink-0 p-4 border-t border-b border-gray-200">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex gap-1 p-4 bg-gray-50">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'active'
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active {activeConversations.length > 0 && `(${activeConversations.length})`}
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'archived'
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Archived {archivedConversations.length > 0 && `(${archivedConversations.length})`}
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">
              {activeTab === 'active'
                ? 'No active conversations yet'
                : 'No archived conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  console.log('Sidebar click on conversation:', conversation.id);
                  onSelect(conversation.id);
                }}
                className={`flex items-start justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === conversation.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {conversation.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(conversation.updated_at)}
                    </div>
                  </div>
                </div>
                {activeTab === 'active' && onArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(conversation.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded ml-2 flex-shrink-0"
                    title="Archive conversation"
                  >
                    <Archive className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
                {activeTab === 'archived' && onUnarchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnarchive(conversation.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded ml-2 flex-shrink-0"
                    title="Unarchive conversation"
                  >
                    <Archive className="w-4 h-4 text-gray-400 hover:text-gray-600" />
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
