# Bug Log

**Log of significant bugs fixed in production.** Each entry documents the symptom, root cause, fix, and how to prevent regression.

When debugging a similar issue in future, check this log for prior context.

---

## Chat Message Flicker on Auto-Create Conversation

**Date Found:** 2026-04-01  
**Status:** Fixed  
**Severity:** Medium (intermittent visual bug, no data loss)

### Symptom

When a user sent a message on an auto-created conversation:
- User's message bubble appears
- Briefly disappears (100-500ms)
- Reappears with the AI response

**Why it was hard to debug:**
- Inconsistent timing (only happened on slow networks or high server load)
- Appeared as a timing flake rather than a logic error
- Looked like a UI glitch, not a state management bug

### Root Cause

**Three-player race condition in state updates:**

```
Player 1: handleSelectConversation (on auto-create)
  └─> setCurrentConversationId(newConversation.id)

Player 2: useEffect watching currentConversationId
  └─> calls loadMessages(convId)
  └─> awaits fetch from DB (SLOW on high latency)
  └─> setMessages(data.messages || [])  ← CLEARS with empty array

Player 3: sendMessage (optimistic update)
  └─> setMessages((prev) => [...prev, userMessage, assistantMessage])
```

**The race:**
1. User sends first message on new conversation
2. `handleSelectConversation` sets `currentConversationId`
3. useEffect fires and calls `loadMessages`
4. Meanwhile, `sendMessage` is adding optimistic messages
5. **If loadMessages completes first:** `setMessages(data.messages)` clears state with empty DB results
6. Then optimistic messages get added back → **visible flicker**
7. Then streaming fills the assistant message → appears normal
8. **If sendMessage wins:** Flow is fine, no flicker

**Why timing determined the bug:**
- Fast network: loadMessages completes after optimistic add (no flicker)
- Slow network: loadMessages completes before optimistic add (flicker)
- High server load: same as slow network
- This is why the bug was intermittent

### Fix

**Added `!isLoading` guard to the useEffect:**

```typescript
useEffect(() => {
  if (currentConversationId && !isLoading) {  // ← Critical guard
    loadMessages(currentConversationId);
  }
}, [currentConversationId, isLoading]);
```

**How it works:**
- When `isLoading=true` (send in progress), skip `loadMessages`
- Prevents DB fetch from clearing optimistic messages
- Once send completes (`isLoading=false`), loadMessages can run if conversation changed
- Eliminates the race condition

**Commits:**
- `dc010e7` (carrier main)
- `95c6d8c` (carrier-chat master)

### Testing & Verification

**Regression test:** `test/chat-flicker.test.mjs`

Run:
```bash
node --test test/chat-flicker.test.mjs
```

**Manual verification:**
1. Open DevTools → Network → Slow 3G throttle
2. Go to localhost:3000 or localhost:3500
3. Send a message (auto-creates conversation)
4. User message should stay visible throughout streaming
5. No disappear/reappear flicker
6. All 7 tests in regression test pass

**CI integration:**
PR checklist in `.github/pull_request_template.md` requires:
- [ ] Tested with slow network (DevTools throttle)
- [ ] Tested auto-create conversation flow
- Run: `node --test test/chat-flicker.test.mjs`

### Prevention for Future

**Code documentation:**
- `docs/CHAT_FLICKER_FIX.md` — Full technical analysis
- `lib/CHAT_PATTERNS.md` — Rules for chat state management
- `components/chat/ChatInterface.tsx` — Enhanced comments explaining the guard

**Guard against regression:**
1. Regression test runs on every commit
2. PR checklist specifically flags chat changes
3. Code comments explain why the guard exists
4. This bug log provides context if someone asks "why is this here?"

**If it regresses:**
1. Check `test/chat-flicker.test.mjs` output
2. Read `docs/CHAT_FLICKER_FIX.md` for root cause
3. Verify `!isLoading` guard is still in the useEffect
4. Check for any new `loadMessages` calls in the streaming path

### Impact

**Scope:**
- Chat message rendering on auto-create conversation
- Only affects initial message send on new conversations
- Does NOT affect sidebar selection flow (which correctly loads messages)

**Related changes:**
- Removed `setTimeout(() => loadMessages(convId), 100)` after streaming (it was a timing hack)
- Enhanced useEffect comment explaining the race condition
- Added `isLoading` to useEffect dependency array

---

## How to Log a New Bug

When you fix a bug:

1. **Create entry above** with template:
   - Date Found
   - Status (Fixed, In Progress, etc.)
   - Severity (Critical, High, Medium, Low)

2. **Document symptom:** What users see / what went wrong

3. **Document root cause:** The technical explanation with code if possible

4. **Document fix:** The code change and commits

5. **Add testing:** Regression test location and how to run it

6. **Prevention:** What safeguards prevent regression

7. **Update INDEX.md** to reference the new bug entry

8. **Link from elsewhere:** Add link to this bug from related code comments

---

## Statistics

| Metric | Value |
|---|---|
| Total bugs fixed | 1 (chat flicker) |
| Regression test coverage | 7/7 tests passing |
| Time to find root cause | ~2 hours of investigation |
| Time to implement fix | 15 minutes |
| Prevention system creation | 30 minutes (test + docs + PR checklist) |
