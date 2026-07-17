import { useState, useEffect, useRef } from 'react';

const API_BASE = 'https://api.groq.com/openai/v1';
const MAX_HIST = 40;
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function useChat(settings, buildPrompt) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  const histRef = useRef([]);

  const clearChat = () => {
    setMessages([]);
    histRef.current = [];
  };

  const addMsg = (role, text) => {
    const newMsg = { id: Date.now() + Math.random(), role, text };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  };

  const send = async (text, onAIResponseComplete) => {
    if (!text || isBusy) return;
    if (!settings.key) {
      setError({ type: 'NO_KEY' });
      return;
    }

    addMsg('user', text);
    setIsBusy(true);
    setIsTyping(true);
    setError(null);

    histRef.current.push({ role: 'user', content: text });
    if (histRef.current.length > MAX_HIST) histRef.current = histRef.current.slice(-MAX_HIST);

    try {
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.key}`
        },
        body: JSON.stringify({
          model: settings.model || DEFAULT_MODEL,
          messages: [{ role: 'system', content: buildPrompt() }, ...histRef.current],
          temperature: 0.85,
          stream: true,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e?.error?.message || ('API error ' + res.status);
        const isQ = res.status === 429 || /quota|rate.?limit|too many/i.test(msg);
        throw Object.assign(new Error(msg), { quota: isQ });
      }

      setIsTyping(false);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '', buf = '';
      
      const msgId = Date.now();
      setMessages(prev => [...prev, { id: msgId, role: 'ai', text: '', streaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') continue;
          try {
            const chunk = JSON.parse(j)?.choices?.[0]?.delta?.content || '';
            if (chunk) {
              full += chunk;
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: full } : m));
            }
          } catch (_) {}
        }
      }
      histRef.current.push({ role: 'assistant', content: full });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, streaming: false } : m));
      setIsBusy(false);
      
      if (onAIResponseComplete) onAIResponseComplete(full);
      
      return full;

    } catch (err) {
      histRef.current.pop();
      setIsTyping(false);
      setIsBusy(false);
      setError({ type: err.quota ? 'QUOTA' : 'ERROR', message: err.message });
      return null;
    }
  };

  return { messages, isTyping, isBusy, error, send, clearChat, setError, addMsg };
}
