import React from 'react';
import Image from 'next/image';

export default function Sidebar({
  persona,
  isDark,
  toggleTheme,
  ttsEnabled,
  toggleTts,
  isSpeaking,
  languageBadge,
  onOpenSettings,
  onClearChat
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 720;
  
  return (
    <aside className="sidebar" id="sidebar">
      <div className="brand">
        <span style={{ fontSize: '22px' }}>🌸</span>
        <span className="brand-name">Nila AI</span>
      </div>
      <div className="top-row">
        <button className="ic-btn" onClick={toggleTheme} title="Toggle theme">
          {isDark ? '☀️' : '🌙'}
        </button>
        <button className="ic-btn" onClick={toggleTts} title="Toggle voice">
          {ttsEnabled ? '🔊' : '🔇'}
        </button>
      </div>
      
      <div className="av-wrap">
        <div className={`av-ring ${isSpeaking ? 'speaking-ring' : ''}`}>
          <div className="av-inner">
            <Image
              className={`av-img ${isSpeaking ? 'talking' : ''}`}
              id="av-img"
              src={persona.av}
              alt={persona.name}
              width={210}
              height={255}
              priority
              unoptimized
            />
            <div className="av-fb" id="av-fb">🌸</div>
          </div>
        </div>
        <div className={`st-dot ${isSpeaking ? 'speaking' : ''}`} id="st-dot"></div>
      </div>
      
      <div className="p-name">{persona.name}</div>
      <div className="p-tag">{persona.tag}</div>
      <span className="l-badge">{languageBadge}</span>
      
      <div className="divider"></div>
      <p className="tagbox">A warm, judgment-free space to talk, reflect, and grow. I&apos;m here for you 💙</p>
      <div className="divider"></div>
      
      <div className="sb-actions">
        <button className="sb-btn" onClick={onOpenSettings}>⚙️ Settings & API Key</button>
        <button className="sb-btn" onClick={onClearChat}>🗑️ Clear Conversation</button>
      </div>
    </aside>
  );
}
