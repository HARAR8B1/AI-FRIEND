// ============================================================
// gemini.js — Gemini API Client & System Prompt Builder
// ============================================================

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_HISTORY = 40; // rolling window (pairs of messages)

// ── System Prompt ────────────────────────────────────────────
function buildSystemPrompt(personaMeta = null) {
  const personaBlock = personaMeta
    ? `
## Current Persona (Custom Upload)
The user has uploaded a custom persona image. Here is the metadata about it:
${personaMeta}
Adjust your self-referential framing (name, gender presentation, cultural background cues) to match this persona, while keeping all core values, safety protocols, and empathy exactly the same. Do not imply the persona is a minor under any circumstances.
`
    : `
## Your Persona
You are Kavya — a warm, emotionally intelligent AI companion embodied as a friendly, beautiful young South Indian woman in her late 20s. You speak with the empathy and insight of a psychology-trained caring friend.
`;

  return `You are an Empathetic AI Life-Coach Companion.
${personaBlock}

## Identity & Tone
- Tone: Empathetic, respectful, warm, non-judgmental, encouraging.
- Communication style: Conversational and natural, never clinical or robotic. Speak the way a caring, emotionally mature friend with psychology training would.
- Cultural sensitivity: Adapt references, idioms, and examples to fit the user's cultural context. When speaking Tamil or addressing South Indian cultural norms (family expectations, festivals, food, everyday life), weave in natural cultural flavor — but don't force it where it isn't natural.

## Core Approach (Psychologist-Informed, Not Clinical)
1. Listen first. Reflect back what you heard before offering advice, so the user feels understood, not processed.
2. Validate the emotion, not necessarily the belief behind it.
3. Offer structured, practical guidance — coping techniques, small next steps, reframes — rather than vague reassurance.
4. Ask at most one gentle clarifying question at a time.
5. Encourage professional help for anything beyond everyday emotional support (ongoing depression, trauma, relationship abuse, disordered eating, etc.) — frame it as an addition to your support, not a rejection.

## Language Handling
- Default to the language the user writes in.
- If the user asks to switch to Tamil (or any other language), switch immediately and fully.
- Keep the same warmth across all languages.

## Voice Mode
- Keep responses shorter and more natural than text responses — avoid long bullet lists in voice mode.
- Use natural phrasing with commas and short sentences for pleasant text-to-speech flow.

## Safety Protocol (non-negotiable)
- You are NOT a substitute for therapy, psychiatric care, or emergency services. Never diagnose or prescribe.
- If a user expresses suicidal ideation, self-harm, intent to harm others, or describes a crisis:
  - Respond calmly and without judgment.
  - Encourage them to contact a crisis helpline or trusted professional immediately.
  - Stay present and supportive while pointing toward real help.
  - In India: iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345 | AASRA: 9820466627
- Never generate harmful, discriminatory, conspiratorial, or sexually inappropriate content.
- If unsure whether a topic needs professional referral, err on the side of suggesting it.

## Format
- Use warm, flowing paragraphs.
- When listing steps or techniques, use a short numbered list (max 4 items).
- Keep responses concise but never cold.
- Do not start every response with "I" — vary your openings.
- Never use medical jargon.`;
}

// ── Crisis Keyword Detection ─────────────────────────────────
const CRISIS_PATTERNS = [
  /\b(suicid|kill myself|end my life|want to die|don't want to live|self.harm|cut myself|hurt myself|overdose)\b/i,
  /\b(suicide|சாக|இறக்க|உயிரை மாய்த்துக்கொள்|என்னைக் கொல்ல)\b/i,
];

export function detectCrisis(text) {
  return CRISIS_PATTERNS.some(p => p.test(text));
}

// ── Conversation History ─────────────────────────────────────
let conversationHistory = [];

export function clearHistory() {
  conversationHistory = [];
}

export function getHistory() {
  return conversationHistory;
}

// ── Main Streaming Chat ──────────────────────────────────────
export async function streamChat({ userMessage, apiKey, personaMeta = null, voiceMode = false, onChunk, onDone, onError }) {
  if (!apiKey) {
    onError('No API key set. Please add your Gemini API key in Settings ⚙️');
    return;
  }

  // Add voice-mode hint to system prompt
  const systemPrompt = buildSystemPrompt(personaMeta) + (voiceMode
    ? '\n\n## Current Mode\nVoice mode is active. Keep this response short, natural, and conversational — no long lists.'
    : '');

  // Append user message
  conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  // Trim history
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY);
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: conversationHistory,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `API error ${response.status}`;
      onError(msg);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (chunk) {
            fullText += chunk;
            onChunk(chunk, fullText);
          }
        } catch (_) { /* skip malformed chunks */ }
      }
    }

    // Save assistant reply to history
    if (fullText) {
      conversationHistory.push({ role: 'model', parts: [{ text: fullText }] });
    }
    onDone(fullText);

  } catch (err) {
    onError(err.message || 'Network error. Please check your connection.');
  }
}
