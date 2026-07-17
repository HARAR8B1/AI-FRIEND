import React from 'react';

export default function Sidebar({
  persona,
  isDark,
  toggleTheme,
  ttsEnabled,
  toggleTts,
  isSpeaking,
  languageBadge,
  modeLabel,
  onOpenSettings,
  onClearChat
}) {
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
        <div className={`av-ring ${isSpeaking ? 'speaking-ring' : ''}`} data-mode={modeLabel?.toLowerCase()}>
          <div className="av-inner">
            <div className="av-scene">
              <img
                className={`av-img ${isSpeaking ? 'talking' : ''}`}
                id="av-img"
                src={persona.av}
                alt={persona.name}
                width={210}
                height={255}
              />
              <div className="av-flare" aria-hidden="true"></div>
            </div>
            <div className="av-fb" id="av-fb">🌸</div>
          </div>
        </div>
        <div className={`st-dot ${isSpeaking ? 'speaking' : ''}`} id="st-dot"></div>
      </div>
      
      <div className="p-name">{persona.name}</div>
      <div className="p-tag">{persona.tag}</div>
      <span className="l-badge">{modeLabel}</span>
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
