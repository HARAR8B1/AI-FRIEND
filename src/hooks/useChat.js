import { useState, useEffect, useRef } from 'react';

const API_BASE = 'https://api.groq.com/openai/v1';
const MAX_HIST = 40;
const DEFAULT_MODEL = 'llama-3.2-11b-vision-preview';

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

  const send = async (text, onAIResponseComplete, attachments = []) => {
    const trimmedText = text?.trim() || '';
    const fallbackText = attachments.length ? 'Please analyze the uploaded image or document.' : '';
    const userText = trimmedText || fallbackText;

    if (!userText || isBusy) return;
    if (!settings.key) {
      setError({ type: 'NO_KEY' });
      return;
    }

    addMsg('user', userText);
    setIsBusy(true);
    setIsTyping(true);
    setError(null);

    histRef.current.push({ role: 'user', content: userText });
    if (histRef.current.length > MAX_HIST) histRef.current = histRef.current.slice(-MAX_HIST);

    try {
      const hasVisionModel = /vision/i.test(settings.model || DEFAULT_MODEL);
      const documentText = attachments
        .filter(item => item?.kind === 'document' && item?.text)
        .map(item => `Document: ${item.fileName}\n${item.text.slice(0, 2800)}`)
        .join('\n\n');

      const basePrompt = [userText, documentText].filter(Boolean).join('\n\n');
      const visionBlocks = attachments
        .filter(item => item?.kind === 'image' && item?.dataUrl)
        .map(item => ({ type: 'image_url', image_url: { url: item.dataUrl } }));

      const requestMessages = [
        { role: 'system', content: buildPrompt() },
        {
          role: 'user',
          content: hasVisionModel
            ? [{ type: 'text', text: basePrompt }, ...visionBlocks]
            : basePrompt,
        },
      ];

      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.key}`
        },
        body: JSON.stringify({
          model: settings.model || DEFAULT_MODEL,
          messages: requestMessages,
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
