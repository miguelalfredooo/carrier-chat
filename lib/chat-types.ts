export type ConversationMode = 'pipeline' | 'conversational';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  mode: ConversationMode;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
  sequence: number;
}


// ── Project Buckets ──
// AI-generated knowledge containers that accumulate across a conversation.
// Each assistant message can add insights to existing buckets or create new ones.

export interface BucketInsight {
  text: string;
  messageId: string; // which message produced this insight
}

export interface ProjectBucket {
  id: string;          // stable slug, e.g. "user-research"
  label: string;       // display name, e.g. "User Research"
  insights: BucketInsight[];
}

// Raw shape the AI emits per message (JSON after ---buckets delimiter)
export interface BucketUpdate {
  id: string;
  label: string;
  insight: string;
}

