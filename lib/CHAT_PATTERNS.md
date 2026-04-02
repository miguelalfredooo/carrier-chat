# Chat Message State Management Rules

**If you're modifying ChatInterface.tsx or sendMessage, read this first.**

These rules prevent race conditions, flicker bugs, and silent state inconsistencies. They are the result of debugging the chat message flicker bug (April 2026).

---

## Rule 1: Optimistic Updates

**Messages added locally BEFORE the API call completes.**

```typescript
// ✅ CORRECT: Add message immediately
setMessages((prev) => [...prev, userMessage, assistantMessage]);

// Then send API request
const response = await fetch('/api/chat/messages', { ... });
```

**Why:**
- User sees message instantly (no perceived lag)
- Streaming can append to assistant message without clearing it
- DB persistence happens in background (user doesn't wait)

**Critical:** Never clear optimistic messages until the send completes.

---

## Rule 2: When to Call loadMessages

**loadMessages fetches the entire conversation history from the database.**

Call `loadMessages` ONLY in these scenarios:

1. **User clicks a conversation in the sidebar** → select a different conversation
2. **Initial page load** → fetch conversation messages on mount

**Do NOT call loadMessages in these scenarios:**

- ❌ After streaming completes (messages already in state)
- ❌ Inside sendMessage or during the send flow
- ❌ In a setTimeout after send (timing-dependent bugs)
- ❌ When changing currentConversationId during send (breaks auto-create UI)

**Code pattern:**

```typescript
// ✅ CORRECT:
useEffect(() => {
  if (currentConversationId && !isLoading) {  // Guard: only load when NOT sending
    loadMessages(currentConversationId);
  }
}, [currentConversationId, isLoading]);
```

---

## Rule 3: After Streaming Completes

**Do nothing. Do not reload from database.**

```typescript
// ✅ CORRECT: Streaming is done, messages are correct in state
setStatus('complete');
setBlockedAt(undefined);
// That's it. Don't call setCurrentConversationId, loadMessages, or any DB fetch.

// ❌ WRONG:
setTimeout(() => loadMessages(convId), 100);  // Causes flicker

// ❌ WRONG:
setCurrentConversationId(convId);  // Triggers useEffect that might loadMessages

// ❌ WRONG:
setMessages(apiResponse.messages);  // Replaces entire array, clears streaming state
```

**Why:**
- Optimistic user message + streamed assistant response are already in state
- DB write happens in background (by the API endpoint)
- Reloading causes visible re-render (flash/flicker)
- No need to "sync" with DB — local state is source of truth

---

## Rule 4: The isLoading Guard

**The !isLoading check prevents the flicker bug.**

```typescript
useEffect(() => {
  if (currentConversationId && !isLoading) {  // ← Critical guard
    loadMessages(currentConversationId);
  }
}, [currentConversationId, isLoading]);  // ← Must include isLoading dependency
```

**What it prevents:**
- When auto-creating a conversation, `currentConversationId` changes
- This would normally trigger loadMessages immediately
- But `isLoading=true` (send in progress), so loadMessages is skipped
- Prevents DB fetch from clearing optimistic messages
- Once send completes, `isLoading` becomes false and loadMessages can run if needed

---

## Rule 5: No Timing Hacks

**Never use setTimeout or other timing tricks to order state updates.**

```typescript
// ❌ NEVER DO THIS:
setTimeout(() => loadMessages(convId), 100);

// ❌ NEVER DO THIS:
setTimeout(() => setCurrentConversationId(convId), 50);

// ❌ NEVER DO THIS:
await new Promise(resolve => setTimeout(resolve, 200));
// ... then loadMessages()
```

**Why timing hacks fail:**
- Network speed is variable (could be 50ms or 5 seconds)
- Component render timing is non-deterministic
- JavaScript event loop scheduling varies
- Timeout that works on fast network fails on slow network
- **Result:** Intermittent race conditions that are hard to debug

**Instead, use state guards like !isLoading.**

---

## Rule 6: Message Array Mutations

**Never replace the entire messages array after sending. Merge instead.**

```typescript
// ❌ WRONG: Replaces entire array from API response
const response = await fetch(...);
const data = await response.json();
setMessages(data.messages);  // Clears optimistic state!

// ✅ CORRECT: Keep optimistic, append assistant response
const response = await fetch(...);
// Streaming already handled appending — just mark complete
setStatus('complete');
```

**Why:**
- Replacing array causes re-render of all messages (visual flicker)
- Optimistic user message disappears when array is replaced
- Assistant message is empty in optimistic phase, filled during stream
- If you replace the array, you lose the streaming progress

---

## Rule 7: Message IDs and Keys

**Use stable IDs for React keys to prevent re-renders.**

```typescript
// ✅ CORRECT: Temp IDs that don't change during stream
const userMessage: ChatMessage = {
  id: `temp-user-${Date.now()}`,  // Stable during send
  role: 'user',
  content,
};

const assistantMessage: ChatMessage = {
  id: `temp-assistant-${Date.now()}`,
  role: 'research',
  content: '',  // Empty, filled during stream
};
```

**Why:**
- React uses key to match DOM nodes across renders
- If key changes, React unmounts and remounts (visible flicker)
- Temp IDs stay the same as content is streamed
- Once persisted, DB IDs replace temp IDs

---

## Anti-Patterns (Do NOT Do)

| Anti-Pattern | Why It's Wrong | Alternative |
|---|---|---|
| Call `loadMessages` after send completes | Clears optimistic state, causes flicker | Don't reload — messages already in state |
| Replace full messages array from API | Causes re-render of all messages | Use optimistic + streaming pattern |
| Use `setTimeout` to order state updates | Timing is non-deterministic, fails on slow networks | Use state guards like `!isLoading` |
| Call `setCurrentConversationId` after send | Triggers useEffect that might loadMessages | Keep currentConversationId stable during send |
| Reload messages on every network event | Causes flicker and flashing | Only reload on explicit user action (sidebar click) |
| Switch between plain text and markdown render | DOM structure changes, causes re-render | Always render through ReactMarkdown |

---

## Testing Your Changes

**Before committing any changes to ChatInterface.tsx:**

1. **Slow Network Test:**
   - Open DevTools → Network → Slow 3G
   - Send a message on an auto-created conversation
   - User message should stay visible throughout
   - No disappear/reappear flicker

2. **Message Visibility Test:**
   - Open DevTools → Performance → Record
   - Send a message
   - Screenshot every 100ms
   - Look for frames where message disappears
   - If you see it, you've introduced the bug

3. **Regression Test:**
   ```bash
   node --test test/chat-flicker.test.mjs
   ```
   All tests must pass.

---

## References

- **Flicker bug fix:** `docs/CHAT_FLICKER_FIX.md`
- **Regression test:** `test/chat-flicker.test.mjs`
- **Component:** `components/chat/ChatInterface.tsx`
