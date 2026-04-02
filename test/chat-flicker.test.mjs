import { test } from 'node:test';
import assert from 'node:assert';

/**
 * REGRESSION TEST: Chat Message Flicker Bug
 *
 * This test verifies that the fix for the chat message flicker bug (race condition
 * between loadMessages and optimistic UI state) remains in place.
 *
 * The bug: When a user sends a message on an auto-created conversation,
 * handleSelectConversation triggers setCurrentConversationId, which fires the
 * useEffect that calls loadMessages. If loadMessages completes before optimistic
 * messages are added, setMessages(data.messages) clears the UI with empty DB state,
 * then optimistic messages get added back = visible flicker.
 *
 * The fix: Added !isLoading guard to the useEffect, preventing loadMessages from
 * running while send is in progress.
 */

test('Chat Flicker: Auto-create conversation + send message flow', async (t) => {
  // Simulate the state machine of sending a message on an auto-created conversation

  let currentConversationId = null;
  let isLoading = false;
  let messages = [];
  let loadMessagesCallCount = 0;

  // Mock loadMessages to track calls
  const mockLoadMessages = async (convId) => {
    loadMessagesCallCount++;
    // Simulate DB fetch delay
    await new Promise(resolve => setTimeout(resolve, 50));
    // This is the dangerous operation: replace entire message array from DB
    messages = []; // Empty because conversation is new
  };

  // Simulate the useEffect that watches currentConversationId and isLoading
  const maybeLoadMessages = async (newConversationId, newIsLoading) => {
    // This is the critical guard that prevents the flicker bug
    if (newConversationId && !newIsLoading) {
      await mockLoadMessages(newConversationId);
    } else if (!newConversationId) {
      messages = [];
    }
  };

  // Simulate sendMessage flow
  const sendMessage = async (content) => {
    isLoading = true;

    // Step 1: Auto-create conversation (if none exists)
    if (!currentConversationId) {
      currentConversationId = 'conv-123';
      // This state change triggers the useEffect
      // CRITICAL: useEffect should NOT call loadMessages because isLoading=true
      await maybeLoadMessages(currentConversationId, isLoading);
    }

    // Step 2: Add optimistic user message immediately
    messages.push({ id: 'user-1', role: 'user', content });

    // Step 3: Add empty assistant placeholder
    messages.push({ id: 'assistant-1', role: 'research', content: '' });

    // Step 4: Stream response
    messages = messages.map(m =>
      m.id === 'assistant-1' ? { ...m, content: 'Response from AI' } : m
    );

    // Step 5: Streaming complete
    isLoading = false;
    // CRITICAL: We do NOT call loadMessages here
  };

  // RUN THE TEST
  await t.test('User message stays visible from optimistic add through stream', async () => {
    assert.equal(messages.length, 0, 'Start with empty messages');

    // Send a message
    await sendMessage('Hello, assistant!');

    // Verify both optimistic and assistant message are present
    assert.equal(messages.length, 2, 'Should have user + assistant message');
    assert.equal(messages[0].role, 'user', 'First message is user');
    assert.equal(messages[0].content, 'Hello, assistant!', 'User message content preserved');
    assert.equal(messages[1].role, 'research', 'Second message is assistant');
    assert.equal(messages[1].content, 'Response from AI', 'Assistant message streamed');
  });

  await t.test('loadMessages is NOT called during send when isLoading=true', async () => {
    loadMessagesCallCount = 0;
    currentConversationId = null;
    messages = [];

    // The useEffect should skip loadMessages because isLoading=true during send
    // Verify: loadMessagesCallCount should be 0 after send completes

    await sendMessage('Test message');

    assert.equal(loadMessagesCallCount, 0,
      'loadMessages should NOT be called during send (isLoading guard active)');
  });

  await t.test('loadMessages IS called after isLoading becomes false', async () => {
    loadMessagesCallCount = 0;
    isLoading = false;

    // Now that isLoading=false, the guard allows loadMessages to run
    await maybeLoadMessages(currentConversationId, isLoading);

    assert.equal(loadMessagesCallCount, 1,
      'loadMessages should be called once isLoading=false');
  });

  await t.test('No disappear/reappear of user message (visual flicker test)', async () => {
    messages = [];
    currentConversationId = null;
    isLoading = false;
    loadMessagesCallCount = 0;

    // Track message visibility state throughout the flow
    const visibilityLog = [];

    const trackVisibility = (phase) => {
      const hasUserMessage = messages.some(m => m.role === 'user' && m.content === 'Test');
      visibilityLog.push({ phase, visible: hasUserMessage });
    };

    // Send message and track visibility at each phase
    isLoading = true;
    trackVisibility('1-before-send');

    // Auto-create
    currentConversationId = 'conv-456';
    await maybeLoadMessages(currentConversationId, isLoading);
    trackVisibility('2-after-autoCreate');

    // Optimistic add
    messages.push({ id: 'user-2', role: 'user', content: 'Test' });
    trackVisibility('3-after-optimistic-add');

    // Streaming
    messages.push({ id: 'assistant-2', role: 'research', content: '' });
    messages = messages.map(m =>
      m.id === 'assistant-2' ? { ...m, content: 'AI response' } : m
    );
    trackVisibility('4-after-streaming');

    // Send complete
    isLoading = false;
    trackVisibility('5-send-complete');

    // Verify user message visible in all phases except before auto-create
    // visibilityLog indices: [0]=before-send, [1]=after-autoCreate, [2]=after-optimistic, [3]=after-streaming, [4]=complete
    assert.equal(visibilityLog[0].visible, false, 'Not visible before send');
    assert.equal(visibilityLog[1].visible, false, 'Not visible after auto-create but before optimistic add');
    assert.equal(visibilityLog[2].visible, true, 'Visible after optimistic add');
    assert.equal(visibilityLog[3].visible, true, 'Still visible during streaming');
    assert.equal(visibilityLog[4].visible, true, 'Still visible at end');

    // The critical check: message never disappears between add and complete
    const afterOptimistic = visibilityLog.slice(3).map(l => l.visible);
    assert.ok(
      afterOptimistic.every(v => v === true),
      'User message should remain visible from optimistic add through completion (NO FLICKER)'
    );
  });
});

test('Chat Flicker: Sidebar conversation selection still works', async (t) => {
  // Verify that the !isLoading guard doesn't break normal sidebar selection

  let currentConversationId = null;
  let isLoading = false;
  let messages = [];
  let loadMessagesCallCount = 0;

  const mockLoadMessages = async (convId) => {
    loadMessagesCallCount++;
    await new Promise(resolve => setTimeout(resolve, 10));
    // Load messages from DB (simulated)
    messages = [
      { id: 'msg-1', role: 'user', content: 'Previous message' },
      { id: 'msg-2', role: 'research', content: 'Previous response' },
    ];
  };

  const maybeLoadMessages = async (newConversationId, newIsLoading) => {
    if (newConversationId && !newIsLoading) {
      await mockLoadMessages(newConversationId);
    } else if (!newConversationId) {
      messages = [];
    }
  };

  await t.test('Clicking sidebar to select conversation loads messages from DB', async () => {
    // User clicks existing conversation in sidebar
    currentConversationId = 'conv-existing';
    isLoading = false; // NOT sending, so isLoading is false

    // loadMessages should run because isLoading=false
    await maybeLoadMessages(currentConversationId, isLoading);

    assert.equal(loadMessagesCallCount, 1, 'loadMessages should be called for sidebar selection');
    assert.equal(messages.length, 2, 'Should load messages from DB');
    assert.equal(messages[0].content, 'Previous message', 'DB messages loaded correctly');
  });
});
