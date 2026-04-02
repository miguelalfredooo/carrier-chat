# Architectural & Design Decisions

**Log of significant decisions made in the project.** Each entry documents what was decided, why, and what was rejected.

When implementing similar features in future, check this log for prior context and reasoning.

---

## Chat State Management: The !isLoading Guard

**Date:** 2026-04-01  
**Decision:** Add `!isLoading` check to the `useEffect` that loads messages when `currentConversationId` changes.

**Code:**
```typescript
useEffect(() => {
  if (currentConversationId && !isLoading) {  // ← The guard
    loadMessages(currentConversationId);
  }
}, [currentConversationId, isLoading]);
```

**Why:**
When auto-creating a conversation, `currentConversationId` changes and triggers the effect to load messages from the DB. But `sendMessage` is simultaneously adding optimistic messages. If `loadMessages` wins the race, it replaces the messages array with empty DB results, clearing the optimistic state. This creates a visible flicker.

By skipping `loadMessages` while `isLoading=true`, we prevent the DB fetch from interfering with optimistic updates.

**Rationale for this approach over alternatives:**

| Alternative | Why Rejected |
|---|---|
| **Remove the useEffect entirely** | We need to load messages when the user clicks a conversation in the sidebar. Removing it would break that UX. |
| **Delay loadMessages with setTimeout** | Timing is non-deterministic. Works on fast networks, fails on slow networks. The guard works in all conditions. |
| **Call loadMessages after send completes** | Messages are already correct in local state (optimistic + streamed). Reloading from DB causes a flicker. No need to synchronize. |
| **Lock the conversation during send** | More complex, requires tracking additional state. The guard is simpler and sufficient. |

**Related docs:**
- `docs/CHAT_FLICKER_FIX.md` — Full root cause analysis
- `lib/CHAT_PATTERNS.md` — Rules for chat state management
- `test/chat-flicker.test.mjs` — Regression test ensuring this works

**Impact:**
- **Scope:** Chat message loading during send
- **Risk:** Low. Guard only affects the auto-create flow when `isLoading=true`.
- **Future changes:** Any modification to chat loading must maintain the `!isLoading` guard.

---

## Chat Rendering: Always Use ReactMarkdown

**Date:** 2026-04-01  
**Decision:** All assistant messages render through ReactMarkdown with remarkGfm, never switching between plain text and markdown based on streaming state.

**Why:**
Switching render paths causes React to unmount/remount the DOM node, creating layout shifts and re-renders. By always using ReactMarkdown (even for empty strings), the DOM structure stays stable as content streams in.

**Code:**
```typescript
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {message.content}  // Empty during stream, filled as chunks arrive
</ReactMarkdown>
```

**Related docs:**
- `components/chat/MessageList.tsx` — Implementation with detailed comment block
- `lib/CHAT_PATTERNS.md` — Rule #6 about message array mutations

---

## Chat Auto-Create: Sidebar Selection Doesn't Trigger Load

**Date:** 2026-04-01  
**Decision:** When auto-creating a conversation in `sendMessage`, do NOT call `setCurrentConversationId` or `loadMessages` after stream completes.

**Why:**
- Messages are already correct in local state (optimistic user message + streamed assistant response)
- DB persistence happens in the background via the API endpoint
- Reloading from DB would clear the messages and re-render, causing a flicker
- Local state IS the source of truth during send

**What we DON'T do:**
```typescript
// ❌ NEVER DO THIS:
setTimeout(() => loadMessages(convId), 100);
// or
setCurrentConversationId(convId);
```

**When we DO load from DB:**
- Sidebar conversation selection (user clicks a different conversation)
- Initial page mount (fetch conversation messages)

**Related docs:**
- `docs/CHAT_FLICKER_FIX.md` — Root cause of why this matters
- `lib/CHAT_PATTERNS.md` — Rule #3 about streaming completion

---

## Data Model: Chat Message Roles

**Date:** 2026-04-01  
**Decision:** Map `research` role to `assistant` for API compatibility.

**Why:**
- Database stores `role` as `'research'` (represents the research/design agent responding)
- Anthropic API expects `'assistant'` role
- Conversion happens in the API route before sending to Claude

**Code:**
```typescript
const role = msg.role === 'research' ? 'assistant' : (msg.role as 'user' | 'assistant');
```

**Related files:**
- `app/api/chat/messages/route.ts` — Conversion logic at message formatting

---

## Testing: Node.js Built-in Test Runner

**Date:** 2026-04-01  
**Decision:** Use Node.js built-in `test` module (no external test framework).

**Why:**
- No external dependencies
- Available in Node.js 18+
- Simple for project-level validation
- Sufficient for regression tests

**Run tests:**
```bash
node --test test/**/*.test.mjs
```

**Related:**
- `test/chat-flicker.test.mjs` — Regression test using Node.js test runner

---

## Documentation: docs/ as Single Source of Truth

**Date:** 2026-04-01  
**Decision:** All operational and architectural knowledge goes in `docs/` folder with INDEX.md as the entry point.

**Why:**
- When something breaks, developers should find context in under 60 seconds
- INDEX.md acts as a table of contents, no need to search
- Bug log (BUGS.md) prevents re-investigation of old issues
- Decision log (DECISIONS.md) documents rationale for "why does it work this way?"

**How to maintain:**
1. Fix a bug → log it in BUGS.md
2. Make an architecture decision → log it in DECISIONS.md
3. Update INDEX.md to reference new docs

**Related:**
- `docs/INDEX.md` — Master index
- `docs/BUGS.md` — Bug log
- `.github/pull_request_template.md` — PR checklist enforces documentation

---

## Continued Review

Check this log before:
- Adding similar state management patterns
- Modifying chat rendering
- Changing how conversations are loaded or created
- Implementing auto-create UX in new features
