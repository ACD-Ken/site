/* ACD-Bot Chat Widget
 * After deploying to Railway, replace RAILWAY_URL with your actual deployment URL,
 * e.g. https://site-production-abc1.up.railway.app
 */
const RAILWAY_URL = 'https://acd-bot-production.up.railway.app';
const CHATBOT_API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api/chat'
  : `${RAILWAY_URL}/api/chat`;

(function () {
  const GREETING = "Hi! I'm ACD-Bot 🤖, Ken's personal assistant. Ask me anything about his skills, projects, or how to get in touch!";

  let messages = [];
  let isOpen = false;
  let isWaiting = false;

  const STORAGE_KEY = 'acd_chat';

  function saveSession() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, isOpen }));
  }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function buildWidget() {
    // Floating button
    const btn = document.createElement('button');
    btn.id = 'acd-chat-btn';
    btn.setAttribute('aria-label', 'Open chat');
    btn.innerHTML = '🤖';
    btn.addEventListener('click', toggleChat);

    // Chat window
    const win = document.createElement('div');
    win.id = 'acd-chat-window';
    win.classList.add('acd-hidden');
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'ACD-Bot chat');
    win.innerHTML = `
      <div class="acd-header">
        <div class="acd-header-avatar">🤖</div>
        <div class="acd-header-info">
          <div class="acd-header-name">ACD-Bot</div>
          <div class="acd-header-status">Ken's AI assistant</div>
        </div>
        <button class="acd-close-btn" aria-label="Close chat">✕</button>
      </div>
      <div class="acd-messages" id="acd-messages"></div>
      <div class="acd-input-row">
        <textarea id="acd-input" placeholder="Ask me about Ken…" rows="1" aria-label="Your message"></textarea>
        <button id="acd-send-btn" aria-label="Send">➤</button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(win);

    win.querySelector('.acd-close-btn').addEventListener('click', closeChat);
    document.getElementById('acd-send-btn').addEventListener('click', sendMessage);
    const input = document.getElementById('acd-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    });

    const saved = loadSession();
    if (saved.messages && saved.messages.length > 0) {
      messages = saved.messages;
      messages.forEach(m => {
        if (m.role === 'user') appendUserMessage(m.content);
        else appendBotMessage(m.content);
      });
      if (saved.isOpen) openChat();
    } else {
      appendBotMessage(GREETING);
      setTimeout(() => { if (!isOpen) openChat(); }, 5000);
    }
  }

  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  function openChat() {
    isOpen = true;
    document.getElementById('acd-chat-window').classList.remove('acd-hidden');
    document.getElementById('acd-chat-btn').innerHTML = '✕';
    setTimeout(() => document.getElementById('acd-input').focus(), 250);
    scrollToBottom();
    saveSession();
  }

  function closeChat() {
    isOpen = false;
    document.getElementById('acd-chat-window').classList.add('acd-hidden');
    document.getElementById('acd-chat-btn').innerHTML = '🤖';
    saveSession();
  }

  function appendBotMessage(text) {
    const el = document.createElement('div');
    el.className = 'acd-msg acd-bot';
    el.textContent = text;
    document.getElementById('acd-messages').appendChild(el);
    scrollToBottom();
  }

  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'acd-msg acd-user';
    el.textContent = text;
    document.getElementById('acd-messages').appendChild(el);
    scrollToBottom();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'acd-typing';
    el.id = 'acd-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    document.getElementById('acd-messages').appendChild(el);
    scrollToBottom();
    return el;
  }

  function removeTyping() {
    const el = document.getElementById('acd-typing');
    if (el) el.remove();
  }

  function scrollToBottom() {
    const msgs = document.getElementById('acd-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendMessage() {
    if (isWaiting) return;
    const input = document.getElementById('acd-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';
    appendUserMessage(text);

    messages.push({ role: 'user', content: text });
    if (messages.length > 12) messages = messages.slice(-12);
    saveSession();

    isWaiting = true;
    document.getElementById('acd-send-btn').disabled = true;
    const typing = showTyping();

    try {
      const res = await fetch(CHATBOT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || 'Sorry, I had trouble responding. Please try again.';
      removeTyping();
      appendBotMessage(reply);
      messages.push({ role: 'assistant', content: reply });
      if (messages.length > 12) messages = messages.slice(-12);
      saveSession();
    } catch (err) {
      removeTyping();
      appendBotMessage('Oops! I\'m having trouble connecting right now. Please try again shortly.');
      console.error('[ACD-Bot]', err);
    } finally {
      isWaiting = false;
      document.getElementById('acd-send-btn').disabled = false;
      document.getElementById('acd-input').focus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
