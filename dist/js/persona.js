// ============================================================
// persona.js — Avatar & Persona Switching
// ============================================================

export const DEFAULT_PERSONA = {
  id: 'default',
  name: 'Kavya',
  tagline: 'Your empathetic life-coach companion',
  avatarSrc: 'assets/avatar.png',
  meta: null, // no custom meta
  culturalHint: 'south-indian',
};

let activePersona = { ...DEFAULT_PERSONA };
let onPersonaChangeCallbacks = [];

export function getPersona() {
  return { ...activePersona };
}

export function onPersonaChange(fn) {
  onPersonaChangeCallbacks.push(fn);
}

function notifyChange() {
  onPersonaChangeCallbacks.forEach(fn => fn({ ...activePersona }));
}

// ── Reset to Default ─────────────────────────────────────────
export function resetToDefault() {
  activePersona = { ...DEFAULT_PERSONA };
  notifyChange();
}

// ── Age Safety Check ─────────────────────────────────────────
const MINOR_INDICATORS = [
  /\b(child|kid|teen|minor|adolescent|juvenile|toddler|infant|baby|underage|under\s*18|under\s*16|school\s*kid)\b/i,
  /\b(\d|1[0-7])\s*year[s]?\s*old\b/i,
  /\bage[d]?\s*(\d|1[0-7])\b/i,
];

function containsMinorIndicators(text) {
  return MINOR_INDICATORS.some(p => p.test(text));
}

// ── Custom Persona from Upload ────────────────────────────────
export async function applyCustomPersona({ file, customDescription = '' }) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please upload a valid image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;

      // Build metadata description
      let meta = customDescription.trim();
      if (!meta) {
        meta = 'Custom persona image uploaded by user. Adapt to a warm, neutral adult persona with the same core empathy and values. Do not imply any age below 25.';
      }

      // Age safety guard
      if (containsMinorIndicators(meta)) {
        meta = 'Custom persona image uploaded. Using a warm, adult persona (25+ years old) with the same core values and empathy. Do not imply any minor identity.';
      }

      activePersona = {
        id: 'custom',
        name: extractNameFromDescription(meta) || 'Your Companion',
        tagline: 'Your personalized life-coach companion',
        avatarSrc: dataUrl,
        meta,
        culturalHint: 'neutral',
      };

      notifyChange();
      resolve({ ...activePersona });
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

// Try to extract a name from description like "Her name is Priya"
function extractNameFromDescription(text) {
  const m = text.match(/(?:name(?:\s+is)?|called|i(?:'m| am))\s+([A-Z][a-z]{2,20})/i);
  return m?.[1] || null;
}

// ── Language ─────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
];

let activeLanguage = 'en';

export function getLanguage() { return activeLanguage; }

export function setLanguage(code) {
  if (SUPPORTED_LANGUAGES.find(l => l.code === code)) {
    activeLanguage = code;
  }
}
