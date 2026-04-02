export type ConversationMode = 'pipeline' | 'conversational';
export type MessageRole = 'user' | 'pm' | 'research' | 'designer' | 'system';
export type AgentRole = 'pm' | 'research' | 'designer';
export type FeedbackCategory = 'bug' | 'optimization' | 'polish';
export type FeedbackStatus = 'pending' | 'accepted' | 'dismissed' | 'discussed';

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

export interface AgentFeedback {
  id: string;
  agent: AgentRole;
  category: FeedbackCategory;
  observation: string;
  suggestion: string;
  impact: string;
  status: FeedbackStatus;
  created_at: string;
  applies_to_message_id: string;
}

export interface ChatCrewRun {
  id: string;
  conversation_id: string;
  crew_input: Record<string, any>;
  crew_output: Record<string, any>;
  gates_passed: Record<string, boolean>;
  status: 'running' | 'complete' | 'blocked';
  agent_feedback?: AgentFeedback[];
  created_at: string;
}

export interface FeedbackAction {
  id: string;
  conversation_id: string;
  feedback_id: string;
  action: 'accept' | 'discuss' | 'dismiss';
  user_note?: string;
  created_at: string;
}

export interface AgentMessage {
  from: string; // agent name (research_insights, design_strategy, etc.)
  from_name: string; // display name
  to: string; // destination
  subject: string;
  body: string; // main content
  confidence?: string; // high, medium, low
  assumptions?: string;
  next_step?: string;
  priority?: string;
  timestamp: string;
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

export interface CrewResponse {
  pm_response?: string;
  research_response?: string;
  designer_response?: string;
  agent_messages?: AgentMessage[]; // all messages from crew
  gates: {
    pm_gate?: boolean;
    research_gate?: boolean;
    designer_gate?: boolean;
  };
  feedback: AgentFeedback[];
  status: 'complete' | 'blocked';
  blocked_at?: 'pm' | 'research' | 'designer';
}
