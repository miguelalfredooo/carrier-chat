import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatMessage, AgentFeedback } from '@/lib/chat-types';

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
  messages: ChatMessage[],
  feedback: AgentFeedback[],
  gates: Record<string, boolean>
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
      } else if (msg.role === 'pm') {
        markdown += `**🎯 PM:** ${msg.content}\n\n`;
      } else if (msg.role === 'research') {
        markdown += `**🔍 Research:** ${msg.content}\n\n`;
      } else if (msg.role === 'designer') {
        markdown += `**💡 Designer:** ${msg.content}\n\n`;
      }
    }
  }

  // Gates section
  markdown += '### Gates\n\n';
  markdown += `- PM Gate: ${gates.pm_gate ? '✅' : '❌'}\n`;
  markdown += `- Research Gate: ${gates.research_gate ? '✅' : '❌'}\n`;
  markdown += `- Designer Gate: ${gates.designer_gate ? '✅' : '❌'}\n\n`;

  // Feedback section
  markdown += '### Feedback\n\n';

  if (feedback.length === 0) {
    markdown += '(No feedback yet)\n\n';
  } else {
    for (const fb of feedback) {
      markdown += `- ${fb.category} - ${fb.observation}\n`;
      markdown += `  Suggestion: ${fb.suggestion}\n\n`;
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

    // Fetch all crew runs with feedback for this conversation
    const { data: crewRuns, error: crewRunsError } = await supabase
      .from('chat_crew_runs')
      .select('gates_passed, agent_feedback')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false });

    if (crewRunsError) throw crewRunsError;

    // Get the latest gates and flatten feedback from all crew runs
    let gates = { pm_gate: false, research_gate: false, designer_gate: false };
    let feedback: AgentFeedback[] = [];

    if (crewRuns && crewRuns.length > 0) {
      const latestRun = crewRuns[0];
      if (latestRun.gates_passed) {
        gates = latestRun.gates_passed;
      }
      // Flatten feedback from all runs
      feedback = crewRuns.flatMap(run => run.agent_feedback || []);
    }

    // Get feedback actions to filter out dismissed items
    const { data: feedbackActions, error: actionsError } = await supabase
      .from('chat_feedback_actions')
      .select('feedback_id, action')
      .eq('conversation_id', id);

    if (actionsError) throw actionsError;

    // Build a map of feedback_id -> action for quick lookup
    const actionMap = new Map((feedbackActions || []).map(a => [a.feedback_id, a.action]));

    // Filter feedback to exclude dismissed items
    const visibleFeedback = feedback.filter(f => actionMap.get(f.id) !== 'dismiss');

    // Format as markdown
    const markdown = formatConversationAsMarkdown(
      conversation.title,
      conversation.created_at,
      messages || [],
      visibleFeedback,
      gates
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
