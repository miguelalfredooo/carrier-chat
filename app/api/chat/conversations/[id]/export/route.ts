import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatMessage } from '@/lib/chat-types';

import { supabase } from '@/lib/supabase-client';

const _unused = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Format a conversation as markdown
 */
function formatConversationAsMarkdown(
  title: string,
  createdAt: string,
  messages: ChatMessage[]
): string {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# ${title}\nCreated: ${date}\n\n`;

  // Messages section
  markdown += '## Messages\n\n';

  if (messages.length === 0) {
    markdown += '(No messages yet)\n\n';
  } else {
    for (const msg of messages) {
      if (msg.role === 'user') {
        markdown += `**User:** ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        markdown += `**Head of Product Design:** ${msg.content}\n\n`;
      }
    }
  }

  markdown += '---\n';

  return markdown;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'md';

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Fetch all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('sequence', { ascending: true });

    if (messagesError) throw messagesError;

    // Format as markdown
    const markdown = formatConversationAsMarkdown(
      conversation.title,
      conversation.created_at,
      messages || []
    );

    // Return as markdown file
    if (format === 'md') {
      const filename = `${conversation.title}-${new Date(conversation.created_at).toISOString().split('T')[0]}.md`;
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // If PDF format requested, return error (not implemented in Phase 3)
    return NextResponse.json(
      { error: 'PDF export not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('GET /api/chat/conversations/[id]/export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
