# Carrier Chat

AI-powered design research chat. Head of Product Design persona backed by Claude Haiku.

> **Before making changes to core features, read [docs/INDEX.md](docs/INDEX.md)** — find architectural context, bug history, and design patterns in one place.

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your values
2. Run `npm install`
3. Run `npm run dev`

Open http://localhost:3000

## Stack

- **Next.js 16** + TypeScript
- **Supabase** for conversation + message storage
- **Anthropic Claude Haiku** via direct API (streaming)
- **Tailwind CSS** + shadcn/ui components

## Required Supabase Tables

Run these migrations in your Supabase project:

### chat_conversations
```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('pipeline', 'conversational')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  archived BOOLEAN DEFAULT false
);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'pm', 'research', 'designer', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Features

- Stream responses from Claude in real-time
- Attach images (JPEG, PNG, GIF, WebP) to messages
- Archive conversations
- Export conversations as markdown
- Persistent conversation history
