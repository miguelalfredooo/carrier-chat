-- Chat Conversations Table
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text default 'New Conversation',
  mode text default 'conversational',
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat Messages Table
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references chat_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb,
  sequence integer default 1,
  created_at timestamptz default now()
);

-- Indexes for performance
create index on chat_messages(conversation_id);
create index on chat_messages(sequence);

-- RLS (Row Level Security)
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;

create policy "allow_all" on chat_conversations for all using (true);
create policy "allow_all" on chat_messages for all using (true);
