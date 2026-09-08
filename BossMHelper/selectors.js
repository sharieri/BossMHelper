const BossAssistantSelectors = {
  conversationContainer: [
    '[class*="chat-list"]', '[class*="conversation-list"]', '[class*="session-list"]', '[role="list"]'
  ],
  conversationItem: [
    '[data-chat-id]', '[data-conversation-id]', '[data-session-id]', '[role="listitem"]', 'li', '[class*="chat-item"]', '[class*="conversation-item"]', '[class*="session-item"]'
  ],
  selectedConversation: [
    '[aria-selected="true"]', '[class*="active"]', '[class*="selected"]', '[class*="current"]'
  ],
  messageContainer: [
    '[class*="message-list"]', '[class*="chat-content"]', '[class*="message-content"]', '[role="log"]'
  ],
  messageItem: [
    '[class*="message-item"]', '[class*="chat-message"]', '[class*="message"]'
  ],
  input: [
    'textarea', '[contenteditable="true"][role="textbox"]', '[contenteditable="true"]'
  ],
  sendButton: [
    'button', '[role="button"]'
  ]
};
