// ============================================================
// app.js — Main Application: State, Boot, Event Wiring
// ============================================================

import { streamChat, clearHistory, detectCrisis } from './gemini.js';
import {
  initChat, appendMessage, showTypingIndicator, removeTypingIndicator,
  updateStreamingBubble, finalizeStreamingBubble, showWelcomeMessage,
  appendSystemNotice, clearChat
} from './chat.js';
import {
  initRecognition, startListening, stopListening, isCurrentlyListening,
  speak, cancelSpeech, setTtsEnabled, ensureVoicesLoaded
} from './voice.js';
import {
  getPersona, resetToDefault, applyCustomPersona, onPersonaChange,
  SUPPORTED_LANGUAGES, getLanguage, setLanguage
} from './persona.js';

// ── State ─────────────────────────────────────────────────────
const state = {
  apiKey: localStorage.getItem('gemini_api_key') || '',
  language: localStorage.getItem('pref_language') || 'en',
  voiceEnabled: localStorage.getItem('voice_enabled') !== 'false',
  ttsEnabled: localStorage.getItem('tts_enabled') !== 'false',
  darkMode: localStorage.getItem('dark_mode') !== 'false',
  isGenerating: false,
  isListening: false,
};

// ── DOM Refs ──────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let chatContainer, chatInput, sendBtn, voiceBtn, settingsBtn, settingsModal,
  closeSettingsBtn, apiKeyInput, saveSettingsBtn, langSelect, personaUploadInput,
  personaDescInput, applyPersonaBtn, resetPersonaBtn, avatarImg, personaName,
  personaTagline, clearChatBtn, themeToggle, ttsToggle, langBadge, statusDot,
  charCount;

// ── Boot ──────────────────────────────────────────────────────
async function init() {
  bindElements();
  applyTheme();
  initChat({ chatContainer, onCrisisDetected: handleCrisisDetected });
  initRecognition();
  await ensureVoicesLoaded();

  populateLangSelect();
  restoreSettings();
  updatePersonaUI(getPersona());

  onPersonaChange(updatePersonaUI);

  // Event listeners
  sendBtn.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  chatInput.addEventListener('input', updateCharCount);

  voiceBtn.addEventListener('click', handleVoiceToggle);
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  clearChatBtn.addEventListener('click', handleClearChat);
  themeToggle.addEventListener('click', toggleTheme);
  ttsToggle.addEventListener('click', toggleTts);

  applyPersonaBtn.addEventListener('click', handlePersonaUpload);
  resetPersonaBtn.addEventListener('click', handleResetPersona);

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // Initial welcome
  showWelcomeMessage(getPersona().name);

  // Update status
  setOnlineStatus(true);
}

function bindElements() {
  chatContainer = $('#chat-messages');
  chatInput = $('#chat-input');
  sendBtn = $('#send-btn');
  voiceBtn = $('#voice-btn');
  settingsBtn = $('#settings-btn');
  settingsModal = $('#settings-modal');
  closeSettingsBtn = $('#close-settings');
  apiKeyInput = $('#api-key-input');
  saveSettingsBtn = $('#save-settings-btn');
  langSelect = $('#lang-select');
  personaUploadInput = $('#persona-upload-input');
  personaDescInput = $('#persona-desc-input');
  applyPersonaBtn = $('#apply-persona-btn');
  resetPersonaBtn = $('#reset-persona-btn');
  avatarImg = $('.avatar-img');
  personaName = $('.persona-name');
  personaTagline = $('.persona-tagline');
  clearChatBtn = $('#clear-chat-btn');
  themeToggle = $('#theme-toggle');
  ttsToggle = $('#tts-toggle');
  langBadge = $('#lang-badge');
  statusDot = $('#status-dot');
  charCount = $('#char-count');
}

// ── Send Message ──────────────────────────────────────────────
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || state.isGenerating) return;

  if (!state.apiKey) {
    openSettings();
    appendSystemNotice('⚙️ Please enter your Gemini API key in Settings first.');
    return;
  }

  chatInput.value = '';
  updateCharCount();
  setGenerating(true);
  cancelSpeech();

  appendMessage({ role: 'user', text });

  const persona = getPersona();
  const lang = getLanguage();
  showTypingIndicator(persona.avatarSrc);

  let streamBubble = null;

  await streamChat({
    userMessage: text,
    apiKey: state.apiKey,
    personaMeta: persona.meta,
    voiceMode: state.voiceEnabled && isCurrentlyListening(),
    onChunk: (chunk, fullText) => {
      if (!streamBubble) {
        removeTypingIndicator();
        const result = appendMessage({ role: 'ai', text: fullText, isStreaming: true });
        streamBubble = result.bubble;
      } else {
        updateStreamingBubble(streamBubble, fullText);
      }
    },
    onDone: (fullText) => {
      removeTypingIndicator();
      if (streamBubble) finalizeStreamingBubble(streamBubble);
      setGenerating(false);

      // TTS
      if (state.ttsEnabled && fullText) {
        speak(fullText, {
          lang,
          onStart: () => statusDot?.classList.add('speaking'),
          onEnd: () => statusDot?.classList.remove('speaking'),
        });
      }
    },
    onError: (err) => {
      removeTypingIndicator();
      setGenerating(false);
      appendSystemNotice(`⚠️ ${err}`);
    },
  });
}

