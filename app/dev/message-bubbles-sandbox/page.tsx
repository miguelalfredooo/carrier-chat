'use client';

import { designTokens as tokens } from '@/lib/design-tokens';

export default function MessageBubblesSandboxPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: tokens.colors.gray[900],
        color: tokens.colors.white,
        padding: tokens.spacing.lg,
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: tokens.spacing.md }}>
        Message Bubbles Sandbox
      </h1>

      {/* User Message */}
      <div style={{ marginBottom: tokens.spacing.xl }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.gray[300], marginBottom: tokens.spacing.md }}>
          User Message
        </h2>
        <div style={{ maxWidth: '600px' }}>
          <div
            className="whitespace-pre-wrap break-words"
            style={{
              backgroundColor: tokens.colors.black,
              color: tokens.colors.white,
              padding: tokens.spacing.md,
              borderRadius: tokens.radius.lg,
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          >
            hello
          </div>
        </div>
      </div>

      {/* Agent Message */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.gray[300], marginBottom: tokens.spacing.md }}>
          Agent Message
        </h2>
        <div style={{ maxWidth: '600px' }}>
          <div
            style={{
              backgroundColor: tokens.colors.white,
              color: tokens.colors.black,
              padding: tokens.spacing.md,
              borderRadius: tokens.radius.lg,
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          >
            <p style={{ margin: 0, marginBottom: '8px' }}>
              Hey there! I'm ready to run a structured gate check on a product brief.
            </p>
            <p style={{ margin: 0, marginBottom: '8px', fontWeight: '600' }}>
              Here's what I need from you:
            </p>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              Share the product problem, target user, proposed solution (if you have one), and any context around timing or urgency.
            </p>
            <p style={{ margin: 0, marginBottom: '8px' }}>I'll evaluate it against four gates:</p>
            <ol style={{ margin: 0, marginBottom: '8px', paddingLeft: '20px' }}>
              <li>Problem specificity for user testing</li>
              <li>User identifiability &amp; findability</li>
              <li>Metric clarity (what moves if solved)</li>
              <li>Urgency / why now</li>
            </ol>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              Then I'll either block it with the gap or pass it forward with ranked assumptions and trade-offs.
            </p>
            <p style={{ margin: 0 }}>Go ahead—paste the brief whenever you're ready.</p>
          </div>
        </div>
      </div>

      {/* Design Notes */}
      <div style={{ marginTop: tokens.spacing.xl }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.gray[300], marginBottom: tokens.spacing.md }}>
          Design Notes
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: tokens.spacing.md,
          }}
        >
          {[
            '✓ User message: black bg, white text',
            '✓ Agent message: white bg, black text',
            '✓ rounded-2xl (16px radius)',
            '✓ px-4 py-2 padding (token equivalents)',
            '✓ text-sm (14px)',
            '✓ whitespace-pre-wrap for user (preserve formatting)',
            '✓ break-words to handle long text',
            '✓ Paragraph margins (m-0 then custom gap)',
            '✓ List styling with proper indentation',
            '✓ Support rich text (bold, lists, paragraphs)',
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: tokens.spacing.sm,
                backgroundColor: tokens.colors.gray[800],
                borderRadius: tokens.radius.sm,
                fontSize: '13px',
                color: tokens.colors.gray[300],
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
