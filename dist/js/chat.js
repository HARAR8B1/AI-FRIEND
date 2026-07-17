// ============================================================
// chat.js — Chat UI Rendering, Message Bubbles, Typing Indicator
// ============================================================

import { detectCrisis } from './gemini.js';

const CRISIS_RESOURCES = `
<div class="crisis-card">
  <div class="crisis-card-header">🫂 You're not alone — please reach out</div>
  <ul class="crisis-list">
    <li><strong>iCall (India):</strong> <a href="tel:9152987821">9152987821</a></li>
    <li><strong>Vandrevala Foundation:</strong> <a href="tel:18602662345">1860-2662-345</a> <em>(24/7)</em></li>
    <li><strong>AASRA:</strong> <a href="tel:9820466627">9820466627</a></li>
    <li><strong>International:</strong> <a href="https://www.befrienders.org" target="_blank">befrienders.org</a></li>
  </ul>
  <p class="crisis-note">I'll stay right here with you while you reach out 💙</p>
</div>`;

let chatEl = null;
let typingEl = null;
let onCrisisDetectedCallback = null;

export function initChat({ chatContainer, onCrisisDetected }) {
  chatEl = chatContainer;
  onCrisisDetectedCallback = onCrisisDetected;
}

// ── Render a message bubble ───────────────────────────────────
export function appendMessage({ role, text, isStreaming = false }) {
  const isUser = role === 'user';

  const wrapper = document.createElement('div');
  wrapper.className = `message ${isUser ? 'message--user' : 'message--ai'}`;
  wrapper.setAttribute('data-role', role);

  if (!isUser) {
    const avatarMini = document.createElement('div');
    avatarMini.className = 'message-avatar';
    avatarMini.innerHTML = `<img src="${document.querySelector('.avatar-img')?.src || 'assets/avatar.png'}" alt="Companion avatar" />`;
    wrapper.appendChild(avatarMini);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = renderMarkdownLite(text);
    if (isStreaming) bubble.classList.add('streaming');
  }

  wrapper.appendChild(bubble);

  // Timestamp
  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = formatTime(new Date());
  wrapper.appendChild(time);

  chatEl.appendChild(wrapper);
  scrollToBottom();

  // Crisis detection
  if (isUser && detectCrisis(text)) {
    showCrisisBanner();
    onCrisisDetectedCallback?.();
  }

  return { wrapper, bubble };
}

// ── Update streaming bubble ───────────────────────────────────
export function updateStreamingBubble(bubble, fullText) {
  bubble.innerHTML = renderMarkdownLite(fullText);
  scrollToBottom();
}

export function finalizeStreamingBubble(bubble) {
  bubble.classList.remove('streaming');
  bubble.classList.add('stream-done');
}

// ── Typing Indicator ─────────────────────────────────────────
export function showTypingIndicator(avatarSrc) {
  removeTypingIndicator();
  typingEl = document.createElement('div');
  typingEl.className = 'message message--ai typing-wrapper';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="message-avatar">
      <img src="${avatarSrc || 'assets/avatar.png'}" alt="Companion" />
    </div>
    <div class="bubble typing-bubble">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>`;
  chatEl.appendChild(typingEl);
  scrollToBottom();
}

export function removeTypingIndicator() {
  typingEl?.remove();
  typingEl = null;
  document.getElementById('typing-indicator')?.remove();
}

// ── Crisis Banner ─────────────────────────────────────────────
function showCrisisBanner() {
  let banner = document.getElementById('crisis-banner');
  if (banner) return;

  banner = document.createElement('div');
  banner.id = 'crisis-banner';
  banner.className = 'crisis-banner';
  banner.innerHTML = `
    <button class="crisis-close" aria-label="Close crisis resources">✕</button>
    ${CRISIS_RESOURCES}`;

  banner.querySelector('.crisis-close').addEventListener('click', () => banner.remove());
  document.body.appendChild(banner);

  // Append in-chat crisis message
  const { bubble } = appendMessage({
    role: 'ai',
    text: "I hear you, and I want you to know that what you're feeling is real and it matters. You don't have to carry this alone right now.",
  });

  // Add crisis resources after the warm message
  const extra = document.createElement('div');
  extra.className = 'crisis-inline';
  extra.innerHTML = CRISIS_RESOURCES;
  bubble.parentElement.appendChild(extra);
}

// ── Clear Chat ────────────────────────────────────────────────
export function clearChat() {
  chatEl.innerHTML = '';
}

// ── Welcome Message ───────────────────────────────────────────
export function showWelcomeMessage(personaName = 'Kavya') {
  clearChat();
  const greetings = [
    `Hi there 😊 I'm ${personaName}, and I'm really glad you're here. This is a safe space — just between us. What's on your mind today?`,
    `Hello! I'm ${personaName}. Whatever brought you here today, I'm glad it did. Take a breath, and whenever you're ready — I'm listening 💙`,
    `Vanakkam 🙏 I'm ${personaName}. I'm here for you — whether it's something big or just a feeling you can't quite name. What's going on?`,
  ];
  const text = greetings[Math.floor(Date.now() / 1000) % greetings.length];
  appendMessage({ role: 'ai', text });
}

// ── Helpers ───────────────────────────────────────────────────
function renderMarkdownLite(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>)+/gs, '<ol>$&</ol>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(<li>)/gm, (m, p, o, str) => {
      const before = str.slice(0, o);
      return before.endsWith('</li>') || before.endsWith('<ul>') ? m : '<ul>' + m;
    });
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  if (chatEl) {
    requestAnimationFrame(() => {
      chatEl.scrollTop = chatEl.scrollHeight;
    });
  }
}

// ── System message (non-chat) ─────────────────────────────────
export function appendSystemNotice(text) {
  const el = document.createElement('div');
  el.className = 'system-notice';
  el.textContent = text;
  chatEl.appendChild(el);
  scrollToBottom();
}
