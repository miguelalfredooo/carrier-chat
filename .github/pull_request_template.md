## Summary

<!-- Brief description of what this PR does and why -->

## Changes

<!-- List the key changes made -->

---

## Chat Flow Changes

If this PR modifies `components/chat/ChatInterface.tsx` or any `sendMessage` logic, complete this checklist:

- [ ] **No new loadMessages in streaming path** — Verified that no `loadMessages` is called after streaming completes or inside the send handler
- [ ] **No full array replacement after send** — Confirmed that `setMessages(apiResponse)` doesn't replace the entire messages array after a send (it should use optimistic + streaming append pattern)
- [ ] **isLoading guard in place** — The useEffect watching `currentConversationId` includes `!isLoading` check to prevent DB reloads during send
- [ ] **Tested with slow network** — Used DevTools Network Throttle (Slow 3G) to verify no message flicker or disappear/reappear
- [ ] **Tested auto-create conversation** — Sent a message on a new auto-created conversation and verified the user message stays visible throughout the flow with no flicker

**Test command:**
```bash
node --test test/chat-flicker.test.mjs
```

**Reference:** Read `lib/CHAT_PATTERNS.md` and `docs/CHAT_FLICKER_FIX.md` before making chat changes.

---

## Testing

<!-- Describe how you tested this change -->

## Related Issues

<!-- Link to any related issues or tickets -->
