// ============================================================
// voice.js — Speech Recognition & Text-to-Speech
// ============================================================

const LANG_VOICE_MAP = {
  'en': { lang: 'en-IN', keywords: ['female', 'india', 'en-in'] },
  'ta': { lang: 'ta-IN', keywords: ['tamil', 'ta-in', 'ta'] },
  'hi': { lang: 'hi-IN', keywords: ['hindi', 'hi-in', 'hi'] },
};

let recognition = null;
let isListening = false;
let currentLang = 'en';
let onResultCallback = null;
let onStartCallback = null;
let onEndCallback = null;
let onErrorCallback = null;

// ── Speech Recognition ───────────────────────────────────────
export function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return false;

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    onStartCallback?.();
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    onResultCallback?.(final || interim, !!final);
  };

  recognition.onerror = (event) => {
    isListening = false;
    onErrorCallback?.(event.error);
    onEndCallback?.();
  };

  recognition.onend = () => {
    isListening = false;
    onEndCallback?.();
  };

  return true;
}

export function startListening({ lang = 'en', onResult, onStart, onEnd, onError } = {}) {
  if (!recognition) initRecognition();
  if (!recognition) {
    onError?.('Speech recognition not supported in this browser. Please use Chrome or Edge.');
    return;
  }
  if (isListening) stopListening();

  currentLang = lang;
  recognition.lang = LANG_VOICE_MAP[lang]?.lang || 'en-IN';
  onResultCallback = onResult;
  onStartCallback = onStart;
  onEndCallback = onEnd;
  onErrorCallback = onError;

  try {
    recognition.start();
  } catch (e) {
    onError?.(e.message);
  }
}

export function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

export function isCurrentlyListening() {
  return isListening;
}

// ── Text-to-Speech ───────────────────────────────────────────
let currentUtterance = null;
let ttsEnabled = true;

export function setTtsEnabled(val) { ttsEnabled = val; }

export function speak(text, { lang = 'en', onStart, onEnd, onError } = {}) {
  if (!ttsEnabled || !window.speechSynthesis) return;

  cancelSpeech();

  // Strip markdown-lite formatting for cleaner TTS
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();

  currentUtterance = new SpeechSynthesisUtterance(clean);
  currentUtterance.lang = LANG_VOICE_MAP[lang]?.lang || 'en-IN';
  currentUtterance.rate = 0.92;
  currentUtterance.pitch = 1.05;
  currentUtterance.volume = 1.0;

  // Try to find a warm female voice for the current language
  const voices = window.speechSynthesis.getVoices();
  const langCode = LANG_VOICE_MAP[lang]?.lang?.toLowerCase() || 'en-in';
  const keywords = LANG_VOICE_MAP[lang]?.keywords || [];

  const preferred = voices.find(v => {
    const vl = v.lang.toLowerCase();
    const vn = v.name.toLowerCase();
    const matchesLang = vl.startsWith(langCode.split('-')[0]);
    const isFemale = keywords.some(k => vn.includes(k)) ||
      ['female', 'woman', 'girl', 'zira', 'heera', 'priya', 'kavya', 'divya', 'ananya'].some(k => vn.includes(k));
    return matchesLang && isFemale;
  }) || voices.find(v => v.lang.toLowerCase().startsWith(langCode.split('-')[0]));

  if (preferred) currentUtterance.voice = preferred;

  currentUtterance.onstart = onStart;
  currentUtterance.onend = onEnd;
  currentUtterance.onerror = (e) => onError?.(e.error);

  // Chrome bug: speechSynthesis pauses after ~15s; resume hack
  const resumeHack = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      clearInterval(resumeHack);
      return;
    }
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 14000);

  currentUtterance.onend = () => {
    clearInterval(resumeHack);
    onEnd?.();
  };

  window.speechSynthesis.speak(currentUtterance);
}

export function cancelSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false;
}

// Ensure voices are loaded (async in some browsers)
export function ensureVoicesLoaded() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices();
    if (voices?.length) return resolve(voices);
    window.speechSynthesis?.addEventListener('voiceschanged', () => {
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
    setTimeout(resolve, 2000); // fallback
  });
}
