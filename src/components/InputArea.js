import React, { useState, useEffect, useRef } from 'react';

export default function InputArea({ isBusy, onSend, languageCode }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recogRef = useRef(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recogRef.current = new SR();
      recogRef.current.continuous = false;
      recogRef.current.interimResults = true;

      recogRef.current.onresult = (e) => {
        let f = '', i = '';
        for (let x = e.resultIndex; x < e.results.length; x++) {
          if (e.results[x].isFinal) f += e.results[x][0].transcript;
          else i += e.results[x][0].transcript;
        }
        setText(f || i);
        if (f) {
          setIsRecording(false);
          onSend(f);
          setText('');
        }
      };

      recogRef.current.onerror = () => setIsRecording(false);
      recogRef.current.onend = () => setIsRecording(false);
    }
  }, [onSend]);

  const toggleVoice = () => {
    if (isRecording) {
      recogRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!recogRef.current) {
      alert('🎙️ Voice not supported. Use Chrome or Edge.');
      return;
    }
    recogRef.current.lang = languageCode || 'en-IN';
    recogRef.current.start();
    setIsRecording(true);
  };

  const handleSend = () => {
    if (!text.trim() || isBusy) return;
    onSend(text.trim());
    setText('');
    if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 150) + 'px';
    }
  };

  return (
    <div className="input-area">
      <div className="input-wrap">
        <textarea 
          ref={textAreaRef}
          id="inp" 
          placeholder="Share what's on your mind… I'm listening 💙"
          rows="1" 
          maxLength="2000" 
          spellCheck="true"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
        />
        <div className="inp-btns">
          <button 
            className={`act-btn ${isRecording ? 'rec' : ''}`} 
            id="vbtn" 
            title="Voice input" 
            aria-pressed={isRecording}
            onClick={toggleVoice}
            disabled={isBusy && !isRecording}
          >
            🎙️
          </button>
          <button 
            className={`act-btn ${isBusy ? 'loading' : ''}`} 
            id="sbtn" 
            title="Send"
            onClick={handleSend}
            disabled={isBusy || !text.trim()}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="inp-meta"><span id="ccount">{text.length}/2000</span></div>
    </div>
  );
}
