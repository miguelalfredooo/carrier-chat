import { supabase } from '@/lib/supabase-client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatMessage } from '@/lib/chat-types';
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { getPmPrompt, getResearchPrompt, getDesignerPrompt, Depth } from '@/lib/agent-prompts';

// Allow larger request bodies for image attachments (base64 encoded)
export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const CREW_SERVICE_URL = 'http://localhost:8000';
const CREW_TIMEOUT_MS = 15000; // 15 second timeout
const MAX_CONTENT_LENGTH = 10000; // 10KB limit

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { conversation_id, content, attachment, depth = 'balanced' } = await request.json();

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: 'Missing conversation_id or content' },
        { status: 400 }
      );
    }

    if (!['quick', 'balanced', 'in-depth'].includes(depth)) {
      return NextResponse.json(
        { error: 'Invalid depth level' },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate attachment if present
    if (attachment) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(attachment.type)) {
        return NextResponse.json(
          { error: 'Invalid attachment type. Supported: JPEG, PNG, GIF, WebP' },
          { status: 400 }
        );
      }
      if (!attachment.data || !attachment.name) {
        return NextResponse.json(
          { error: 'Attachment missing data or name' },
          { status: 400 }
        );
      }
    }

    // Verify conversation exists (user_id check removed for dev mode)
    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('id, mode')
      .eq('id', conversation_id)
      .single();

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get sequence number for this message
    const { data: lastMsg } = await supabase
      .from('chat_messages')
      .select('sequence')
      .eq('conversation_id', conversation_id)
      .order('sequence', { ascending: false })
      .limit(1)
      .single();

    const sequence = (lastMsg?.sequence || 0) + 1;

    // Fetch last 10 messages for conversation history
    const { data: historyMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('sequence', { ascending: true })
      .limit(10);

    // Format history for Anthropic API (map pm/research/designer roles to 'assistant')
    const apiMessages: MessageParam[] = [];
    if (historyMessages && historyMessages.length > 0) {
      for (const msg of historyMessages) {
        const role = ['pm', 'research', 'designer'].includes(msg.role) ? 'assistant' : (msg.role as 'user' | 'assistant');
        apiMessages.push({
          role,
          content: msg.content,
        });
      }
    }

    // Add current user message with attachment if present
    if (attachment) {
      // Build content array with image block first, then text
      const messageContent: Anthropic.ContentBlockParam[] = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: attachment.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: attachment.data,
          },
        },
        {
          type: 'text',
          text: content,
        },
      ];
      apiMessages.push({
        role: 'user',
        content: messageContent,
      });
    } else {
      // Simple text message
      apiMessages.push({
        role: 'user',
        content,
      });
    }

    const modelProvider = process.env.MODEL_PROVIDER || 'anthropic';
    const encoder = new TextEncoder();

    if (modelProvider === 'ollama') {
      return streamOllamaHandoff(apiMessages, conversation_id, content, sequence, attachment, encoder, depth as Depth);
    }

    // Run three-agent handoff pipeline with Anthropic
    return streamHandoffPipeline(apiMessages, conversation_id, content, sequence, attachment, encoder, depth as Depth);
  } catch (error) {
    console.error('POST /api/chat/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Three-agent handoff pipeline with Anthropic
async function streamHandoffPipeline(
  baseMessages: MessageParam[],
  conversationId: string,
  userContent: string,
  sequence: number,
  attachment: { name: string; type: string; data: string } | undefined,
  encoder: TextEncoder,
  depth: Depth
) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let pmOutput = '';
        let researchOutput = '';
        let designerOutput = '';
        let blockedAt: 'pm' | 'research' | 'designer' | undefined;

        // PM Agent
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_start', agent: 'pm' })}\n\n`));

        const pmStream = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: getPmPrompt(depth),
          messages: baseMessages,
        });

        for await (const event of pmStream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const text = event.delta.text || '';
            pmOutput += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text }, agent: 'pm' })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_complete', agent: 'pm' })}\n\n`));

        // Check PM gate
        if (pmOutput.includes('BLOCKED:')) {
          const reason = pmOutput.match(/BLOCKED:\s*(.+?)(?:\n|$)/)?.[1] || 'Gate check failed';
          blockedAt = 'pm';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'agent_blocked', agent: 'pm', reason })}\n\n`)
          );
        } else {
          // Research Agent
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_start', agent: 'research' })}\n\n`));

          const researchMessages = [
            ...baseMessages,
            { role: 'user' as const, content: userContent },
            { role: 'assistant' as const, content: pmOutput },
          ];

          const researchStream = await client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1200,
            system: getResearchPrompt(pmOutput, depth),
            messages: researchMessages,
          });

          for await (const event of researchStream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const text = event.delta.text || '';
              researchOutput += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text }, agent: 'research' })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_complete', agent: 'research' })}\n\n`));

          // Check Research gate
          if (researchOutput.includes('BLOCKED:')) {
            const reason = researchOutput.match(/BLOCKED:\s*(.+?)(?:\n|$)/)?.[1] || 'Gate check failed';
            blockedAt = 'research';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'agent_blocked', agent: 'research', reason })}\n\n`)
            );
          } else {
            // Designer Agent
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_start', agent: 'designer' })}\n\n`));

            const designerMessages = [
              ...baseMessages,
              { role: 'user' as const, content: userContent },
              { role: 'assistant' as const, content: pmOutput },
              { role: 'user' as const, content: 'Continue with research analysis' },
              { role: 'assistant' as const, content: researchOutput },
            ];

            const designerStream = await client.messages.stream({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1500,
              system: getDesignerPrompt(pmOutput, researchOutput, depth),
              messages: designerMessages,
            });

            for await (const event of designerStream) {
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text || '';
                designerOutput += text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text }, agent: 'designer' })}\n\n`)
                );
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_complete', agent: 'designer' })}\n\n`));

            // Check Designer gate
            if (designerOutput.includes('BLOCKED:')) {
              const reason = designerOutput.match(/BLOCKED:\s*(.+?)(?:\n|$)/)?.[1] || 'Gate check failed';
              blockedAt = 'designer';
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'agent_blocked', agent: 'designer', reason })}\n\n`)
              );
            }
          }
        }

        // Persist all messages
        await persistAllMessages(
          conversationId,
          userContent,
          pmOutput,
          researchOutput,
          designerOutput,
          sequence,
          attachment,
          blockedAt,
          depth
        );

        // Send completion signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Handoff pipeline error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Three-agent handoff pipeline with Ollama
async function streamOllamaHandoff(
  baseMessages: MessageParam[],
  conversationId: string,
  userContent: string,
  sequence: number,
  attachment: { name: string; type: string; data: string } | undefined,
  encoder: TextEncoder,
  depth: Depth
) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  const convertToOllamaMessages = (messages: MessageParam[]) => {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content.map(block => {
        if (typeof block === 'object' && 'text' in block) {
          return (block as { text: string }).text;
        }
        return '';
      }).join('\n'),
    }));
  };

  const streamOllamaAgent = async (
    systemPrompt: string,
    messages: MessageParam[]
  ): Promise<string> => {
    const ollamaMessages = convertToOllamaMessages(messages);
    let output = '';

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...ollamaMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from Ollama API');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const chunk = JSON.parse(line);
          if (chunk.message?.content) {
            output += chunk.message.content;
          }
        } catch (e) {
          console.error('Error parsing Ollama chunk:', e);
        }
      }
    }

    return output;
  };

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let pmOutput = '';
        let researchOutput = '';
        let designerOutput = '';
        let blockedAt: 'pm' | 'research' | 'designer' | undefined;

        // PM Agent
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_start', agent: 'pm' })}\n\n`));
        pmOutput = await streamOllamaAgent(getPmPrompt(depth), baseMessages);
        pmOutput.split('').forEach(char => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: char }, agent: 'pm' })}\n\n`)
          );
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_complete', agent: 'pm' })}\n\n`));

        if (pmOutput.includes('BLOCKED:')) {
          const reason = pmOutput.match(/BLOCKED:\s*(.+?)(?:\n|$)/)?.[1] || 'Gate check failed';
          blockedAt = 'pm';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'agent_blocked', agent: 'pm', reason })}\n\n`)
          );
        } else {
          // Research Agent
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_start', agent: 'research' })}\n\n`));
          const researchMessages = [
            ...baseMessages,
            { role: 'user' as const, content: userContent },
            { role: 'assistant' as const, content: pmOutput },
          ];
          researchOutput = await streamOllamaAgent(getResearchPrompt(pmOutput, depth), researchMessages);
          researchOutput.split('').forEach(char => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: char }, agent: 'research' })}\n\n`)
            );
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_complete', agent: 'research' })}\n\n`));

          if (researchOutput.includes('BLOCKED:')) {
            const reason = researchOutput.match(/BLOCKED:\s*(.+?)(?:\n|$)/)?.[1] || 'Gate check failed';
            blockedAt = 'research';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'agent_blocked', agent: 'research', reason })}\n\n`)
            );
          } else {
            // Designer Agent
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_start', agent: 'designer' })}\n\n`));
            const designerMessages = [
              ...baseMessages,
              { role: 'user' as const, content: userContent },
              { role: 'assistant' as const, content: pmOutput },
              { role: 'user' as const, content: 'Continue with research analysis' },
              { role: 'assistant' as const, content: researchOutput },
            ];
            designerOutput = await streamOllamaAgent(getDesignerPrompt(pmOutput, researchOutput, depth), designerMessages);
            designerOutput.split('').forEach(char => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: char }, agent: 'designer' })}\n\n`)
              );
            });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_complete', agent: 'designer' })}\n\n`));

            if (designerOutput.includes('BLOCKED:')) {
              const reason = designerOutput.match(/BLOCKED:\s*(.+?)(?:\n|$)/)?.[1] || 'Gate check failed';
              blockedAt = 'designer';
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'agent_blocked', agent: 'designer', reason })}\n\n`)
              );
            }
          }
        }

        // Persist all messages
        await persistAllMessages(
          conversationId,
          userContent,
          pmOutput,
          researchOutput,
          designerOutput,
          sequence,
          attachment,
          blockedAt,
          depth
        );

        // Send completion signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Ollama handoff pipeline error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Helper function to persist all messages (user + 3 agents) to database
async function persistAllMessages(
  conversationId: string,
  userContent: string,
  pmContent: string,
  researchContent: string,
  designerContent: string,
  sequence: number,
  attachment?: { name: string; type: string; data: string },
  blockedAt?: 'pm' | 'research' | 'designer',
  depth: Depth = 'balanced'
) {
  try {
    const messagesToInsert = [];

    // User message
    const userMetadata = attachment ? { attachment_name: attachment.name } : undefined;
    messagesToInsert.push({
      conversation_id: conversationId,
      role: 'user',
      content: userContent,
      sequence,
      metadata: userMetadata,
    });

    // PM message
    if (pmContent) {
      messagesToInsert.push({
        conversation_id: conversationId,
        role: 'pm',
        content: pmContent,
        sequence: sequence + 1,
        metadata: { depth, blocked: blockedAt === 'pm' },
      });
    }

    // Research message (only if not blocked at PM)
    if (researchContent && blockedAt !== 'pm') {
      messagesToInsert.push({
        conversation_id: conversationId,
        role: 'research',
        content: researchContent,
        sequence: sequence + 2,
        metadata: { depth, blocked: blockedAt === 'research' },
      });
    }

    // Designer message (only if not blocked at PM or Research)
    if (designerContent && !['pm', 'research'].includes(blockedAt || '')) {
      messagesToInsert.push({
        conversation_id: conversationId,
        role: 'designer',
        content: designerContent,
        sequence: sequence + 3,
        metadata: { depth },
      });
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert(messagesToInsert);

    if (error) throw error;
  } catch (error) {
    console.error('Error persisting messages:', error);
  }
}

export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation_id' },
        { status: 400 }
      );
    }

    // Verify user owns this conversation
    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get all messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (messagesError) throw messagesError;

    // Get all crew runs with feedback for this conversation
    const { data: crewRuns, error: crewRunsError } = await supabase
      .from('chat_crew_runs')
      .select('agent_feedback')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (crewRunsError) throw crewRunsError;

    // Flatten feedback from all crew runs
    const feedback = crewRuns?.flatMap(run => run.agent_feedback || []) || [];

    // Get feedback actions to filter out dismissed items
    const { data: feedbackActions, error: actionsError } = await supabase
      .from('chat_feedback_actions')
      .select('feedback_id, action')
      .eq('conversation_id', conversationId);

    if (actionsError) throw actionsError;

    // Build a map of feedback_id -> action for quick lookup
    const actionMap = new Map((feedbackActions || []).map(a => [a.feedback_id, a.action]));

    // Filter feedback to exclude dismissed items
    const visibleFeedback = feedback.filter(f => actionMap.get(f.id) !== 'dismiss');

    return NextResponse.json({
      messages: messages || [],
      feedback: visibleFeedback,
      conversation: conv,
    });
  } catch (error) {
    console.error('GET /api/chat/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