// ── Voice Input ───────────────────────────────────────────────
function handleVoiceToggle() {
  if (isCurrentlyListening()) {
    stopListening();
    setListeningUI(false);
    return;
  }

  const lang = getLanguage();
  startListening({
    lang,
    onStart: () => setListeningUI(true),
    onResult: (transcript, isFinal) => {
      chatInput.value = transcript;
      updateCharCount();
      if (isFinal) {
        setListeningUI(false);
        handleSend();
      }
    },
    onEnd: () => setListeningUI(false),
    onError: (err) => {
      setListeningUI(false);
      appendSystemNotice(`🎙️ Voice error: ${err}. Please try again.`);
    },
  });
}

// ── Settings ──────────────────────────────────────────────────
function openSettings() {
  apiKeyInput.value = state.apiKey;
  settingsModal.classList.add('open');
  settingsModal.setAttribute('aria-hidden', 'false');
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.remove('open');
  settingsModal.setAttribute('aria-hidden', 'true');
}

function saveSettings() {
  const key = apiKeyInput.value.trim();
  if (key) {
    state.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
  }

  const lang = langSelect.value;
  setLanguage(lang);
  state.language = lang;
  localStorage.setItem('pref_language', lang);
  updateLangBadge(lang);

  closeSettings();
  appendSystemNotice('✅ Settings saved!');
}

function restoreSettings() {
  if (state.apiKey) apiKeyInput.value = state.apiKey;
  setLanguage(state.language);
  updateLangBadge(state.language);
  setTtsEnabled(state.ttsEnabled);
  updateTtsToggleUI();
}

function populateLangSelect() {
  SUPPORTED_LANGUAGES.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.label} — ${l.nativeLabel}`;
    if (l.code === state.language) opt.selected = true;
    langSelect.appendChild(opt);
  });
}

function updateLangBadge(code) {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  if (langBadge && lang) {
    langBadge.textContent = lang.nativeLabel;
    langBadge.title = lang.label;
  }
}

// ── Persona ───────────────────────────────────────────────────
async function handlePersonaUpload() {
  const file = personaUploadInput.files?.[0];
  const desc = personaDescInput.value.trim();

  if (!file && !desc) {
    appendSystemNotice('Please select an image or enter a persona description.');
    return;
  }

  try {
    if (file) {
      await applyCustomPersona({ file, customDescription: desc });
      appendSystemNotice('✨ Custom persona applied! I\'ll adapt my style to match.');
    } else {
      // Description-only persona
      const { getPersona: gp, setLanguage: sl } = await import('./persona.js');
      appendSystemNotice('✨ Persona description noted — I\'ll adapt my style.');
    }
    clearHistory();
    const p = getPersona();
    showWelcomeMessage(p.name);
  } catch (err) {
    appendSystemNotice(`⚠️ ${err.message}`);
  }
}

function handleResetPersona() {
  resetToDefault();
  clearHistory();
  personaUploadInput.value = '';
  personaDescInput.value = '';
  showWelcomeMessage('Kavya');
  appendSystemNotice('👋 Reset to default persona — welcome back, Kavya!');
}

function updatePersonaUI(persona) {
  if (avatarImg) avatarImg.src = persona.avatarSrc;
  if (personaName) personaName.textContent = persona.name;
  if (personaTagline) personaTagline.textContent = persona.tagline;
}

// ── Theme ─────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  if (themeToggle) themeToggle.textContent = state.darkMode ? '☀️' : '🌙';
}

function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem('dark_mode', state.darkMode);
  applyTheme();
}

// ── TTS Toggle ────────────────────────────────────────────────
function toggleTts() {
  state.ttsEnabled = !state.ttsEnabled;
  localStorage.setItem('tts_enabled', state.ttsEnabled);
  setTtsEnabled(state.ttsEnabled);
  updateTtsToggleUI();
  appendSystemNotice(state.ttsEnabled ? '🔊 Voice responses enabled' : '🔇 Voice responses disabled');
}

function updateTtsToggleUI() {
  if (ttsToggle) {
    ttsToggle.textContent = state.ttsEnabled ? '🔊' : '🔇';
    ttsToggle.title = state.ttsEnabled ? 'Disable voice responses' : 'Enable voice responses';
  }
}

// ── Clear Chat ────────────────────────────────────────────────
function handleClearChat() {
  if (confirm('Clear conversation? This cannot be undone.')) {
    clearHistory();
    clearChat();
    showWelcomeMessage(getPersona().name);
  }
}

// ── UI State ──────────────────────────────────────────────────
function setGenerating(val) {
  state.isGenerating = val;
  sendBtn.disabled = val;
  sendBtn.classList.toggle('loading', val);
  chatInput.disabled = val;
}

function setListeningUI(val) {
  state.isListening = val;
  voiceBtn.classList.toggle('recording', val);
  voiceBtn.title = val ? 'Stop recording' : 'Voice input';
  voiceBtn.setAttribute('aria-pressed', val);
}

function setOnlineStatus(online) {
  if (statusDot) {
    statusDot.classList.toggle('online', online);
    statusDot.title = online ? 'Online' : 'Offline';
  }
}

function updateCharCount() {
  const len = chatInput.value.length;
  if (charCount) charCount.textContent = `${len}/2000`;
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
}

function handleCrisisDetected() {
  if (statusDot) statusDot.classList.add('crisis');
  setTimeout(() => statusDot?.classList.remove('crisis'), 5000);
}

// ── Start ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
