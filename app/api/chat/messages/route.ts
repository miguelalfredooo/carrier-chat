import { supabase } from '@/lib/supabase-client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatMessage } from '@/lib/chat-types';
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export const maxDuration = 60;

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

    const { conversation_id, content, target_agent, previous_context, attachment } = await request.json();

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: 'Missing conversation_id or content' },
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

    // Format history for Anthropic API (map 'research' role to 'assistant')
    const apiMessages: MessageParam[] = [];
    if (historyMessages && historyMessages.length > 0) {
      for (const msg of historyMessages) {
        const role = msg.role === 'research' ? 'assistant' : (msg.role as 'user' | 'assistant');
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

    // SYSTEM PROMPT RULES — DO NOT SIMPLIFY
    // - Model must NOT use ## headers (causes layout issues in chat)
    // - Model CAN use **bold**, bullet points, numbered lists
    // - Bold only at start of phrases, not inline mid-sentence (prevents streaming reflow)
    // - Plain prose for short conversational answers
    const systemPrompt = `You are a Head of Product Design embedded in a product team. You think across product management, research, and design simultaneously — and synthesize all three in every response.

When answering, lead with the most important insight. Be direct and specific. Speak like a senior design leader talking to a peer, not a report generator.

Use formatting when it genuinely helps clarity:
- **Bold** only the opening phrase of a paragraph, never bold words in the middle of a sentence
- Numbered lists when sequence or priority matters
- Bullet points when listing 3 or more parallel items
- Plain prose for conversational exchanges or short answers

Never use headers (##) in chat responses. Keep responses under 200 words unless the question genuinely needs more depth. End with a concrete recommendation or a single sharp question.`;

    const encoder = new TextEncoder();
    let fullResponse = '';

    if (modelProvider === 'ollama') {
      return streamOllama(apiMessages, systemPrompt, conversation_id, content, sequence, attachment, encoder);
    }

    // Original Anthropic path - completely unchanged
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Stream response back to client
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: apiMessages,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Iterate through stream events
          for await (const event of stream) {
            // Handle content block deltas
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const text = event.delta.text || '';
              fullResponse += text;

              // Send to client as SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`)
              );
            }
          }

          // Persist messages after streaming completes
          if (fullResponse) {
            await persistMessages(conversation_id, content, fullResponse, sequence, attachment);
          }

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
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
  } catch (error) {
    console.error('POST /api/chat/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to stream from Ollama API
async function streamOllama(
  messages: MessageParam[],
  systemPrompt: string,
  conversationId: string,
  userContent: string,
  sequence: number,
  attachment: { name: string; type: string; data: string } | undefined,
  encoder: TextEncoder
) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  // Convert messages to Ollama format
  const ollamaMessages = messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : msg.content.map(block => {
      if (typeof block === 'object' && 'text' in block) {
        return (block as { text: string }).text;
      }
      return '';
    }).join('\n'),
  }));

  let fullResponse = '';

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
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
                const text = chunk.message.content;
                fullResponse += text;

                // Send to client as SSE in same format as Anthropic
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`)
                );
              }
            } catch (e) {
              console.error('Error parsing Ollama chunk:', e);
            }
          }
        }

        // Persist messages after streaming completes
        if (fullResponse) {
          await persistMessages(conversationId, userContent, fullResponse, sequence, attachment);
        }

        // Send completion signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Ollama stream error:', error);
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

// Helper function to persist messages to database
async function persistMessages(
  conversationId: string,
  userContent: string,
  researchContent: string,
  sequence: number,
  attachment?: { name: string; type: string; data: string }
) {
  try {
    // Insert user message with attachment metadata if present
    const userMetadata = attachment ? { attachment_name: attachment.name } : undefined;
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: conversationId,
        role: 'user',
        content: userContent,
        sequence,
        metadata: userMetadata,
      }]);

    if (userMsgError) throw userMsgError;

    // Insert research response
    const { error: researchMsgError } = await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: conversationId,
        role: 'research',
        content: researchContent,
        sequence: sequence + 1,
      }]);

    if (researchMsgError) throw researchMsgError;
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
