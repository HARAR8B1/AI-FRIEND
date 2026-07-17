import React, { useEffect, useRef } from 'react';

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function md(t) {
  return t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
}

export default function ChatArea({ messages, isTyping, persona }) {
  const msgsEndRef = useRef(null);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div id="msgs" role="log" aria-live="polite">
      {messages.map((m) => {
        const isU = m.role === 'user';
        return (
          <div key={m.id} className={`msg ${isU ? 'msg-u' : 'msg-a'}`}>
            {!isU && (
              <div className="m-av">
                <img src={persona.av} alt={persona.name} width={30} height={30} />
              </div>
            )}
            <div 
              className={`bubble ${m.streaming ? 'streaming' : ''}`} 
              dangerouslySetInnerHTML={{ __html: md(m.text) }} 
            />
            <div className="m-time">{formatTime(new Date(m.id))}</div>
          </div>
        );
      })}

      {isTyping && (
        <div className="msg msg-a" id="typing">
          <div className="m-av"><img src={persona.av} alt={persona.name} width={30} height={30} /></div>
          <div className="bubble typing-bub">
            <span className="dot"></span><span className="dot"></span><span className="dot"></span>
          </div>
        </div>
      )}
      
      <div ref={msgsEndRef} />
    </div>
  );
}
