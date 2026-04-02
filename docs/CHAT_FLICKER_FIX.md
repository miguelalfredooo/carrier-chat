# Chat Message Flicker Fix — 2026-04-01

## What Broke

When a user sent a message on an auto-created conversation, the user's message bubble would briefly disappear, then reappear with the AI response. The flicker was inconsistent (not every send), making it appear as a timing-dependent race condition.

**Symptoms:**
- Send message on new conversation → user pill disappears for 100-500ms
- Reappears with AI response → looks like message was lost then recovered
- Inconsistency made debugging hard — sometimes worked, sometimes didn't

## Root Cause: Race Condition Between State Updates

The bug was a three-player race:

```
Player 1: handleSelectConversation (on auto-create)
  └─> setCurrentConversationId(newConversation.id)

Player 2: useEffect watching currentConversationId
  └─> calls loadMessages(convId)
  └─> awaits fetch from DB
  └─> setMessages(data.messages || [])  ← CLEARS messages with empty DB state

Player 3: sendMessage (optimistic update)
  └─> setMessages((prev) => [...prev, userMessage, assistantMessage])
```

**The race:**
1. Auto-create conversation sets `currentConversationId`
2. useEffect fires immediately and calls `loadMessages`
3. Meanwhile, sendMessage is adding optimistic messages
4. **If loadMessages wins the race:** `setMessages(data.messages)` clears state with empty array from new conversation
5. Then optimistic messages get added = **visible flicker**
6. Then streaming completes = messages appear normal

**Why inconsistent?**
- Network speed, component render timing, and JavaScript event loop scheduling meant the race had non-deterministic timing
- Slower network → more likely loadMessages clears the optimistic messages
- Faster network → race might go the other way

## The Fix: !isLoading Guard

Added a dependency on `isLoading` to the useEffect and only call `loadMessages` when `isLoading=false`:

```typescript
// Before (buggy):
useEffect(() => {
  if (currentConversationId) {
    loadMessages(currentConversationId);
  }
}, [currentConversationId]);

// After (fixed):
useEffect(() => {
  if (currentConversationId && !isLoading) {  // ← Added !isLoading check
    loadMessages(currentConversationId);
  }
}, [currentConversationId, isLoading]);
```

**Why this works:**
- When `isLoading=true`, the send is in progress and optimistic updates are being added
- `loadMessages` is skipped, preventing it from clearing the optimistic state
- Once the stream completes, `isLoading` becomes false
- If the conversation was changed (e.g., sidebar click), the useEffect will run `loadMessages` on the next render

## Critical Rule: Do NOT Call loadMessages After Streaming

The temptation is to "sync" with the database after sending:

```typescript
// ❌ DO NOT DO THIS — causes the flicker bug:
setTimeout(() => loadMessages(convId), 100);
// or
if (fullResponse) {
  setCurrentConversationId(convId);  // triggers useEffect → loadMessages
}
```

**Why this is wrong:**
- Messages are already correct in local state (optimistic + streamed)
- Reloading from DB causes entire message array to re-render
- Creates a visible flash/reflow between "local state render" and "DB state render"
- If DB persistence is slow, local state is ahead of DB, making it even worse

**The truth:**
- Local state IS the source of truth during send
- DB persistence happens in background
- No need to synchronize with DB after send

## Verification

Run the regression test:
```bash
node --test test/chat-flicker.test.mjs
```

This test covers:
- Optimistic message stays visible throughout send
- `loadMessages` is NOT called during `isLoading=true`
- `loadMessages` IS called after `isLoading=false`
- No disappear/reappear of messages in the flow

## Related Changes

- **Commits:** `dc010e7` (carrier), `95c6d8c` (carrier-chat)
- **Files:** `components/chat/ChatInterface.tsx` (both repos)
- **Related test:** `test/chat-flicker.test.mjs`
- **Patterns guide:** `lib/CHAT_PATTERNS.md`
