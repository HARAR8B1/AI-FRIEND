import React, { useState } from 'react';

export default function SettingsModal({ isOpen, onClose, settings, onSave, onApplyPersona }) {
  const [key, setKey] = useState(settings.key);
  const [model, setModel] = useState(settings.model);
  const [lang, setLang] = useState(settings.lang);

  const [personaDesc, setPersonaDesc] = useState('');
  const [personaFile, setPersonaFile] = useState(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ key: key.trim(), model, lang });
  };

  const handleApplyPersona = () => {
    onApplyPersona(personaFile, personaDesc);
  };

  const handleResetPersona = () => {
    onApplyPersona(null, '');
    setPersonaDesc('');
    setPersonaFile(null);
  };

  return (
    <div id="modal" className="modal-ov open" role="dialog" aria-modal="true" aria-hidden="false" onClick={(e) => e.target.id === 'modal' && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-title">⚙️ Settings</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="fsec">
          <label className="flabel" htmlFor="key-inp">🔑 Groq API Key (Free)</label>
          <input 
            type="password" 
            className="finput" 
            id="key-inp" 
            placeholder="gsk_..." 
            autoComplete="off" 
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <p className="fhint">
            Get a <strong>100% free</strong> key (no credit card) at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com/keys</a>.
          </p>
        </div>

        <div className="fsec">
          <label className="flabel" htmlFor="model-sel">🤖 AI Model</label>
          <select className="finput" id="model-sel" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
            <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
            <option value="gemma2-9b-it">Gemma 2 9B</option>
          </select>
        </div>

        <div className="fsec">
          <label className="flabel" htmlFor="persona-file">👤 Custom Persona Image (Optional)</label>
          <div className="upload-z" onClick={() => document.getElementById('persona-file').click()}>
            <span style={{ fontSize: '18px' }}>📷</span><br/>Click to upload image
            <input 
              type="file" 
              id="persona-file" 
              accept="image/png, image/jpeg, image/webp" 
              style={{ display: 'none' }}
              onChange={(e) => setPersonaFile(e.target.files[0])}
            />
          </div>
          {personaFile && <p style={{ fontSize: '12px', color: 'var(--teal-300)', marginTop: '4px' }}>Selected: {personaFile.name}</p>}
          <input 
            type="text" 
            className="finput" 
            id="persona-desc" 
            placeholder="E.g., You are Alex, a wise 30-year-old..." 
            style={{ marginTop: '8px' }}
            value={personaDesc}
            onChange={(e) => setPersonaDesc(e.target.value)}
          />
          <div className="brow">
            <button className="btn btn-g" id="reset-persona" style={{ flex: 0.6 }} onClick={handleResetPersona}>↺ Reset</button>
            <button className="btn btn-p" id="apply-persona" onClick={handleApplyPersona}>✨ Apply Persona</button>
          </div>
        </div>

        <div className="fsec">
          <label className="flabel" htmlFor="lang-sel">🌐 Language</label>
          <select className="finput" id="lang-sel" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ta">Tamil</option>
            <option value="hi">Hindi</option>
          </select>
        </div>

        <div className="fsec" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="btn btn-p" id="save-btn" style={{ width: '100%', marginTop: '8px' }} onClick={handleSave}>
            💾 Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
