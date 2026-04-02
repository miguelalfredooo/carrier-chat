'use client';

import { useState } from 'react';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { designTokens as tokens } from '@/lib/design-tokens';

export default function ComposerSandboxPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [messages, setMessages] = useState<string[]>([]);

  const handleSend = (message: string, attachment?: { name: string; type: string; data: string }) => {
    setLastMessage(message);
    setMessages((prev) => [...prev, `${message}${attachment ? ` (📎 ${attachment.name})` : ''}`]);

    // Simulate loading
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const toggleLoading = () => {
    setIsLoading(!isLoading);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: tokens.colors.gray[900],
        color: tokens.colors.white,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: tokens.spacing.lg,
          borderBottom: `1px solid ${tokens.colors.gray[700]}`,
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: tokens.spacing.md }}>
          MessageComposer Sandbox
        </h1>
        <p style={{ color: tokens.colors.gray[400], marginBottom: tokens.spacing.md }}>
          Perfect the component design and layout in isolation before integrating into main app
        </p>

        {/* Controls */}
        <div
          className="flex gap-4"
          style={{
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={toggleLoading}
            style={{
              padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
              backgroundColor: isLoading ? tokens.colors.red[600] : tokens.colors.blue[600],
              color: tokens.colors.white,
              border: 'none',
              borderRadius: tokens.radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isLoading ? tokens.colors.red[700] : tokens.colors.blue[700];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isLoading ? tokens.colors.red[600] : tokens.colors.blue[600];
            }}
          >
            {isLoading ? 'Stop Loading' : 'Simulate Loading'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8">
        {/* Left: Component Preview */}
        <div className="flex-1">
          <div style={{ marginBottom: tokens.spacing.md }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.gray[300] }}>
              Component Preview
            </h2>
          </div>

          {/* Component Container with background */}
          <div
            className="rounded-lg p-8"
            style={{
              backgroundColor: tokens.colors.gray[800],
              border: `2px dashed ${tokens.colors.gray[600]}`,
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                maxWidth: '600px',
                margin: '0 auto',
                width: '100%',
              }}
            >
              <MessageComposer
                onSend={handleSend}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Right: Debug Info & Message Log */}
        <div
          style={{
            marginTop: tokens.spacing.lg,
            padding: tokens.spacing.md,
            backgroundColor: tokens.colors.gray[800],
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.gray[700]}`,
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.gray[300], marginBottom: tokens.spacing.sm }}>
            Debug Info
          </h3>

          <div>
            <p style={{ fontSize: '12px', color: tokens.colors.gray[400], marginBottom: '4px' }}>Loading State</p>
            <p style={{ fontSize: '14px', color: isLoading ? tokens.colors.red[400] : tokens.colors.green[400] }}>
              {isLoading ? '🔄 Loading' : '✓ Idle'}
            </p>
          </div>

          <div>
            <p style={{ fontSize: '12px', color: tokens.colors.gray[400], marginBottom: tokens.spacing.sm }}>
              Last Message Sent ({messages.length})
            </p>
            {lastMessage && (
              <div
                style={{
                  padding: tokens.spacing.sm,
                  backgroundColor: tokens.colors.gray[700],
                  borderRadius: tokens.radius.sm,
                  fontSize: '13px',
                  color: tokens.colors.gray[200],
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                }}
              >
                "{lastMessage}"
              </div>
            )}
          </div>

          {/* Message History */}
          {messages.length > 0 && (
            <div style={{ marginTop: tokens.spacing.md }}>
              <p style={{ fontSize: '12px', color: tokens.colors.gray[400], marginBottom: tokens.spacing.sm }}>
                Message History
              </p>
              <div
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing.xs,
                }}
              >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                      backgroundColor: tokens.colors.gray[700],
                      borderRadius: tokens.radius.sm,
                      fontSize: '12px',
                      color: tokens.colors.gray[300],
                      borderLeft: `3px solid ${tokens.colors.blue[500]}`,
                    }}
                  >
                    #{idx + 1}: {msg.substring(0, 60)}
                    {msg.length > 60 ? '...' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Design Notes */}
      <div
        style={{
          padding: tokens.spacing.lg,
          borderTop: `1px solid ${tokens.colors.gray[700]}`,
          backgroundColor: tokens.colors.gray[800],
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.gray[300], marginBottom: tokens.spacing.md }}>
          Design Notes & Testing Checklist
        </h3>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: tokens.spacing.md,
          }}
        >
          {[
            '✓ Light gray background (#f7fafc)',
            '✓ Border color (#e2e8f0)',
            '✓ 16px border radius',
            '✓ Padding 16px all sides',
            '✓ Attachment button (paperclip icon)',
            '✓ Send button (yellow when enabled)',
            '✓ Textarea with placeholder',
            '✓ Error message display',
            '✓ Attachment preview chip',
            '✓ Enter to send, Shift+Enter for newline',
            '✓ Disabled state during loading',
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '13px',
                color: tokens.colors.gray[300],
                padding: tokens.spacing.sm,
                backgroundColor: tokens.colors.gray[700],
                borderRadius: tokens.radius.sm,
              }}
            >
              {item}
            </div>
          ))}
        </ul>
      </div>
    </div>
  );
}
