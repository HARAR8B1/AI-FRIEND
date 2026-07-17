'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import InputArea from '@/components/InputArea';
import SettingsModal from '@/components/SettingsModal';
import { useChat } from '@/hooks/useChat';
import { useSpeech } from '@/hooks/useSpeech';

const LANGS = {
  en: { badge:'English', voice:'en-IN' },
  ta: { badge:'தமிழ்', voice:'ta-IN' },
  hi: { badge:'हिन्दी', voice:'hi-IN' },
};

const DEFAULT_PERSONA = {
  name: 'Nila',
  tag: 'Your empathetic life-coach companion',
  av: '/assets/3d_avatar.png',
  meta: null
};

export default function Home() {
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') {
      return { key: '', model: 'llama-3.3-70b-versatile', lang: 'en' };
    }

    return {
      key: localStorage.getItem('nila_key') || '',
      model: localStorage.getItem('nila_model') || 'llama-3.3-70b-versatile',
      lang: localStorage.getItem('nila_lang') || 'en'
    };
  });
  const [isDark, setIsDark] = useState(() => typeof window === 'undefined' ? true : localStorage.getItem('nila_dark') !== 'false');
  const [ttsEnabled, setTtsEnabled] = useState(() => typeof window === 'undefined' ? true : localStorage.getItem('nila_tts') !== 'false');
  const [persona, setPersona] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PERSONA;

    const p = localStorage.getItem('nila_persona');
    if (p) {
      try { return JSON.parse(p); } catch (_) {}
    }

    return DEFAULT_PERSONA;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const buildPrompt = () => {
    const pb = persona.meta
      ? `You are currently embodied as a custom persona. Metadata: ${persona.meta}\nKeep core values identical. Never imply a minor.`
      : 'You are Nila — a warm, emotionally intelligent AI companion embodied as a friendly, beautiful young South Indian woman in her late 20s.';
    const langName = LANGS[settings.lang]?.badge || 'English';
    
    return `You are an Empathetic AI Life-Coach Companion.
${pb}

Tone: Empathetic, warm, non-judgmental, encouraging. Never clinical or robotic.
Cultural sensitivity: Weave in South Indian references naturally when appropriate.

Core approach:
1. Listen first — reflect before advising.
2. Validate the emotion, not necessarily the belief.
3. Offer practical guidance: coping techniques, small steps, reframes.
4. Ask at most one gentle clarifying question at a time.
5. Encourage professional help for serious issues.

Language: You MUST respond ONLY in ${langName}. If the user writes in English but your language is set to Tamil/Hindi, you MUST reply in Tamil/Hindi. Do not use English mixed in, or the text-to-speech engine will fail to read it.

Safety (non-negotiable):
- Never diagnose or prescribe. Never replace therapy.
- If user expresses suicidal ideation or crisis: respond calmly, give crisis line info.
- India: iCall 9152987821, Vandrevala Foundation 1860-2662-345 (24/7), AASRA 9820466627
- International: befrienders.org

Format: Warm flowing paragraphs. Short numbered lists (max 4) for techniques. Concise but never cold.`;
  };

  const { messages, isTyping, isBusy, error, send, clearChat, addMsg, setError } = useChat(settings, buildPrompt);
  const { isSpeaking, speakText, cancelSpeech } = useSpeech(ttsEnabled, settings.lang);

  useEffect(() => {
    if (messages.length !== 0) return;

    const msg = `Hi there 😊 I'm ${persona.name}. How can I help you?`;
    addMsg('ai', msg);
    if (ttsEnabled) speakText(msg, LANGS[settings.lang]?.voice);
  }, [addMsg, messages.length, persona.name, settings.lang, speakText, ttsEnabled]);

  const handleSend = async (text) => {
    cancelSpeech();
    await send(text, (fullAiText) => {
      if (ttsEnabled && fullAiText) {
        speakText(fullAiText, LANGS[settings.lang]?.voice);
      }
    });
  };

  const toggleTheme = () => {
    const nv = !isDark;
    setIsDark(nv);
    localStorage.setItem('nila_dark', nv);
  };

  const toggleTts = () => {
    const nv = !ttsEnabled;
    setTtsEnabled(nv);
    localStorage.setItem('nila_tts', nv);
    if (!nv) cancelSpeech();
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('nila_key', newSettings.key);
    localStorage.setItem('nila_model', newSettings.model);
    localStorage.setItem('nila_lang', newSettings.lang);
    setIsSettingsOpen(false);
  };

  const handleApplyPersona = (file, desc) => {
    if (!file && !desc) {
      setPersona(DEFAULT_PERSONA);
      localStorage.removeItem('nila_persona');
      clearChat();
      setIsSettingsOpen(false);
      return;
    }

    let meta = desc || 'Custom persona — warm adult (25+), same empathy and values.';
    if (/\b(child|kid|teen|minor|\b\d\b|1[0-7])\s*(year|yr)/i.test(meta)) {
      meta = 'Custom persona — warm adult identity (25+). Same values and empathy.';
    }

    const name = (meta.match(/(?:name(?:\s+is)?|called|i(?:'m| am))\s+([A-Z][a-z]{2,20})/i) || [])[1] || 'Your Companion';
    
    const apply = (avUrl) => {
      const p = { name, tag: 'Your personalized life-coach', av: avUrl, meta };
      setPersona(p);
      localStorage.setItem('nila_persona', JSON.stringify(p));
      clearChat();
      setIsSettingsOpen(false);
    };

    if (file) {
      const r = new FileReader();
      r.onload = (e) => apply(e.target.result);
      r.readAsDataURL(file);
    } else {
      apply('/assets/3d_avatar.png');
    }
  };

  return (
    <>
      <div className="orbs" aria-hidden="true">
        <div className="orb o1"></div>
        <div className="orb o2"></div>
        <div className="orb o3"></div>
      </div>

      <div id="app">
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
          onClick={() => setSidebarOpen(false)} 
          style={{ display: sidebarOpen ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)' }}
        ></div>
        
        <div className={sidebarOpen ? 'sidebar-container open' : 'sidebar-container'}>
          <Sidebar 
            persona={persona}
            isDark={isDark}
            toggleTheme={toggleTheme}
            ttsEnabled={ttsEnabled}
            toggleTts={toggleTts}
            isSpeaking={isSpeaking}
            languageBadge={LANGS[settings.lang]?.badge}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onClearChat={() => {
              if (confirm('Clear conversation?')) {
                clearChat();
                cancelSpeech();
                const msg = `Hi there 😊 I'm ${persona.name}. How can I help you?`;
                addMsg('ai', msg);
                if (ttsEnabled) speakText(msg, LANGS[settings.lang]?.voice);
              }
            }}
          />
        </div>

        <main className="main">
          <header className="chat-hdr">
            <div className="hdr-l">
              <button className="ic-btn menu-btn-mobile" onClick={() => setSidebarOpen(true)}>☰</button>
              <div className="hdr-av">
                <Image src={persona.av} alt={persona.name} width={36} height={36} unoptimized />
              </div>
              <div>
                <div className="hdr-title">{persona.name}</div>
                <div className="hdr-sub">Life-Coach · Always here for you</div>
              </div>
            </div>
            <button className="ic-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">⚙️</button>
          </header>

          <ChatArea messages={messages} isTyping={isTyping} persona={persona} />

          {error && error.type === 'NO_KEY' && (
            <div className="notice" style={{ margin: '0 auto 10px' }}>
              ⚠️ Please enter your free Groq API key in Settings first.
            </div>
          )}

          {error && error.type === 'QUOTA' && (
            <div className="quota-card" style={{ margin: '0 auto 10px' }}>
              <div className="quota-title">⚠️ API Error</div>
              <div className="quota-body">Your API key hit a limit or returned an error. You can:</div>
              <div className="quota-actions">
                <a className="quota-link primary" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">🔑 Get a free Groq key (no card needed)</a>
                <button className="quota-link secondary" onClick={() => {
                  const models = ['llama-3.3-70b-versatile','llama-3.1-8b-instant','gemma2-9b-it'];
                  const cur = models.indexOf(settings.model);
                  const nextModel = models[(cur + 1) % models.length];
                  handleSaveSettings({ ...settings, model: nextModel });
                  setError(null);
                }}>🤖 Try a different model</button>
              </div>
            </div>
          )}

          {error && error.type === 'ERROR' && (
            <div className="notice" style={{ margin: '0 auto 10px', color: 'var(--rose-400)' }}>
              ⚠️ {error.message}
            </div>
          )}

          <InputArea 
            isBusy={isBusy} 
            onSend={handleSend} 
            languageCode={LANGS[settings.lang]?.voice}
          />

          <footer className="safety-bar">
            <span>⚠️ Not a substitute for professional help.</span>
            <a className="safety-link" href="tel:18602662345">Crisis: 1860-2662-345</a>
          </footer>
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
        onApplyPersona={handleApplyPersona}
      />
    </>
  );
}
